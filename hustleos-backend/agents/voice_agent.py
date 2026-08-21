import json
import os
import re
from typing import Dict, Optional

from openai import OpenAI

from voice_providers import get_voice_provider
from .ai_tools import TOOL_SPECS, execute_tool
from .conversation_store import ConversationStateStore
from .schedule_engine import (
    ITEM_TYPE_LABEL,
    ScheduleDraft,
    format_time_12h,
    looks_like_scheduling_request,
    parse_schedule_text,
)

# item_types where a bare date with no time word at all ("interview tomorrow")
# should still prompt for a time before persisting — see process_voice_command.
_TIME_SENSITIVE_TYPES = {"interview", "event"}

_HAS_DIGIT_RE = re.compile(r"\d")
_TIME_WORD_RE = re.compile(r"\b(morning|afternoon|evening|night|noon|midnight)\b", re.IGNORECASE)


def _looks_like_followup_answer(transcript: str) -> bool:
    """Heuristic for 'is this short reply answering the time question I just
    asked, not a fresh unrelated message'. Deliberately narrow: a bare
    am/pm reply must match the WHOLE message (so 'I am on my way' doesn't
    false-positive on the word 'am'), and everything else needs a digit or
    an unambiguous time-of-day word, capped at a length real time answers
    fit comfortably under."""
    text = transcript.strip()
    if not text or len(text) > 25:
        return False
    normalized = text.lower().strip(" .!")
    if normalized in ("am", "pm", "a.m.", "p.m."):
        return True
    return bool(_HAS_DIGIT_RE.search(text) or _TIME_WORD_RE.search(text))

_SYSTEM_PROMPT = """You are the HustleOS assistant — a smart, context-aware
friend who knows the user's ongoing work. You are NOT a generic customer
support bot and NOT a job-application-only chatbot — HustleOS is bigger than
job hunting (RECALL captures, tasks, applications all matter equally).

Personality: natural, conversational, short when short is enough. Not
corporate, not robotic, not overly enthusiastic. Don't overuse emojis. You
may use "bhai" occasionally and naturally when the moment fits — never in
every message, never forced.

You are given the user's REAL current state below (tasks, applications,
RECALL captures, follow-ups). Answer only from that data. Never invent a
task, application, deadline, or follow-up that isn't listed — if something
isn't in the data, say you don't have that yet instead of guessing.

If tools are available, use them whenever the snapshot below isn't enough to
answer precisely — e.g. a specific day's plan, a multi-day window, or a
keyword/source search over RECALL or applications. Prefer a tool result over
guessing from the truncated snapshot.

Some tools create or change real records (create_task, update_application_status)
— only call one when the user's message clearly asks for that action. After
calling a write tool, state plainly what actually happened using its result —
never say "done" or "sure, I'll do that" without having called the tool, and
never claim success if the result is an error or names more than one possible
match — ask a clarifying question instead of guessing which one they meant."""


