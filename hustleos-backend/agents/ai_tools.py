"""Tool layer for VoiceAgent's tool-calling loop.

Each tool wraps existing store/provider methods — no new persistence logic
lives here. The LLM picks a tool via OpenAI function-calling; this module
executes it against the real per-user stores and returns a compact,
JSON-serializable result for the model to read back.

Tools added in this revision:
  search_memory        — Mem0 semantic search over long-term preferences/facts
  remember_preference  — Persist an explicit user preference to Mem0
  get_recall_thread    — Join a RECALL item + its linked application + event log
                         in one call (cross-context intelligence)
  get_forgotten_items  — Overdue follow-ups, stale applications, past-due tasks
                         grouped by type (proactive "what am I forgetting?")
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .recall_source import source_display_for

TOOL_SPECS = [
    # ── existing tools ────────────────────────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_today_plan",
            "description": (
                "Get everything scheduled on the user's TODAY timeline: tasks, "
                "events, interviews, deadlines with their times and priorities. "
                "Use this for 'what do I have today', 'what's my plan today'."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_upcoming_schedule",
            "description": (
                "Get scheduled timeline items over the next N days (default 7), "
                "including today. Use for 'what do I have tomorrow', 'what's "
                "happening this week', 'what's coming up'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {
                        "type": "integer",
                        "description": "How many days ahead to include, starting today. Default 7.",
                    }
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_recall",
            "description": (
                "Search the user's RECALL captures (saved links/notes from "
                "LinkedIn, Instagram, X, Reddit, etc). Use for 'what did I save', "
                "'what links did I paste', 'what hackathons/jobs did I capture', "
                "'what was that post about X'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keyword to match against title/description/notes. Omit to list recent items.",
                    },
                    "source": {
                        "type": "string",
                        "description": "Filter by source, e.g. 'linkedin', 'instagram', 'x', 'reddit'.",
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by status, e.g. 'saved', 'applied', 'archived'.",
                    },
                    "since_days": {
                        "type": "integer",
                        "description": "Only include items captured in the last N days.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_applications",
            "description": (
                "Search the user's tracked job/internship applications. Use for "
                "'did I apply to X', 'what jobs did I save', 'what's pending', "
                "'who do I need to follow up with'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Keyword to match against company/role. Omit to list all.",
                    },
                    "status": {
                        "type": "string",
                        "description": "Filter by exact status: 'applied', 'reviewing', 'interview', 'captured'.",
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_task",
            "description": (
                "Create a new task on the user's FOCUS task list. Use for 'add a "
                "task to...', 'I need to...', 'don't let me forget to...' — plain "
                "to-dos with no specific date/time. If the request has a specific "
                "date or time, do NOT use this tool; that's handled automatically "
                "before you're asked anything."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Concise task title."},
                    "due_at": {
                        "type": "string",
                        "description": "Optional free-text due label, e.g. 'Friday', 'This week'. Omit if not mentioned.",
                    },
                    "priority": {
                        "type": "string",
                        "description": "One of: high, normal, low. Default normal.",
                    },
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_application_status",
            "description": (
                "Update the status of a tracked job/internship application, "
                "matched by company name. Use for 'mark X as applied', 'I applied "
                "to X', 'I got an interview with X'. The applications table only "
                "supports these four statuses today — map anything else to the "
                "closest one (e.g. an offer or rejection currently has nowhere to "
                "go but 'interview' or 'applied') and say so in your reply — tell "
                "the user that's a known gap instead of pretending it recorded "
                "the nuance."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "Company name or partial name to match."},
                    "status": {
                        "type": "string",
                        "enum": ["applied", "reviewing", "interview", "captured"],
                        "description": "Must be exactly one of these four values.",
                    },
                },
                "required": ["company", "status"],
            },
        },
    },

    # ── Roadmap 1: Mem0 long-term memory ─────────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "search_memory",
            "description": (
                "Search the user's long-term memory for preferences, recurring "
                "patterns, and important facts they've told the assistant. Use "
                "for 'do you remember...', 'what do you know about my...', or "
                "whenever a reply needs a personal preference (e.g. reminder "
                "timing, communication style, interview prep habits)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Natural-language query describing what to look for.",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Max results to return. Default 5.",
                    },
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "remember_preference",
            "description": (
                "Save an explicit preference or important personal fact to "
                "long-term memory. Only call this when the user clearly states "
                "something they want remembered — 'remember that...', 'always "
                "remind me...', 'I prefer...'. Do NOT call this for every "
                "message. Never deduce a preference — only store what was "
                "explicitly said."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "text": {
                        "type": "string",
                        "description": "The preference or fact, verbatim or very lightly cleaned up.",
                    },
                    "category": {
                        "type": "string",
                        "description": (
                            "One of: 'preference' (explicit user preference), "
                            "'pattern' (observed recurring behaviour), "
                            "'fact' (biographical / work fact). Default 'preference'."
                        ),
                    },
                },
                "required": ["text"],
            },
        },
    },

    # ── Roadmap 2: Cross-context recall thread ────────────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_recall_thread",
            "description": (
                "Get the full story of a RECALL capture: the saved item itself, "
                "the linked application (if it was turned into one), and its "
                "complete activity timeline. Use for 'what happened with that "
                "X job/company I saved', 'show me everything about X', 'how "
                "far did I get with X'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Company name, job title, or keyword to match against the RECALL item.",
                    },
                },
                "required": ["query"],
            },
        },
    },

    # ── Roadmap 3: Proactive forgotten-items surface ───────────────────────
    {
        "type": "function",
        "function": {
            "name": "get_forgotten_items",
            "description": (
                "Find things the user is likely forgetting: overdue RECALL "
                "follow-ups, applications with no activity in 7+ days, open "
                "tasks past their due date. Use for 'what am I forgetting', "
                "'what should I be doing', 'anything overdue', 'catch me up'."
            ),
            "parameters": {"type": "object", "properties": {}},
        },
    },
]


# ── helpers ────────────────────────────────────────────────────────────────

def _local_today(timezone: str) -> date:
    try:
        tz = ZoneInfo(timezone)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _timeline_summary(entry: Dict) -> Dict:
    return {
        "title": entry.get("title"),
        "item_type": entry.get("item_type"),
        "priority": entry.get("priority"),
        "scheduled_date": entry.get("scheduled_date"),
        "start_time": entry.get("start_time"),
        "end_time": entry.get("end_time"),
        "all_day": entry.get("all_day"),
        "completed": entry.get("completed"),
    }


def _recall_summary(item: Dict) -> Dict:
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "source": source_display_for(item.get("source")),
        "category": item.get("category"),
        "status": item.get("status"),
        "url": item.get("url"),
        "created_at": item.get("created_at"),
        "follow_up_at": item.get("follow_up_at"),
        "notes": item.get("notes"),
        "company": item.get("company"),
    }


def _application_summary(app: Dict) -> Dict:
    return {
        "id": app.get("id"),
        "company": app.get("company"),
        "role": app.get("role"),
        "status": app.get("status"),
        "applied_at": app.get("applied_at"),
        "last_followup": app.get("last_followup"),
        "notes": app.get("notes"),
        "updated_at": app.get("updated_at"),
    }


# ── existing tool implementations ─────────────────────────────────────────

def get_today_plan(ctx: Dict, args: Dict) -> Dict:
    today_iso = _local_today(ctx["timezone"]).isoformat()
    entries = ctx["home"].list_timeline(ctx["user_id"], on_date=today_iso)
    return {"date": today_iso, "items": [_timeline_summary(e) for e in entries[:20]]}


def get_upcoming_schedule(ctx: Dict, args: Dict) -> Dict:
    days = args.get("days") or 7
    today = _local_today(ctx["timezone"])
    end = today + timedelta(days=days)
    entries = ctx["home"].list_timeline(ctx["user_id"])
    windowed = [
        e for e in entries
        if e.get("scheduled_date") and today.isoformat() <= e["scheduled_date"] <= end.isoformat()
    ]
    windowed.sort(key=lambda e: (e["scheduled_date"], e.get("start_time") or ""))
    return {
        "range": f"{today.isoformat()} to {end.isoformat()}",
        "items": [_timeline_summary(e) for e in windowed[:30]],
    }


def search_recall(ctx: Dict, args: Dict) -> Dict:
    items = ctx["recall"].list_items(status=args.get("status"), source=args.get("source"))
    query = (args.get("query") or "").strip().lower()
    if query:
        items = [
            i for i in items
            if query in (i.get("title") or "").lower()
            or query in (i.get("description") or "").lower()
            or query in (i.get("notes") or "").lower()
            or query in (i.get("company") or "").lower()
        ]
    since_days = args.get("since_days")
    if since_days:
        cutoff = (datetime.now() - timedelta(days=since_days)).isoformat()
        items = [i for i in items if (i.get("created_at") or "") >= cutoff]
    items.sort(key=lambda i: i.get("created_at") or "", reverse=True)
    return {"count": len(items), "items": [_recall_summary(i) for i in items[:15]]}


def search_applications(ctx: Dict, args: Dict) -> Dict:
    apps = ctx["memory"].get_applications()
    query = (args.get("query") or "").strip().lower()
    if query:
        apps = [
            a for a in apps
            if query in (a.get("company") or "").lower() or query in (a.get("role") or "").lower()
        ]
    status = args.get("status")
    if status:
        apps = [a for a in apps if a.get("status") == status]
    return {"count": len(apps), "items": [_application_summary(a) for a in apps[:15]]}


def create_task(ctx: Dict, args: Dict) -> Dict:
    title = (args.get("title") or "").strip()
    if not title:
        return {"error": "missing_title", "message": "Need a task title to create it."}
    created = ctx["tasks"].create_task(
        ctx["user_id"],
        title,
        due_at=args.get("due_at"),
        priority=args.get("priority") or "normal",
    )
    return {
        "created": True,
        "id": created.get("id"),
        "title": created.get("title"),
        "due_at": created.get("due_at"),
        "priority": created.get("priority"),
    }


def update_application_status(ctx: Dict, args: Dict) -> Dict:
    company_query = (args.get("company") or "").strip().lower()
    status = args.get("status")
    if not company_query or not status:
        return {"error": "missing_arguments", "message": "Need both a company name and a new status."}

    apps = ctx["memory"].get_applications()
    matches = [a for a in apps if company_query in (a.get("company") or "").lower()]
    if not matches:
        return {"error": "no_match", "message": f"No tracked application matches '{args.get('company')}'."}
    if len(matches) > 1:
        return {
            "error": "ambiguous",
            "message": "More than one application matches — ask the user which one before updating.",
            "candidates": [_application_summary(a) for a in matches],
        }

    updated = ctx["memory"].update_application(matches[0]["id"], {"status": status})
    if not updated:
        return {"error": "update_failed", "message": f"Could not update '{args.get('company')}' — it may no longer exist."}

    # Record the updated application as the last referenced entity so
    # pronouns in the next turn ("it", "that one") resolve back to it.
    if ctx.get("conv_store") and ctx.get("user_id"):
        ctx["conv_store"].save_last_entity(
            ctx["user_id"], "application", updated["id"], updated["company"]
        )
    return {
        "updated": True,
        "company": updated.get("company"),
        "role": updated.get("role"),
        "status": updated.get("status"),
    }


# ── Roadmap 1: Mem0 tools ─────────────────────────────────────────────────

def search_memory(ctx: Dict, args: Dict) -> Dict:
    """Semantic search over long-term Mem0 memories."""
    provider = ctx.get("memory_provider")
    if not provider:
        return {"error": "memory_unavailable", "message": "Long-term memory is not configured."}
    query = (args.get("query") or "").strip()
    if not query:
        return {"error": "missing_query", "message": "Need a query to search memory."}
    limit = int(args.get("limit") or 5)
    try:
        results = provider.search(ctx["user_id"], query, limit=limit)
        return {
            "count": len(results),
            "memories": [
                {"text": r.get("text"), "category": (r.get("metadata") or {}).get("category", ""), "created_at": r.get("created_at")}
                for r in results
            ],
        }
    except Exception as e:
        return {"error": str(e), "message": "Memory search failed."}


def remember_preference(ctx: Dict, args: Dict) -> Dict:
    """Store an explicit user preference/fact in Mem0."""
    provider = ctx.get("memory_provider")
    if not provider:
        return {"error": "memory_unavailable", "message": "Long-term memory is not configured."}
    text = (args.get("text") or "").strip()
    if not text:
        return {"error": "missing_text", "message": "Nothing to remember."}
    category = args.get("category") or "preference"
    if category not in ("preference", "pattern", "fact"):
        category = "preference"
    try:
        result = provider.add(ctx["user_id"], text, metadata={"category": category, "source": "explicit"})
        return {"remembered": True, "id": result.get("id"), "text": text, "category": category}
    except Exception as e:
        return {"error": str(e), "message": "Could not save to memory."}


# ── Roadmap 2: Cross-context recall thread ────────────────────────────────

def get_recall_thread(ctx: Dict, args: Dict) -> Dict:
    """Return a RECALL item + its linked application + full event log."""
    query = (args.get("query") or "").strip().lower()
    if not query:
        return {"error": "missing_query", "message": "Need a search term."}

    # 1. Find matching RECALL items (title / description / company / notes).
    items = ctx["recall"].list_items()
    matches = [
        i for i in items
        if query in (i.get("title") or "").lower()
        or query in (i.get("description") or "").lower()
        or query in (i.get("company") or "").lower()
        or query in (i.get("notes") or "").lower()
    ]

    if not matches:
        return {"found": False, "message": f"No RECALL item matched '{args.get('query')}'."}

    # Pick the most recent match if several.
    matches.sort(key=lambda i: i.get("created_at") or "", reverse=True)
    item = matches[0]
    item_id = item["id"]

    # 2. Fetch the RECALL event timeline for this item.
    timeline_events = ctx["recall"].list_timeline(item_id)

    # 3. Follow related_application_id FK if present.
    application: Optional[Dict] = None
    related_app_id = item.get("related_application_id")
    if related_app_id:
        apps = ctx["memory"].get_applications()
        application = next((a for a in apps if a.get("id") == related_app_id), None)

    # Record this item as the last referenced entity.
    if ctx.get("conv_store") and ctx.get("user_id"):
        ctx["conv_store"].save_last_entity(
            ctx["user_id"], "recall_item", item_id, item.get("title", "")
        )

    return {
        "found": True,
        "multiple_matches": len(matches) > 1,
        "recall_item": _recall_summary(item),
        "application": _application_summary(application) if application else None,
        "timeline": [
            {
                "event_type": e.get("event_type"),
                "label": e.get("label"),
                "detail": e.get("detail"),
                "created_at": e.get("created_at"),
            }
            for e in timeline_events
        ],
    }


# ── Roadmap 3: Forgotten items ────────────────────────────────────────────

def get_forgotten_items(ctx: Dict, args: Dict) -> Dict:
    """Overdue RECALL follow-ups + stale applications + past-due tasks."""
    today = _local_today(ctx["timezone"])
    today_iso = today.isoformat()
    stale_threshold = (today - timedelta(days=7)).isoformat()

    # 1. Overdue RECALL follow-ups — follow_up_at in the past, not done/archived.
    recall_items = ctx["recall"].list_items()
    overdue_followups = [
        {
            "id": i.get("id"),
            "title": i.get("title"),
            "company": i.get("company"),
            "follow_up_at": i.get("follow_up_at"),
            "status": i.get("status"),
            "days_overdue": (today - date.fromisoformat(i["follow_up_at"])).days,
        }
        for i in recall_items
        if i.get("follow_up_at")
        and i["follow_up_at"] < today_iso
        and i.get("status") not in ("completed", "archived")
    ]
    overdue_followups.sort(key=lambda x: x["follow_up_at"])

    # 2. Stale applications — no update in 7+ days and still active.
    apps = ctx["memory"].get_applications()
    stale_apps = [
        {
            "id": a.get("id"),
            "company": a.get("company"),
            "role": a.get("role"),
            "status": a.get("status"),
            "last_activity": a.get("updated_at") or a.get("applied_at"),
        }
        for a in apps
        if a.get("status") in ("applied", "reviewing")
        and (a.get("updated_at") or a.get("applied_at") or "") <= stale_threshold
    ]
    stale_apps.sort(key=lambda x: x["last_activity"] or "")

    # 3. Past-due open tasks.
    tasks = ctx["tasks"].list_tasks(ctx["user_id"])
    overdue_tasks = []
    for t in tasks:
        if t.get("done"):
            continue
        due = t.get("due_at")
        if not due:
            continue
        # due_at is free-text ("Friday", "This week") or an ISO date.
        try:
            due_date = date.fromisoformat(due)
            if due_date < today:
                overdue_tasks.append({
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "due_at": due,
                    "days_overdue": (today - due_date).days,
                })
        except ValueError:
            pass  # free-text due dates are not comparable — skip them

    total = len(overdue_followups) + len(stale_apps) + len(overdue_tasks)
    return {
        "total_forgotten": total,
        "overdue_followups": overdue_followups[:10],
        "stale_applications": stale_apps[:10],
        "overdue_tasks": overdue_tasks[:10],
    }


# ── dispatch table ─────────────────────────────────────────────────────────

_TOOL_IMPLS = {
    "get_today_plan": get_today_plan,
    "get_upcoming_schedule": get_upcoming_schedule,
    "search_recall": search_recall,
    "search_applications": search_applications,
    "create_task": create_task,
    "update_application_status": update_application_status,
    "search_memory": search_memory,
    "remember_preference": remember_preference,
    "get_recall_thread": get_recall_thread,
    "get_forgotten_items": get_forgotten_items,
}


def execute_tool(name: str, args: Dict, ctx: Dict) -> Dict:
    impl = _TOOL_IMPLS.get(name)
    if not impl:
        return {"error": f"Unknown tool '{name}'"}
    try:
        return impl(ctx, args)
    except Exception as e:
        return {"error": str(e)}
