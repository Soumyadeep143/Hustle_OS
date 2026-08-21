"""The single conversational brain for HustleOS.

Both the AI chat screen (src/screens/AI.tsx) and the voice overlay
(src/screens/Voice.tsx) call POST /api/voice/command, which calls
VoiceAgent.process_voice_command() here.  One endpoint, one brain,
one code path — see HANDOVER.md for the non-negotiable constraint.

What's new in this revision
────────────────────────────
1. Mem0 context injection
   _format_context() now accepts an optional list of long-term memory
   snippets (fetched in _respond before building the system message) and
   appends them as a "Preferences / long-term memory" section.  The model
   sees real stored preferences (e.g. "remind me 30 min before interviews")
   in every reply without needing to call search_memory explicitly.

2. Entity-continuity pronoun resolution
   Before falling through to the tool-calling loop, process_voice_command
   checks conversation_state for a last_entity.  If the transcript contains
   a pronoun or vague reference ("it", "that", "the job", "that company")
   AND a last entity is recorded, the transcript is silently enriched with
   the entity's label before being sent to the model — so "what's the status
   of that?" becomes "what's the status of that? [last referenced: Google —
   application]" and the model can answer or call the right tool without
   asking "which one?".

3. System prompt updated
   Sections added for long-term memory, entity resolution, and the new
   tool capabilities (search_memory, remember_preference, get_recall_thread,
   get_forgotten_items).
"""
import json
import os
import re
from typing import Dict, List, Optional

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

# item_types where a bare date with no time word ("interview tomorrow") should
# still prompt for a time before persisting.
_TIME_SENSITIVE_TYPES = {"interview", "event"}

_HAS_DIGIT_RE  = re.compile(r"\d")
_TIME_WORD_RE  = re.compile(r"\b(morning|afternoon|evening|night|noon|midnight)\b", re.IGNORECASE)

# Pronoun / vague-reference patterns that signal the user is referring to
# the last touched entity rather than naming something new.
_PRONOUN_RE = re.compile(
    r"\b(it|that|this|the job|that job|that company|that one|that application"
    r"|that role|that item|that thing|the one|the application|the interview"
    r"|that interview|that link|that post)\b",
    re.IGNORECASE,
)


def _looks_like_followup_answer(transcript: str) -> bool:
    """Is this short reply answering the time question I just asked?"""
    text = transcript.strip()
    if not text or len(text) > 25:
        return False
    normalized = text.lower().strip(" .!")
    if normalized in ("am", "pm", "a.m.", "p.m."):
        return True
    return bool(_HAS_DIGIT_RE.search(text) or _TIME_WORD_RE.search(text))


def _contains_pronoun(transcript: str) -> bool:
    return bool(_PRONOUN_RE.search(transcript))


# ── system prompt ──────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """You are the HustleOS assistant — a smart, context-aware
friend who knows the user's ongoing work. You are NOT a generic customer
support bot and NOT a job-application-only chatbot — HustleOS is bigger than
job hunting (RECALL captures, tasks, applications all matter equally).

Personality: natural, conversational, short when short is enough. Not
corporate, not robotic, not overly enthusiastic. Don't overuse emojis. You
may use "bhai" occasionally and naturally when the moment fits — never in
every message, never forced.

── Current state ──
You are given the user's REAL current state below (tasks, applications,
RECALL captures, follow-ups, long-term memory). Answer only from that data.
Never invent a task, application, deadline, or follow-up that isn't listed —
if something isn't in the data, say you don't have that yet instead of guessing.

── Tools ──
If tools are available, use them whenever the snapshot isn't enough to answer
precisely — e.g. a specific day's plan, a multi-day window, keyword/source
search over RECALL, or the full story of a company ("get_recall_thread").
Prefer a tool result over guessing from the truncated snapshot.

  get_today_plan          — today's timeline
  get_upcoming_schedule   — next N days
  search_recall           — keyword/source/status search over RECALL captures
  search_applications     — keyword/status search over applications
  get_recall_thread       — full story: RECALL item + linked application + event log
  get_forgotten_items     — overdue follow-ups, stale apps, past-due tasks
  search_memory           — search long-term preferences / patterns / facts
  create_task             — add a task to the FOCUS list
  update_application_status — update a tracked application's status
  remember_preference     — save an explicit preference the user states

