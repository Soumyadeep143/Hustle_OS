# HustleOS AI Brain — Handover

Written for whoever picks this up next (Kiro, Codex, or a human). Read this before touching `agents/voice_agent.py`, `agents/ai_tools.py`, `agents/schedule_engine.py`, or `agents/conversation_store.py` — they're the core of a system that was deliberately built as ONE unified AI brain, not several competing ones. The product spec (ask the user for the full text if you don't have it — it's long) is explicit: "Do NOT build Home AI / Recall AI / Voice AI / Job AI / Calendar AI / Team AI. Instead: ONE unified AI orchestration layer." Keep it that way.

## Architecture as it exists today

```
TEXT (AI chat screen) ─┐
                        ├──> POST /api/voice/command ──> VoiceAgent.process_voice_command()
VOICE (voice overlay) ──┘                                        │
                                                    ┌──────────────┼──────────────┐
                                            scheduling-shaped?  else: tool-calling chat loop
                                                    │                              │
                                       agents/schedule_engine.py          agents/ai_tools.py
                                       (deterministic regex+datetime,     (OpenAI function-calling,
                                        never LLM-guessed dates/times)     read + a couple write tools)
```

One endpoint, one `VoiceAgent`, shared by text and voice — this already satisfies spec section 2 and section 14. Don't fork it.

