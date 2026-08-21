# HustleOS — Engineering Handover

**Branch:** `claude/phase3-api-integration` · **Commit:** `73726ec` · **PR:** https://github.com/Soumyadeep143/Hustle_OS/pull/new/claude/phase3-api-integration

Read this before touching anything inside `agents/` or `routes/`. The system was built with deliberate, load-bearing architectural constraints. Ignoring them will create the exact fragmentation the spec explicitly forbids.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React/Vite, src/)                                     │
│                                                                 │
│  AI.tsx ──────────────────────────────────────────────────────┐ │
│  Voice.tsx  ──── POST /api/voice/command ────────────────────┐│ │
│  Home.tsx (schedule Quick Add) ─ POST /api/schedule/parse ──┐││ │
└─────────────────────────────────────────────────────────────│││─┘
                                                              │││
                           ┌──────────────────────────────────┘││
                           │   routes/voice.py                  ││
                           │   • builds context dict            ││
                           │     (tasks / apps / RECALL         ││
                           │      snapshot + follow_ups_due)    ││
                           │   • builds tool_ctx dict           ││
                           │     (live store handles)           ││
                           │   • calls VoiceAgent               ││
                           └──────────┬─────────────────────────┘│
                                      │                           │
                    agents/voice_agent.py                         │
                    VoiceAgent.process_voice_command()            │
                              │                                   │
                ┌─────────────┴──────────────┐                   │
                │                            │                   │
    scheduling-shaped?               everything else             │
    looks_like_scheduling_           VoiceAgent._respond()       │
    request() heuristic              OpenAI function-calling     │
                │                    loop (max 3 rounds)         │
                │                            │                   │
    agents/schedule_engine.py        agents/ai_tools.py          │
    parse_schedule_text()            TOOL_SPECS + execute_tool() │
    (regex + stdlib datetime,                │                   │
     NEVER LLM date guessing)        ┌───────┴───────┐           │
                │                  read            write          │
                │               tools:           tools:           │
    ambiguous? ─┤          get_today_plan    create_task          │
       yes: ask │          get_upcoming_     update_application_  │
        question│          schedule          status               │
       no: persist          search_recall                        │
        directly │          search_applications                  │
                │                                                │
    agents/conversation_store.py ◄─────────── pending slot      │
    (Postgres — 005_conversation_state.sql)    cleared on        │
    stores "pending_type" + payload            unrelated msg     │
    for cross-turn slot-filling                                  │
                                                                 │
    ──────────────────────────────────────────────────────────── │
                                                                 │
                           routes/schedule.py ◄──────────────────┘
                           POST /api/schedule/parse
                           (same parse_schedule_text() call —
                            Quick Add text box, not voice)
                           POST /api/schedule/{id}/sync-calendar
                           (real Google Calendar event push)
