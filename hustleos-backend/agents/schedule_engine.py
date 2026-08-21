"""Shared natural-language scheduling engine.

Both the Quick Add text box (routes/schedule.py) and the voice pipeline
(agents/voice_agent.py) call parse_schedule_text() — one code path, so text
and voice can never diverge (see product spec: "do not build separate
scheduling logic for voice").

Date/time resolution is deterministic (regex + stdlib datetime/zoneinfo),
never LLM-guessed — the spec requires exact calendar math. Only the title is
optionally polished by an LLM when the rule-based extraction looks weak.
"""

import calendar
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

_WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
_MONTHS = {
    name.lower(): i
    for i, name in enumerate(calendar.month_name)
    if name
}
_MONTHS.update({name.lower(): i for i, name in enumerate(calendar.month_abbr) if name})

ITEM_TYPE_LABEL = {
    "task": "task", "event": "event", "interview": "interview",
    "follow_up": "follow-up", "reminder": "reminder", "deadline": "deadline",
}

_ITEM_TYPE_KEYWORDS = [
    ("interview", "interview"),
    ("follow up", "follow_up"),
    ("follow-up", "follow_up"),
    ("followup", "follow_up"),
    ("remind me", "reminder"),
    ("reminder", "reminder"),
    ("deadline", "deadline"),
    ("due", "deadline"),
    ("submission", "deadline"),
    ("meeting", "event"),
    ("call", "event"),
    ("sync", "event"),
    ("hackathon", "event"),
    ("sprint", "event"),
    ("event", "event"),
    ("appointment", "event"),
]

_URGENT_WORDS = re.compile(r"\b(urgent|asap|important|highest priority|top priority)\b", re.IGNORECASE)

_FILLER_PREFIXES = [
    r"^hey hustleos,?\s*",
    r"^hustleos,?\s*",
    r"^hey,?\s*",
    r"^i have (an|a)\s*",
    r"^i've got (an|a)\s*",
    r"^i have\s*",
    r"^i've got\s*",
    r"^set up my\s*",
    r"^set my\s*",
    r"^schedule my\s*",
    r"^schedule an?\s*",
    r"^schedule\s*",
    r"^add\s*",
    r"^remind me (to|about)?\s*",
    r"^create an?\s*",
    r"^move (this|it) to\s*",
]

_LEADING_STOPWORDS = re.compile(r"^(on|for|at|in|to)\s+", re.IGNORECASE)
_TRAILING_STOPWORDS = re.compile(r"\s+(on|for|at|in|to)$", re.IGNORECASE)


@dataclass
class ScheduleDraft:
    item_type: str = "task"
    title: str = ""
    priority: str = "none"
    date: Optional[str] = None  # resolved ISO date, or None = unscheduled/Anytime
    date_phrase: Optional[str] = None  # original phrase, e.g. "tomorrow"
    time_specified: bool = False
    start_time: Optional[str] = None  # "HH:MM"
    end_time: Optional[str] = None
    all_day: bool = False
    duration_minutes: Optional[int] = None
    reminder_minutes_before: Optional[int] = None
    original_phrase: str = ""
    ambiguous: bool = False
    ambiguity_reason: Optional[str] = None  # "time_meridiem" | "time_unspecified"
    confidence: str = "high"  # "high" | "medium" | "low"


def format_time_12h(hhmm: str) -> str:
    hour, minute = (int(p) for p in hhmm.split(":")[:2])
    period = "AM" if hour < 12 else "PM"
    display_hour = hour % 12 or 12
    return f"{display_hour}:{minute:02d} {period}"


def _next_weekday(ref: date, target_weekday: int, strictly_next_week: bool) -> date:
    days_ahead = target_weekday - ref.weekday()
    if strictly_next_week:
        days_ahead += 7 if days_ahead <= 0 else 0
        if days_ahead < 7:
            days_ahead += 7
    else:
        if days_ahead < 0:
            days_ahead += 7
    return ref + timedelta(days=days_ahead)