### Request/response shape
- `POST /api/voice/command` — body: `VoiceCommandRequest {transcript, timezone}` (models/schemas.py). Auth via JWT (`get_current_user_id`), never trust a client-supplied user id.
- Response: `VoiceResponse {response, audio_url, schedule_draft}` (models/schemas.py + models/schedule_schemas.py's `ScheduleDraftDto`).
- `routes/voice.py`'s `get_agents()` builds a `context` dict (tasks/applications/RECALL snapshot, truncated) and a `tool_ctx` dict (live store handles: `home`, `recall`, `memory`, `tasks`, `user_id`, `timezone`) that both the scheduling path and the tool-calling path read from.

### The two control-flow branches inside `VoiceAgent.process_voice_command`
1. **Scheduling branch** — `looks_like_scheduling_request()` (keyword heuristic) → `parse_schedule_text()` (deterministic date/time extraction, `agents/schedule_engine.py`) → if the result is unambiguous, persists directly via `HomeStore.add_timeline_entry()`; if ambiguous (no time, or unclear AM/PM), asks a focused follow-up question instead of guessing (spec section 4/15/16).
2. **Tool-calling branch** (`VoiceAgent._respond`) — everything else. OpenAI function-calling loop against `TOOL_SPECS` (`agents/ai_tools.py`). Currently: `get_today_plan`, `get_upcoming_schedule`, `search_recall`, `search_applications` (read), `create_task`, `update_application_status` (write, direct-execute — low risk per spec section 18).

### Conversational working memory (just added)
`agents/conversation_store.py` + `db/migrations/005_conversation_state.sql` — a one-row-per-user Postgres table holding a "pending slot" (currently only used for `schedule_clarification`: the original phrase + which piece was missing). Before the scheduling branch runs, `process_voice_command` checks for a pending slot; if the new message looks like a short time answer (`_looks_like_followup_answer`), it merges into the original phrase and re-parses through the *same* `parse_schedule_text()` — no separate NLU path. Verified end-to-end: "I have an interview tomorrow." → "What time?" → "5 PM." → exactly one interview record, correct date+time, no duplicate (spec's Test A). Pending expires after 10 minutes and clears on any unrelated message.

**If you extend this**: the `pending_type` column is deliberately generic (jsonb payload) so you can add other pending-slot kinds (e.g. "recall_capture_followup" for spec section 4's "send me the link and I'll save it" flow, or "entity_disambiguation" for spec section 5/23's "did you mean ABC or XYZ?") without a schema migration — just a new `pending_type` string and whatever shape of payload that flow needs, plus a branch in `process_voice_command` that checks it before falling through to the tool-calling loop.

## What's real and working (don't rebuild)

| Capability | Where | Notes |
|---|---|---|
| Unified brain, one endpoint for text+voice | `routes/voice.py`, `agents/voice_agent.py` | |
| Deterministic date/time NLU (today/tomorrow/next Friday/in 2 days/5pm/etc) | `agents/schedule_engine.py` | Never LLM-guesses a date — regex + stdlib `datetime`/`zoneinfo`. Shared by voice AND the Quick Add text box (`routes/schedule.py`). |
| Ask instead of invent (missing time → question, not a guess) | `schedule_engine.ScheduleDraft.ambiguous` + `voice_agent._render_schedule_confirmation` | |
| Cross-turn slot-filling for that question | `agents/conversation_store.py` | New — see above |
| Tool-calling (read + limited write) | `agents/ai_tools.py`, `TOOL_SPECS` | OpenAI function-calling, 3-round loop in `VoiceAgent._respond` |
| RECALL: real user capture, source detection (LinkedIn/X/Instagram/Reddit), AI enrichment, follow-ups, timeline, Applications linking | `hustleos-backend/agents/recall_store.py`, `research_agent.py`, `strategy_agent.py`, `routes/recall.py`, `agents/recall_source.py` | No fake/seeded data — everything here is real persisted user data. Voice dictation + AI note-cleanup on capture (`RecallCaptureSheet.tsx`, `/api/recall/refine-note`). |
| Google Calendar OAuth (real, not stubbed) | `agents/calendar_client.py`, `agents/calendar_store.py`, `routes/integrations.py` | Needs `GOOGLE_CLIENT_ID`/`SECRET`/`REDIRECT_URI` in `.env` (already set locally) and the redirect URI registered + your test-user email added in Google Cloud Console (project `codelab-500113`) since the OAuth app is in Testing mode. |
| Personality (not a job-search bot) | `_SYSTEM_PROMPT` in `voice_agent.py` | Grounded-only, no hallucination, casual/Hinglish-tolerant tone per spec section 19. |
| Real per-user auth, Postgres everywhere (no more JSON files for Personal/RECALL/Home/Tasks/Scheduling) | `auth.py`, `db/migrations/001-005*.sql` | |

## Known SDK gotcha (already fixed, don't reintroduce)

`anthropic==0.7.0` (pinned in `requirements.txt`) **predates the Messages API entirely** — `client.messages.create` doesn't exist on that SDK version. Every place that used to call Anthropic (`VoiceAgent`, `PlannerAgent`, `schedule_engine`'s title-polish) was silently failing and falling back until this was found and fixed by switching to `OpenAI` (already proven working in this environment with the configured `OPENAI_API_KEY`). If you're tempted to use Claude for something here, either bump the `anthropic` package deliberately (check the `pydantic==1.10.13` pin — needed for `elevenlabs==0.2.24` — doesn't conflict with whatever version you pick) or just use OpenAI like everything else does.

## What's NOT built yet (the actual roadmap)

Ordered roughly by value/dependency, matching the product spec's phases 3-7:

1. **Mem0 long-term memory** — `memory_providers/mem0_provider.py` is a complete, working Mem0 REST client (`Mem0MemoryProvider`), reachable via `memory_providers.get_memory_provider()`. **It currently has zero callers** — RECALL used to use it for the old fake-prospect model and was moved off it during the RECALL rebuild (everything folded into `recall_items`/`recall_timeline_events` instead, since that's structured operational data per spec section 3A). What's missing: wiring it into the AI brain for spec section 3B's actual use case — meaningful long-term context (explicit preferences like "remind me 30 min before interviews", recurring patterns, important relationships) — NOT re-storing structured data that already lives in Postgres. Needs: (a) a decision point in `process_voice_command`/`_respond` about when something is memory-worthy (spec section 24 — dedupe, meaningful, not every message), (b) a new read tool (`search_memory`) added to `TOOL_SPECS`/`ai_tools.py`, (c) some write path — probably NOT a raw tool the LLM calls freely, more likely an explicit "remember this" user command plus a light heuristic for promoting an observed pattern, given spec section 9's distinction between EXPLICIT PREFERENCE and OBSERVED PATTERN and section 24's memory-quality-control requirement.

2. **Cross-context intelligence** — connecting RECALL item → Application → Follow-up so "what happened to that ABC job?" gives one synthesized answer (spec section 12/13/26). The data already supports this: `recall_items.related_application_id` links to `applications.id` (see `routes/recall.py`'s `mark_applied` endpoint). What's missing is a tool (e.g. `get_recall_thread(query)`) that resolves a RECALL item, follows the FK to its application, and returns both together for the model to synthesize from — plus maybe a similar link to timeline/calendar events for a full "everything about this thing" answer.

3. **"What am I forgetting?"** (spec section 7) — a new read tool that checks: overdue tasks, pending follow-ups (`recall_items.follow_up_at` in the past, not archived/completed — same query shape as `routes/voice.py`'s existing `follow_ups_due` computation, just needs to become a callable tool instead of only being in the context snapshot), applications with no recent activity, RECALL items with no status progression, interviews with no prep task. Every insight must cite the real row it came from — no synthetic "you seem busy" filler.

4. **Entity continuity beyond scheduling** (spec section 5) — "move that interview to Friday", "that job", "the recruiter". This is the hard one: needs an entity-resolution layer that can look at recent conversation turns + recently-touched RECALL/Application/timeline rows and disambiguate a pronoun/reference, asking when there are multiple plausible matches (spec: "never guess when ambiguity is significant"). The `conversation_state` table from this handover's slot-filling work could extend to hold "last referenced entity" (type + id), but the resolution logic itself doesn't exist yet.

5. **Personalization + proactive briefings** (spec sections 9, 21, 22, 27) — morning/evening/weekly briefs, adaptive prioritization with explainable reasoning, learned patterns. Nothing built here yet; this depends on (1) and (3) being in place first (briefings are really just "what am I forgetting" + "today's plan" + tone, run on a schedule instead of on-demand).

## Working conventions from this session (worth keeping)

- **Never fake it.** No hardcoded responses, no invented dates/times, no "done" when a write tool wasn't actually called or failed. Every response referencing app state must be grounded in a real query result. This was a hard requirement throughout and the whole codebase currently honors it — don't regress.
- **One migration file per logical change**, numbered sequentially in `db/migrations/`, idempotent (`create table if not exists`), applied directly against the live Supabase Postgres DB (there's no migration runner — check `hustleos-backend/.env`'s `DATABASE_URL`, connect with `psycopg2`, execute the `.sql` file). RLS enabled with zero policies on every table (service-role backend connection bypasses it; policies are a safety net only, per the convention established in `001_personal_schema.sql`'s comments).
- **Test against a throwaway server + throwaway signup, never the shared long-running instance.** Multiple sessions/tools may be working against this codebase at once; spin up `uvicorn app:app --port <unused>`, sign up a disposable test user, verify, then kill your instance. Don't restart the shared `:3000` process without checking nothing else has work in flight against it.
- **Read the current file before editing it.** This session and a concurrent one were both actively modifying shared files; several edits collided or needed re-reading mid-task. Don't trust a stale in-context copy of a shared file.

## Env vars needed (`hustleos-backend/.env`, gitignored — not in this repo)

`OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (unused now, see gotcha above), `ELEVENLABS_API_KEY`, `SARVAM_API_KEY`, `DATABASE_URL` (Supabase pooler), `JWT_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`/`GOOGLE_REDIRECT_URI`, `MEM0_API_KEY`. All currently set in the local `.env` — ask the user rather than regenerating any of them.