class VoiceAgent:
    """The single conversational brain behind both the AI chat screen and
    the voice overlay (routes/voice.py's /command is called by both) — same
    context, same personality, one code path. See spec: 'Do NOT build
    separate AI logic for voice.'"""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"
        self.voice_provider = get_voice_provider()
        self.conversation_store = ConversationStateStore()

    def speech_to_text(self, audio_bytes: bytes) -> str:
        """Transcribe audio using Whisper API"""
        try:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=("recording.webm", audio_bytes),
            )
            return transcript.text
        except Exception as e:
            print(f"Error in speech-to-text: {e}")
            return ""

    def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> str:
        """Generate speech via the active VoiceProvider (Sarvam or
        ElevenLabs, whichever resolves — see voice_providers/__init__.py).
        Returns a playable data: URI, or "" if no provider is usable."""
        if not self.voice_provider or not text:
            return ""
        try:
            return self.voice_provider.synthesize(text, voice_id)
        except Exception as e:
            print(f"Error in text-to-speech ({self.voice_provider.name}): {e}")
            return ""

    def process_voice_command(
        self,
        transcript: str,
        user_name: str,
        context: Dict,
        timezone: str = "UTC",
        tool_ctx: Optional[Dict] = None,
    ) -> Dict:
        """Voice and the Quick Add text box share one scheduling pipeline
        (agents/schedule_engine.py) — see product spec: 'do not build
        separate scheduling logic for voice'. A scheduling-shaped utterance
        short-circuits the general chat call: the reply and the structured
        draft both come from the deterministic parser, and persistence only
        happens when the user taps Confirm in the UI (not from a second,
        less-reliable spoken "yes") — UNLESS the parser already has everything
        it needs (title + date, and time when the phrasing implied one isn't
        ambiguous): a complete, unambiguous draft is low-risk enough to create
        immediately (see product spec section 23), so there's nothing left for
        a "yes" to confirm. Only a genuinely incomplete/ambiguous draft (no
        time, unclear AM/PM) gets held back for a question.

        Cross-turn continuity: if the PREVIOUS turn ended on exactly that kind
        of question, self.conversation_store remembers the original phrase.
        A short follow-up that looks like a time answer ("5 PM", just "PM")
        gets merged into that original phrase and re-parsed through the exact
        same pipeline below — no separate NLU path, no duplicate event, and
        the user never has to resend the whole request (spec section 4/20)."""
        user_id = tool_ctx.get("user_id") if tool_ctx else None
        effective_transcript = transcript

        pending = self.conversation_store.get_pending(user_id) if user_id else None
        if pending and pending.get("pending_type") == "schedule_clarification" and _looks_like_followup_answer(transcript):
            payload = pending.get("pending_payload") or {}
            original = payload.get("original_phrase", "")
            joiner = " at " if payload.get("ambiguity_reason") == "time_unspecified" else " "
            effective_transcript = f"{original}{joiner}{transcript.strip()}".strip()

        draft = None
        if looks_like_scheduling_request(effective_transcript):
            draft = parse_schedule_text(effective_transcript, timezone=timezone)
            if draft.item_type in _TIME_SENSITIVE_TYPES and not draft.start_time and not draft.ambiguous:
                # schedule_engine only flags ambiguity for a vague part-of-day
                # word ("tomorrow morning") or unclear AM/PM — a bare "interview
                # tomorrow" with zero time words slips through as "complete"
                # even though spec section 5 explicitly wants a time asked for
                # first. Flag it here rather than in schedule_engine.py, which
                # the Quick Add box also depends on for drafts a human reviews
                # before saving — this ask-first rule only needs to apply to
                # the auto-persist path below.
                draft.ambiguous = True
                draft.ambiguity_reason = "time_unspecified"
            if not draft.ambiguous and tool_ctx and tool_ctx.get("home") and user_id:
                tool_ctx["home"].add_timeline_entry(
                    user_id,
                    title=draft.title,
                    item_type=draft.item_type,
                    priority=draft.priority,
                    scheduled_date=draft.date,
                    start_time=draft.start_time,
                    end_time=draft.end_time,
                    all_day=draft.all_day,
                    duration_minutes=draft.duration_minutes,
                    reminder_minutes_before=draft.reminder_minutes_before,
                    timezone=timezone,
                    original_phrase=draft.original_phrase,
                )
                response_text = _render_schedule_created(draft)
                if user_id:
                    self.conversation_store.clear_pending(user_id)
            else:
                response_text = _render_schedule_confirmation(draft)
                if user_id:
                    self.conversation_store.save_pending(
                        user_id,
                        "schedule_clarification",
                        {"original_phrase": draft.original_phrase, "ambiguity_reason": draft.ambiguity_reason},
                    )
        else:
            if user_id:
                self.conversation_store.clear_pending(user_id)
            response_text = self._respond(transcript, user_name, context, tool_ctx)

        return {
            "response": response_text,
            "audio_url": self.text_to_speech(response_text) or None,
            "schedule_draft": draft,
        }

    def _respond(self, transcript: str, user_name: str, context: Dict, tool_ctx: Optional[Dict] = None) -> str:
        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": f"{_format_context(user_name, context)}\n\nUser's message: {transcript}"},
        ]
        # Tools let the model pull specifics (a real date window, a keyword
        # search) beyond the truncated snapshot baked into _format_context —
        # only offered when the caller supplies live store handles to run
        # them against (tool_ctx), so behavior is unchanged wherever it isn't.
        tools = TOOL_SPECS if tool_ctx else None
        try:
            for _ in range(3):
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=350,
                    messages=messages,
                    tools=tools,
                )
                message = response.choices[0].message
                tool_calls = message.tool_calls or []
                if not tool_calls:
                    return (message.content or "").strip()

                messages.append(message)
                for call in tool_calls:
                    try:
                        args = json.loads(call.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    result = execute_tool(call.function.name, args, tool_ctx)
                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": call.id,
                            "content": json.dumps(result, default=str),
                        }
                    )
            return _fallback_response(user_name, context)
        except Exception as e:
            print(f"Error generating assistant response: {e}")
            return _fallback_response(user_name, context)