def _resolve_date(text_lower: str, ref: date) -> tuple[Optional[date], Optional[str]]:
    if re.search(r"\bday after tomorrow\b", text_lower):
        return ref + timedelta(days=2), "day after tomorrow"
    if re.search(r"\btomorrow\b", text_lower):
        return ref + timedelta(days=1), "tomorrow"
    if re.search(r"\btoday\b", text_lower):
        return ref, "today"

    m = re.search(r"\bafter (\d+) days?\b", text_lower)
    if m:
        n = int(m.group(1))
        return ref + timedelta(days=n), m.group(0)

    m = re.search(r"\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text_lower)
    if m:
        idx = _WEEKDAYS.index(m.group(1))
        return _next_weekday(ref, idx, strictly_next_week=True), m.group(0)

    m = re.search(r"\bon\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text_lower) or \
        re.search(r"\bfor\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text_lower) or \
        re.search(r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", text_lower)
    if m:
        idx = _WEEKDAYS.index(m.group(1))
        return _next_weekday(ref, idx, strictly_next_week=False), m.group(1)

    month_pattern = "|".join(re.escape(name) for name in _MONTHS)
    m = re.search(rf"\b({month_pattern})\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?\b", text_lower)
    if m:
        month = _MONTHS[m.group(1)]
        day = int(m.group(2))
        try:
            candidate = date(ref.year, month, day)
        except ValueError:
            return None, None
        if candidate < ref - timedelta(days=30):
            candidate = date(ref.year + 1, month, day)
        return candidate, m.group(0)

    return None, None


_TIME_RANGE_RE = re.compile(
    r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b",
    re.IGNORECASE,
)
_TIME_RE = re.compile(r"\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b", re.IGNORECASE)
_BARE_TIME_RE = re.compile(r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b", re.IGNORECASE)


def _to_24h(hour: int, minute: int, meridiem: Optional[str]) -> Optional[tuple[int, int, bool]]:
    """Returns (hour24, minute, was_ambiguous)."""
    if meridiem:
        h = hour % 12
        if meridiem.lower() == "pm":
            h += 12
        return h, minute, False
    if hour == 0 or hour > 12:
        return hour % 24, minute, False
    # No AM/PM given and hour is 1-12: genuinely ambiguous without context.
    return None


def _resolve_time(text_lower: str) -> dict:
    """Returns dict with start_time/end_time/time_specified/ambiguous/ambiguity_reason."""
    result = {
        "start_time": None,
        "end_time": None,
        "time_specified": False,
        "ambiguous": False,
        "ambiguity_reason": None,
    }

    m = _TIME_RANGE_RE.search(text_lower)
    if m:
        h1, min1, mer1, h2, min2, mer2 = m.groups()
        mer1 = mer1 or mer2  # if only the second half has am/pm, apply it to both as a best guess
        start = _to_24h(int(h1), int(min1 or 0), mer1)
        end = _to_24h(int(h2), int(min2 or 0), mer2 or mer1)
        if start:
            result["start_time"] = f"{start[0]:02d}:{start[1]:02d}"
            result["time_specified"] = True
        if end:
            result["end_time"] = f"{end[0]:02d}:{end[1]:02d}"
        if start and not mer1 and not mer2:
            result["ambiguous"] = True
            result["ambiguity_reason"] = "time_meridiem"
        return result

    m = _TIME_RE.search(text_lower) or _BARE_TIME_RE.search(text_lower)
    if m:
        hour, minute, meridiem = int(m.group(1)), int(m.group(2) or 0), m.group(3)
        if not meridiem:
            # Infer from a nearby part-of-day word if present.
            if re.search(r"\bmorning\b", text_lower):
                meridiem = "am"
            elif re.search(r"\b(afternoon|evening|night|tonight)\b", text_lower):
                meridiem = "pm"
        resolved = _to_24h(hour, minute, meridiem)
        if resolved:
            result["start_time"] = f"{resolved[0]:02d}:{resolved[1]:02d}"
            result["time_specified"] = True
            if not meridiem:
                result["ambiguous"] = True
                result["ambiguity_reason"] = "time_meridiem"
        else:
            # Genuinely can't resolve AM/PM — best guess (afternoon skew for
            # typical interview/meeting hours) but flagged so the UI must
            # confirm before committing, per spec section 8.
            best = 12 + hour if 1 <= hour <= 7 else hour
            result["start_time"] = f"{best % 24:02d}:{minute:02d}"
            result["time_specified"] = True
            result["ambiguous"] = True
            result["ambiguity_reason"] = "time_meridiem"
        return result

    if re.search(r"\b(morning|afternoon|evening|night|tonight)\b", text_lower):
        # A part-of-day word with no explicit hour: spec section 8 says do
        # NOT invent an exact time — leave start_time unset, flag it.
        result["ambiguous"] = True
        result["ambiguity_reason"] = "time_unspecified"
        return result

    return result


def _detect_item_type(text_lower: str) -> str:
    for keyword, item_type in _ITEM_TYPE_KEYWORDS:
        if keyword in text_lower:
            return item_type
    return "task"


def _detect_priority(text_lower: str) -> str:
    return "high" if _URGENT_WORDS.search(text_lower) else "none"


def _extract_title(original: str, date_phrase: Optional[str], text_lower: str) -> Optional[str]:
    title = original.strip()

    # Strip the matched date/time phrases wherever they fall in the
    # sentence, so they don't linger in the middle or end of the title.
    strip_patterns = [
        r"\bday after tomorrow\b", r"\btomorrow\b", r"\btoday\b",
        r"\bafter \d+ days?\b",
        r"\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\b(on|for)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\b(morning|afternoon|evening|night|tonight)\b",
        _TIME_RANGE_RE.pattern,
        _TIME_RE.pattern,
        _BARE_TIME_RE.pattern,
    ]
    for pattern in strip_patterns:
        title = re.sub(pattern, " ", title, flags=re.IGNORECASE)

    month_pattern = "|".join(re.escape(name) for name in _MONTHS)
    title = re.sub(rf"\b(on\s+)?({month_pattern})\.?\s+\d{{1,2}}(?:st|nd|rd|th)?\b", " ", title, flags=re.IGNORECASE)

    # Repeatedly strip leading filler until stable — removing an outer
    # phrase (e.g. "Hey,") can expose another filler phrase (e.g. "I have")
    # that is now newly at the start of the string.
    prev = None
    while prev != title:
        prev = title
        for pattern in _FILLER_PREFIXES:
            title = re.sub(pattern, "", title, flags=re.IGNORECASE).strip()

    title = re.sub(r"\bon my calendar\b", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s{2,}", " ", title).strip(" ,.-")
    title = _LEADING_STOPWORDS.sub("", title).strip()
    title = _TRAILING_STOPWORDS.sub("", title).strip()

    if not title:
        return None
    return title[0].upper() + title[1:]


def looks_like_scheduling_request(text: str) -> bool:
    text_lower = text.lower()
    action_words = ("schedule", "set up", "set my", "add", "remind", "interview", "meeting",
                    "hackathon", "deadline", "follow up", "follow-up", "event", "appointment")
    time_words = ("tomorrow", "today", "next ", "after ", "monday", "tuesday", "wednesday",
                  "thursday", "friday", "saturday", "sunday", "am", "pm", "calendar",
                  "morning", "afternoon", "evening", "tonight")
    has_action = any(w in text_lower for w in action_words)
    has_time = any(w in text_lower for w in time_words) or bool(re.search(r"\bat\s+\d", text_lower))
    return has_action and has_time


def _llm_polish_title(rule_based_title: str, original_phrase: str) -> str:
    """Optional cleanup pass — only used when the rule-based title looks weak
    (very short or still ragged). Never touches date/time fields. Uses
    OpenAI, not Anthropic: anthropic==0.7.0 (pinned in requirements.txt)
    predates the Messages API entirely, so `client.messages` doesn't exist
    on that SDK version — same bug already found and fixed in
    agents/voice_agent.py."""
    if not os.getenv("OPENAI_API_KEY"):
        return rule_based_title
    try:
        from openai import OpenAI

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=30,
            messages=[{
                "role": "user",
                "content": (
                    "Extract a short, clean title (max 8 words, no trailing punctuation) "
                    f"from this scheduling request: \"{original_phrase}\". "
                    "Reply with only the title text, nothing else."
                ),
            }],
        )
        polished = (response.choices[0].message.content or "").strip().strip('"')
        return polished if polished else rule_based_title
    except Exception:
        return rule_based_title


def parse_schedule_text(text: str, timezone: str = "UTC", reference_dt: Optional[datetime] = None) -> ScheduleDraft:
    text = text.strip()
    text_lower = text.lower()

    try:
        tz = ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")

    now = reference_dt or datetime.now(tz)
    ref_date = now.date()

    resolved_date, date_phrase = _resolve_date(text_lower, ref_date)
    time_info = _resolve_time(text_lower)
    item_type = _detect_item_type(text_lower)
    priority = _detect_priority(text_lower)
    title = _extract_title(text, date_phrase, text_lower)

    confidence = "high"
    if not title or len(title) < 3:
        fallback = ITEM_TYPE_LABEL.get(item_type, "task").capitalize()
        title = _llm_polish_title(fallback, text)
        confidence = "medium"

    return ScheduleDraft(
        item_type=item_type,
        title=title,
        priority=priority,
        date=resolved_date.isoformat() if resolved_date else None,
        date_phrase=date_phrase,
        time_specified=time_info["time_specified"],
        start_time=time_info["start_time"],
        end_time=time_info["end_time"],
        all_day=False,
        duration_minutes=None,
        reminder_minutes_before=None,
        original_phrase=text,
        ambiguous=time_info["ambiguous"],
        ambiguity_reason=time_info["ambiguity_reason"],
        confidence=confidence,
    )