── Write tools ──
create_task, update_application_status, remember_preference create or change
real records. Only call one when the user's message clearly asks for that
action. After a write tool call, state plainly what happened using its result —
never say "done" without having called the tool. Never claim success if the
result is an error or is ambiguous — ask a clarifying question instead.

remember_preference: ONLY call when the user explicitly says "remember that",
"always remind me", "I prefer". Never infer a preference from what they say
in passing and never call it for every message.

── Entity continuity ──
If the context says "Last referenced entity: X", and the user's message
refers to "it", "that job", "that one", etc., treat X as what they mean.
Use get_recall_thread or search_applications with X's name to pull the
current details before answering. If X is ambiguous even with the context,
ask which one they mean rather than guessing.

── Long-term memory ──
If "Preferences / long-term memory" is present in the context, use those
facts to personalise replies (e.g. honour a stated reminder preference, match
a communication-style preference). Do NOT ask the user to repeat something
already in memory."""


# ── VoiceAgent ─────────────────────────────────────────────────────────────

class VoiceAgent:
    """The single conversational brain for text + voice. See module docstring."""

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = "gpt-4o-mini"
        self.voice_provider = get_voice_provider()
        self.conversation_store = ConversationStateStore()

    # ── STT / TTS ──────────────────────────────────────────────────────────

    def speech_to_text(self, audio_bytes: bytes, filename: str = "recording.webm") -> str:
        # Deliberately does NOT catch here -- routes/voice.py's /transcribe
        # already has a try/except that surfaces str(e) as an "error" field
        # in the response. Swallowing it here (as before) meant a real API
        # failure (e.g. an invalidated key) looked identical to "the user
        # said nothing" on the frontend, with no way to tell them apart.
        transcript = self.client.audio.transcriptions.create(
            model="whisper-1",
            file=(filename, audio_bytes),
        )
        return transcript.text

    def text_to_speech(self, text: str, voice_id: Optional[str] = None) -> str:
        if not self.voice_provider or not text:
            return ""
        try:
            return self.voice_provider.synthesize(text, voice_id)
        except Exception as e:
            print(f"Error in text-to-speech ({self.voice_provider.name}): {e}")
            return ""

    # ── main entry point ───────────────────────────────────────────────────

    def process_voice_command(
        self,
        transcript: str,
        user_name: str,
        context: Dict,
        timezone: str = "UTC",
        tool_ctx: Optional[Dict] = None,
    ) -> Dict:
        """One entry point for both voice and text.  Three layers:

        1. Schedule clarification cross-turn — if PREVIOUS turn asked for a
           time and this reply looks like a time answer, merge and re-parse.

        2. Scheduling branch — deterministic date/time parse; persist if
           complete, ask if ambiguous.

        3. Entity resolution + tool-calling chat — everything else.
           Before the LLM call: silently enrich the transcript when a vague
           pronoun + last_entity are both present, and fetch relevant Mem0
           memories to include in the context snapshot.
        """
        user_id = tool_ctx.get("user_id") if tool_ctx else None
        effective_transcript = transcript

        # ── layer 1: schedule clarification cross-turn ─────────────────────
        pending = self.conversation_store.get_pending(user_id) if user_id else None
        if (
            pending
            and pending.get("pending_type") == "schedule_clarification"
            and _looks_like_followup_answer(transcript)
        ):
            payload = pending.get("pending_payload") or {}
            original = payload.get("original_phrase", "")
            joiner = " at " if payload.get("ambiguity_reason") == "time_unspecified" else " "
            effective_transcript = f"{original}{joiner}{transcript.strip()}".strip()

        # ── layer 2: scheduling branch ─────────────────────────────────────
        draft = None
        if looks_like_scheduling_request(effective_transcript):
            draft = parse_schedule_text(effective_transcript, timezone=timezone)
            if draft.item_type in _TIME_SENSITIVE_TYPES and not draft.start_time and not draft.ambiguous:
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
                        {
                            "original_phrase":   draft.original_phrase,
                            "ambiguity_reason":  draft.ambiguity_reason,
                        },
                    )
            if user_id:
                try:
                    self.conversation_store.append_turn(user_id, transcript, response_text)
                except Exception:
                    pass  # history is a quality improvement, never a hard dependency
            return {
                "response":      response_text,
                "audio_url":     self.text_to_speech(response_text) or None,
                "schedule_draft": draft,
            }

        # ── layer 3: entity resolution + tool-calling chat ─────────────────
        if user_id:
            self.conversation_store.clear_pending(user_id)

        # Entity continuity: routes/voice.py already fetches last_entity into
        # context before calling here — if the user uses a pronoun and one is
        # recorded, keep it in the context dict so _format_context() surfaces
        # it and the model can resolve it.
        last_entity = context.get("last_entity")
        if last_entity and _contains_pronoun(transcript):
            context = {**context, "last_entity": last_entity}

        response_text = self._respond(transcript, user_name, context, tool_ctx)
        return {
            "response":       response_text,
            "audio_url":      self.text_to_speech(response_text) or None,
            "schedule_draft": None,
        }

    # ── LLM call with tool loop ────────────────────────────────────────────

    def _respond(
        self,
        transcript: str,
        user_name: str,
        context: Dict,
        tool_ctx: Optional[Dict] = None,
    ) -> str:
        # Fetch a handful of relevant long-term memories proactively so the
        # model has personalisation context without needing to call
        # search_memory first.  Silent failure — missing memories never block
        # a reply.
        memories: List[Dict] = []
        provider = (tool_ctx or {}).get("memory_provider")
        user_id  = (tool_ctx or {}).get("user_id")
        if provider and user_id:
            try:
                memories = provider.search(user_id, transcript, limit=4)
            except Exception:
                pass  # provider error → respond without long-term memory

        # Real multi-turn context: the last few (user, assistant) exchanges,
        # spliced in before the current turn — without this the model saw
        # every message as an isolated one-shot query with no memory of
        # anything said earlier in the same conversation.
        history: List[Dict] = []
        conv_store = (tool_ctx or {}).get("conv_store")
        if conv_store and user_id:
            try:
                history = conv_store.get_history(user_id)
            except Exception:
                pass  # history is a quality improvement, never a hard dependency

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            *history,
            {
                "role": "user",
                "content": (
                    f"{_format_context(user_name, context, memories)}"
                    f"\n\nUser's message: {transcript}"
                ),
            },
        ]
        tools = TOOL_SPECS if tool_ctx else None

        def _remember(reply: str) -> None:
            if conv_store and user_id and reply:
                try:
                    conv_store.append_turn(user_id, transcript, reply)
                except Exception:
                    pass

        try:
            for _ in range(4):  # up from 3 — new tools may chain
                response = self.client.chat.completions.create(
                    model=self.model,
                    max_tokens=400,
                    messages=messages,
                    tools=tools,
                )
                message    = response.choices[0].message
                tool_calls = message.tool_calls or []
                if not tool_calls:
                    final_text = (message.content or "").strip()
                    _remember(final_text)
                    return final_text

                messages.append(message)
                for call in tool_calls:
                    try:
                        args = json.loads(call.function.arguments or "{}")
                    except json.JSONDecodeError:
                        args = {}
                    result = execute_tool(call.function.name, args, tool_ctx)
                    messages.append(
                        {
                            "role":        "tool",
                            "tool_call_id": call.id,
                            "content":     json.dumps(result, default=str),
                        }
                    )
            fallback = _fallback_response(user_name, context)
            _remember(fallback)
            return fallback
        except Exception as e:
            print(f"Error generating assistant response: {e}")
            return _fallback_response(user_name, context)


# ── rendering helpers ──────────────────────────────────────────────────────

def _render_schedule_confirmation(draft: ScheduleDraft) -> str:
    if draft.ambiguous and draft.ambiguity_reason == "time_unspecified":
        when = draft.date_phrase or draft.date or "that day"
        return f"Got it — '{draft.title}' on {when}. What time should I schedule it for?"
    if draft.ambiguous and draft.ambiguity_reason == "time_meridiem" and draft.start_time:
        hour12 = int(draft.start_time.split(":")[0]) % 12 or 12
        return f"Did you mean {hour12} AM or {hour12} PM for '{draft.title}'?"
    type_label = ITEM_TYPE_LABEL.get(draft.item_type, "task")
    article    = "an" if type_label[0] in "aeiou" else "a"
    if not draft.date:
        return f"Got it — I'll add '{draft.title}' to your list with no date set yet. Want me to add it?"
    when      = draft.date_phrase or draft.date
    time_part = f" at {format_time_12h(draft.start_time)}" if draft.start_time else ""
    return f"I've got {article} {type_label} scheduled for {when}{time_part}. Want me to add it?"


def _render_schedule_created(draft: ScheduleDraft) -> str:
    type_label = ITEM_TYPE_LABEL.get(draft.item_type, "task")
    article    = "an" if type_label[0] in "aeiou" else "a"
    if not draft.date:
        return f"Done — added '{draft.title}' to your list. No date set yet."
    when      = draft.date_phrase or draft.date
    time_part = f" at {format_time_12h(draft.start_time)}" if draft.start_time else ""
    return f"Done — I've scheduled {article} {type_label} '{draft.title}' for {when}{time_part}."


def _format_context(
    user_name: str,
    context: Dict,
    memories: Optional[List[Dict]] = None,
) -> str:
    tasks        = context.get("tasks", [])
    applications = context.get("applications", [])
    recall_items = context.get("recall_items", [])
    follow_ups   = context.get("follow_ups_due", [])
    last_entity  = context.get("last_entity")

    open_tasks = [t for t in tasks if not t.get("done")]

    lines = [
        f"User's name: {user_name or 'there'}",
        f"Open tasks ({len(open_tasks)}): "
        + ("; ".join(f"{t['title']} ({t.get('meta', '')})" for t in open_tasks[:8]) or "none"),
        f"Applications ({len(applications)}): "
        + ("; ".join(f"{a['company']} — {a['role']} [{a['status']}]" for a in applications[:8]) or "none yet"),
        f"RECALL captures ({len(recall_items)}): "
        + (
            "; ".join(
                f"{i['title']} [{i.get('source_display', i.get('source', ''))} · "
                f"{i.get('category', '')} · {i.get('status', '')}]"
                for i in recall_items[:8]
            )
            or "none yet"
        ),
        "Follow-ups due or overdue: "
        + ("; ".join(f"{f['title']} (due {f['follow_up_at']})" for f in follow_ups[:5]) or "none"),
    ]

    # Entity continuity hint — shown whenever the last_entity is set so the
    # model can resolve "it" / "that one" without a tool call.
    if last_entity:
        lines.append(
            f"Last referenced entity: {last_entity['label']} "
            f"[type: {last_entity['entity_type']}, id: {last_entity['entity_id']}]"
        )

    # Long-term memory snippets — injected proactively from the Mem0 search
    # run in _respond before this is called.
    if memories:
        mem_lines = "; ".join(
            m.get("text", "") for m in memories if m.get("text")
        )
        if mem_lines:
            lines.append(f"Preferences / long-term memory: {mem_lines}")

    return "\n".join(lines)


def _fallback_response(user_name: str, context: Dict) -> str:
    """Grounded fallback — real counts, never a canned help string."""
    name         = user_name or "there"
    tasks        = context.get("tasks", [])
    applications = context.get("applications", [])
    follow_ups   = context.get("follow_ups_due", [])
    open_tasks   = [t for t in tasks if not t.get("done")]

    if not open_tasks and not applications and not follow_ups:
        return (
            f"Hey {name} — nothing on your plate yet. "
            "Save something to RECALL or add a task to get started."
        )
    parts = [f"Hey {name} —"]
    if open_tasks:
        parts.append(f"you've got {len(open_tasks)} open task{'s' if len(open_tasks) != 1 else ''} today")
    if follow_ups:
        parts.append(f"{len(follow_ups)} follow-up{'s' if len(follow_ups) != 1 else ''} due")
    if applications:
        parts.append(f"{len(applications)} application{'s' if len(applications) != 1 else ''} tracked")
    return (parts[0] + " " + ", ".join(parts[1:]) + ".") if len(parts) > 1 else parts[0]