def _render_schedule_confirmation(draft: ScheduleDraft) -> str:
    """Deterministic reply text for a scheduling-shaped utterance — never an
    LLM call, so it can't invent a date/time. Mirrors spec section 8: ask
    instead of guessing when the date/time is genuinely ambiguous."""
    if draft.ambiguous and draft.ambiguity_reason == "time_unspecified":
        when = draft.date_phrase or draft.date or "that day"
        return f"Got it — '{draft.title}' on {when}. What time should I schedule it for?"

    if draft.ambiguous and draft.ambiguity_reason == "time_meridiem" and draft.start_time:
        hour12 = int(draft.start_time.split(":")[0]) % 12 or 12
        return f"Did you mean {hour12} AM or {hour12} PM for '{draft.title}'?"

    type_label = ITEM_TYPE_LABEL.get(draft.item_type, "task")
    article = "an" if type_label[0] in "aeiou" else "a"

    if not draft.date:
        return f"Got it — I'll add '{draft.title}' to your list with no date set yet. Want me to add it?"

    when = draft.date_phrase or draft.date
    time_part = f" at {format_time_12h(draft.start_time)}" if draft.start_time else ""
    return f"I've got {article} {type_label} scheduled for {when}{time_part}. Want me to add it?"


def _render_schedule_created(draft: ScheduleDraft) -> str:
    """Reply text for a scheduling-shaped utterance that was complete enough
    to persist immediately — past tense, since agents/home_store.py's
    add_timeline_entry has already run by the time this is called."""
    type_label = ITEM_TYPE_LABEL.get(draft.item_type, "task")
    article = "an" if type_label[0] in "aeiou" else "a"

    if not draft.date:
        return f"Done — added '{draft.title}' to your list. No date set yet."

    when = draft.date_phrase or draft.date
    time_part = f" at {format_time_12h(draft.start_time)}" if draft.start_time else ""
    return f"Done — I've scheduled {article} {type_label} '{draft.title}' for {when}{time_part}."


def _format_context(user_name: str, context: Dict) -> str:
    tasks = context.get("tasks", [])
    applications = context.get("applications", [])
    recall_items = context.get("recall_items", [])
    follow_ups_due = context.get("follow_ups_due", [])

    open_tasks = [t for t in tasks if not t.get("done")]
    lines = [
        f"User's name: {user_name or 'there'}",
        f"Open tasks today ({len(open_tasks)}): "
        + ("; ".join(f"{t['title']} ({t.get('meta', '')})" for t in open_tasks[:8]) or "none"),
        f"Applications ({len(applications)}): "
        + ("; ".join(f"{a['company']} — {a['role']} [{a['status']}]" for a in applications[:8]) or "none yet"),
        f"RECALL captures ({len(recall_items)}): "
        + (
            "; ".join(
                f"{i['title']} [{i['source_display']} · {i['category']} · {i['status']}]" for i in recall_items[:8]
            )
            or "none yet"
        ),
        "Follow-ups due or overdue: "
        + ("; ".join(f"{f['title']} (due {f['follow_up_at']})" for f in follow_ups_due[:5]) or "none"),
    ]
    return "\n".join(lines)


def _fallback_response(user_name: str, context: Dict) -> str:
    """Used when the LLM call is unavailable. Still grounded in real counts
    from the same context — never a canned 'how can I help with your job
    search' line."""
    name = user_name or "there"
    tasks = context.get("tasks", [])
    applications = context.get("applications", [])
    follow_ups_due = context.get("follow_ups_due", [])
    open_tasks = [t for t in tasks if not t.get("done")]

    if not open_tasks and not applications and not follow_ups_due:
        return f"Hey {name} — nothing on your plate yet. Save something to RECALL or add a task to get started."

    parts = [f"Hey {name} —"]
    if open_tasks:
        parts.append(f"you've got {len(open_tasks)} open task{'s' if len(open_tasks) != 1 else ''} today")
    if follow_ups_due:
        parts.append(f"{len(follow_ups_due)} follow-up{'s' if len(follow_ups_due) != 1 else ''} due")
    if applications:
        parts.append(f"{len(applications)} application{'s' if len(applications) != 1 else ''} tracked")
    return (parts[0] + " " + ", ".join(parts[1:]) + ".") if len(parts) > 1 else parts[0]
