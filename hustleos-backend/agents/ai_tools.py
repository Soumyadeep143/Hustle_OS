"""Read-only tool layer for VoiceAgent's tool-calling loop.

Each tool wraps an existing store method 1:1 — no new persistence, no new
business logic. The LLM picks a tool via OpenAI function-calling; this module
executes it against the real per-user stores and returns a compact,
JSON-serializable result for the model to read back. Phase 1 of the unified
AI layer: read-only only, no mutation happens through chat yet.
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .recall_source import source_display_for

TOOL_SPECS = [
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
                        "description": "Filter by status, e.g. 'new', 'applied', 'archived'.",
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
                        "description": "Filter by exact status, e.g. 'applied', 'interviewing', 'offer', 'rejected'.",
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
                "closest one and say so in your reply rather than inventing a "
                "new status (e.g. an offer or rejection currently has nowhere "
                "to go but 'interview' or 'applied' — tell the user that's a "
                "known gap instead of pretending it recorded the nuance)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string", "description": "Company name or partial name to match."},
                    "status": {
                        "type": "string",
                        "enum": ["applied", "reviewing", "interview", "captured"],
                        "description": "Must be exactly one of these four values — no others are valid.",
                    },
                },
                "required": ["company", "status"],
            },
        },
    },
]


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
        "title": item.get("title"),
        "source": source_display_for(item.get("source")),
        "category": item.get("category"),
        "status": item.get("status"),
        "url": item.get("url"),
        "created_at": item.get("created_at"),
        "follow_up_at": item.get("follow_up_at"),
        "notes": item.get("notes"),
    }


def _application_summary(app: Dict) -> Dict:
    return {
        "company": app.get("company"),
        "role": app.get("role"),
        "status": app.get("status"),
        "applied_at": app.get("applied_at"),
        "last_followup": app.get("last_followup"),
        "notes": app.get("notes"),
    }


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
    return {"created": True, "title": created.get("title"), "due_at": created.get("due_at"), "priority": created.get("priority")}


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
            "message": "More than one application matches — ask the user which one before updating anything.",
            "candidates": [_application_summary(a) for a in matches],
        }

    updated = ctx["memory"].update_application(matches[0]["id"], {"status": status})
    return {
        "updated": True,
        "company": updated.get("company"),
        "role": updated.get("role"),
        "status": updated.get("status"),
    }


_TOOL_IMPLS = {
    "get_today_plan": get_today_plan,
    "get_upcoming_schedule": get_upcoming_schedule,
    "search_recall": search_recall,
    "search_applications": search_applications,
    "create_task": create_task,
    "update_application_status": update_application_status,
}


def execute_tool(name: str, args: Dict, ctx: Dict) -> Dict:
    impl = _TOOL_IMPLS.get(name)
    if not impl:
        return {"error": f"Unknown tool '{name}'"}
    try:
        return impl(ctx, args)
    except Exception as e:
        return {"error": str(e)}