```

### The non-negotiable constraint

**One endpoint. One brain. One code path.** `POST /api/voice/command` handles both the AI chat screen (`src/screens/AI.tsx`) and the voice overlay (`src/screens/Voice.tsx`). `parse_schedule_text()` in `agents/schedule_engine.py` is shared by both voice (`VoiceAgent`) and the Quick Add text box (`routes/schedule.py`). There is no "Home AI", "Voice AI", "Job AI" — there is one `VoiceAgent`. The spec (`agents/voice_agent.py`'s docstring, and the product spec if you have it) is explicit. Don't fork it.

---

## What's real and working

### Backend

| File | What it does |
|---|---|
| `agents/voice_agent.py` | Single conversational brain. Scheduling branch + tool-calling branch. Cross-turn slot-filling. Proactive Mem0 fetch injected into every context snapshot. Entity-continuity pronoun detection (`_PRONOUN_RE`) enriches transcripts before the tool loop. Whisper STT + multi-provider TTS. |
| `agents/schedule_engine.py` | Fully deterministic NLU: today / tomorrow / day after tomorrow / next Friday / after N days / month+date / time ranges / AM/PM ambiguity detection. Never calls an LLM for date math. Shared by voice + Quick Add. |
| `agents/ai_tools.py` | `TOOL_SPECS` + `execute_tool()`. **10 tools total:** `get_today_plan`, `get_upcoming_schedule`, `search_recall`, `search_applications`, `create_task`, `update_application_status` (existing); `search_memory`, `remember_preference` (Mem0); `get_recall_thread` (RECALL→Application→event-log join); `get_forgotten_items` (overdue follow-ups + stale apps + past-due tasks). |
| `agents/conversation_store.py` | Postgres-backed per-user state. **Pending slot** (schedule clarification, 10-min expiry). **Last-entity tracking** (`save_last_entity` / `get_last_entity` / `clear_last_entity`) — written by ai_tools after unambiguous tool results, read by voice_agent for pronoun resolution. |
| `memory_providers/mem0_provider.py` | Complete Mem0 REST client. Auto-selected by `get_memory_provider()` when `MEM0_API_KEY` is set. Now wired into `routes/voice.py` → `tool_ctx["memory_provider"]` and fetched proactively in `VoiceAgent._respond`. |
| `agents/calendar_client.py` | Real Google Calendar OAuth. `build_auth_url()`, `exchange_code()`, `refresh_access_token()`, `create_event()`. httpx only — no Google SDK. Inert if `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` not set. `is_configured()` check guards every caller. |
| `agents/calendar_store.py` | `calendar_connections` table CRUD. Token refresh path in `routes/schedule.py` writes back via `update_access_token()`. |
| `agents/memory_agent.py` | Profiles, applications, captures — Postgres only (no more `memory.json`). `get_user_context()` used by planner/brief seeding. `detect_insights()` used by signals seeding. |
| `agents/recall_store.py` | `recall_items` + `recall_timeline_events` — Postgres. Every row is a real user capture, nothing seeded. |
| `agents/recall_source.py` | URL→source detection. `detect_source(url)` → `("linkedin" \| "x" \| "instagram" \| "reddit" \| "other", display_name)`. Matches on host only, never guesses from free text. |
| `agents/home_store.py` | TODAY timeline, SIGNALS, AI Brief — Postgres (`timeline_entries`, `signals`, `briefs`, `seed_flags`). First-visit seeding from planner priorities (one-time, idempotent via `seed_flags`). |
| `agents/task_store.py` | FOCUS task list — Postgres (`tasks`, `seed_flags`). First-visit seed from planner. |
| `agents/planner_agent.py` | Claude via Anthropic API (see SDK gotcha below) → returns `[]` on any failure, never hardcoded fallbacks. |
| `agents/opportunity_agent.py` | `discover_jobs()` calls Claude to generate realistic opportunities; `score_opportunity()` uses Claude. Both return `[]` on failure, no mock data. |
| `agents/workspace_store.py` | Enterprise org-health — JSON file (`workspace_state.json`). Defaults to zeroed-out state, no mock numbers. |
| `memory_providers/mem0_provider.py` | Complete Mem0 REST client over httpx (no `mem0ai` SDK — see pydantic conflict note). `get_memory_provider()` auto-selects it if `MEM0_API_KEY` is set. Zero callers today — see roadmap item 1. |
| `auth.py` | JWT (30-day expiry), bcrypt, `get_current_user_id()` FastAPI dependency. Every authenticated route uses it. Never trust a client-supplied `user_id` field in a request body. |
| `db/connection.py` | `get_cursor()` context manager over psycopg2, `DATABASE_URL` from env. |
| `db/migrations/001_personal_schema.sql` | profiles, applications, captures, tasks, timeline_entries, signals, briefs, seed_flags |
| `db/migrations/002_users_auth.sql` | users table for auth |
| `db/migrations/003_recall_schema.sql` | recall_items, recall_timeline_events |
| `db/migrations/004_scheduling.sql` | timeline_entries extended columns (item_type, priority, scheduled_date, start_time, end_time, all_day, timezone, calendar_event_id, completed, …), calendar_connections |
| `db/migrations/005_conversation_state.sql` | conversation_state (pending slot) |
| `db/migrations/006_entity_continuity.sql` | Adds `last_entity_type`, `last_entity_id`, `last_entity_label` columns to conversation_state — **apply this migration before starting the server** |

### Frontend

| File | What it does |
|---|---|
| `src/screens/AI.tsx` | AI chat screen — calls `POST /api/voice/command` |
| `src/screens/Voice.tsx` | Voice overlay — same endpoint |
| `src/screens/Home.tsx` | Greeting (typewriter, per-time-of-day color), Today timeline, Focus, Signals. Schedule Quick Add calls `POST /api/schedule/parse`. Fully animated (see `src/index.css`). |
| `src/screens/Profile.tsx` | Integrations section: brand icons, shimmer/hover animations (`src/index.css`). |
| `src/screens/Work.tsx` | Applications + Tasks |
| `src/screens/recall/` | RECALL capture, list, detail |
| `src/services/api.ts` | Every API call. Single source of truth for request shapes and base URL. |
| `src/store/useUi.ts` | Zustand store: workspace, theme, toast, tasks, sheet state. `loadTasks()` / `toggleTask()` / `addTask()` talk to the API — no local mock data. |

---

## Known SDK gotcha — do not reintroduce

`anthropic==0.7.0` (pinned in `requirements.txt`) **predates the Messages API.** `client.messages.create` **does not exist** on this version. Calls silently fail/raise `AttributeError` and fall through to exception handlers. This was already bitten in `VoiceAgent` and `schedule_engine`'s LLM polish path — both now use `openai` instead.

**If you want to use Claude:** either bump `anthropic` deliberately (verify it doesn't conflict with `pydantic==1.10.13`, which `elevenlabs==0.2.24` requires) or keep using `openai`. Don't add any new call to `self.client.messages` on the current `anthropic==0.7.0` install — it will fail silently.

The pydantic constraint exists because:
```
elevenlabs==0.2.24  →  requires pydantic<2
anthropic>=0.18     →  requires pydantic>=2
```
Resolve one before bumping the other.

---

## Roadmap — what's left

All four original roadmap items are now complete. The remaining work is:

### 1. Personalization + proactive briefings (was roadmap item 5)

**What exists:**
- Mem0 is live and wired — `get_memory_provider()` → `tool_ctx["memory_provider"]` → proactive fetch in `VoiceAgent._respond` + `search_memory` / `remember_preference` tools
- `get_forgotten_items` tool is live

**What's missing:**
- Morning/evening brief on login or schedule trigger. Suggested: in `routes/voice.py`'s `process_command`, detect if this is the user's first message of the day (check `conversation_state.updated_at` vs today's date) and prepend a synthetic brief prompt to the context before calling `VoiceAgent._respond`.
- Learned patterns: `remember_preference` currently only stores explicit user statements. A light post-response pass that calls `provider.add()` for inferred patterns (e.g. consistent Monday follow-up behaviour) needs a decision gate — see HANDOVER spec section 9's EXPLICIT vs OBSERVED distinction.
- The spec distinguishes `"preference"`, `"pattern"`, and `"fact"` metadata categories — the tool already stores these, but nothing promotes observed patterns yet.

### 2. Deeper entity-continuity mutations ("move it to Friday")

**What exists:**
- `conversation_store.get_last_entity()` / `save_last_entity()` — written after `get_recall_thread` and `update_application_status` tool calls
- Pronoun detection (`_PRONOUN_RE`) in `VoiceAgent.process_voice_command` enriches the transcript before the tool loop
- The model sees `"Last referenced entity: X [type: …, id: …]"` in the context snapshot

**What's missing:**
- **Mutation routing for timeline entries**: "move that interview to Friday" currently falls into the scheduling branch (`looks_like_scheduling_request` matches) and creates a NEW entry instead of updating the existing one. Needs: before the scheduling branch, check if `_contains_pronoun(transcript)` + `last_entity.entity_type == "timeline_entry"` → route to an update tool rather than a create.
- `update_timeline_entry` tool not yet in `TOOL_SPECS`. Add it to `agents/ai_tools.py` + `_TOOL_IMPLS`, write `last_entity` on successful update.
- Similarly `delete_entity` / `reschedule_entity` for the voice "cancel that" / "reschedule it" patterns.

---

## Running the backend

```bash
cd hustleos-backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 3001  # use a port that isn't :3000 if another session is running
```

Apply migrations (run once against the Supabase Postgres DB — idempotent, safe to re-run):
```bash
# each migration in order, e.g. using psql or Supabase SQL editor
# db/migrations/001_personal_schema.sql
# db/migrations/002_users_auth.sql
# db/migrations/003_recall_schema.sql
# db/migrations/004_scheduling.sql
# db/migrations/005_conversation_state.sql
```

Running the frontend:
```bash
# repo root
npm install
npm run dev   # Vite on :5173
```

---

## Environment variables

All in `hustleos-backend/.env` (gitignored — already populated locally, ask the user before regenerating):

| Variable | Used by |
|---|---|
| `OPENAI_API_KEY` | `VoiceAgent` (GPT-4o-mini), `schedule_engine` (title polish), `VoiceAgent.speech_to_text` (Whisper) |
| `ANTHROPIC_API_KEY` | `PlannerAgent`, `OpportunityAgent` (but see SDK gotcha — effectively unused until `anthropic` is bumped) |
| `ELEVENLABS_API_KEY` | `voice_providers/elevenlabs_provider.py` |
| `SARVAM_API_KEY` | `voice_providers/` Sarvam provider (primary voice; ElevenLabs is fallback) |
| `DATABASE_URL` | `db/connection.py` — Supabase pooler connection string |
| `JWT_SECRET` | `auth.py` — change this from `dev-only-change-me` before any real deployment |
| `GOOGLE_CLIENT_ID` | `agents/calendar_client.py` |
| `GOOGLE_CLIENT_SECRET` | `agents/calendar_client.py` |
| `GOOGLE_REDIRECT_URI` | `agents/calendar_client.py` — must be registered in Google Cloud Console (project `codelab-500113`), OAuth app is in Testing mode, add test-user emails there |
| `MEM0_API_KEY` | `memory_providers/mem0_provider.py` — set this to activate Mem0; `get_memory_provider()` auto-selects it |
| `FRONTEND_URL` | CORS origins in `app.py` |

---

## Working conventions

- **Read the file before editing it.** Multiple sessions work against this repo simultaneously. A stale in-context copy has burned work before.
- **Never fake it.** No hardcoded response strings, no invented dates/times, no "done" unless a write tool actually succeeded. Every response citing app state must come from a real query result. The whole codebase currently holds this invariant — don't regress it.
- **One migration per logical change**, numbered sequentially under `db/migrations/`, named descriptively. All migrations are idempotent (`create table if not exists`, `add column if not exists`, `alter table ... add constraint if not exists`). No migration runner — apply manually against Supabase.
- **Don't restart the shared `:3000` server process without checking.** Another session or dev may have work in flight against it. Spin up on a different port for testing, kill your instance when done.
- **Secrets stay in `.env`.** `.env` is gitignored and was confirmed excluded from commit `73726ec`. `.claude/`, `.agents/`, `.mcp.json` are also now gitignored (local tooling state, not app source).
- **Test auth with a throwaway signup** — `POST /api/auth/signup` with a disposable email, use the returned JWT for subsequent calls. Never test against the persistent user account if you're running destructive operations.
- **The `pydantic==1.10.13` pin is load-bearing.** Don't bump it without also fixing `elevenlabs`. If you must use pydantic v2, you'll need to either upgrade or replace ElevenLabs.
