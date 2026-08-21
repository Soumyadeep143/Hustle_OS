# API contract — screen by screen

Base URL: `import.meta.env.VITE_API_URL ?? 'http://localhost:3000'`, all routes under `/api`.
FastAPI app: `hustleos-backend/app.py` (CORS already allows :5173).

## Already exists — wire these first
| UI | Endpoint | Use |
| --- | --- | --- |
| Home FOCUS list, brief counts | `GET /api/dashboard?user_id=` | `priorities[]` → tasks, `followups_due`, `execution_score`, `metrics{}` |
| Work · Applications | `GET /api/memory?user_id=` | `applications[]` → company, role, status→chip, match_score, applied_at, last_followup→"No reply · N days" |
| Home SIGNALS | `GET /api/memory` | `insights[]` (first two) |
| Profile identity | `GET /api/memory` | `user_profile{name,email,target_role,target_location,skills}` |
| Capture "Add opportunity" | `POST /api/opportunities/discover {role,location}` | `opportunities[]` with `score` |
| Application follow-up draft | `POST /api/opportunities/apply {opportunity_id,user_id}` | `email_draft`, `waiting_approval` → approval UI |
| Voice transcription | `POST /api/voice/transcribe` (multipart `file`) | `{text,intent}` → headline transcript |
| Voice / AI answer | `POST /api/voice/command {transcript,user_id}` | `{response,audio_url}` |
| Voice playback | `POST /api/voice/tts?text=` | `{audio_url}` → `new Audio(url).play()` |

Status → chip mapping: `interview`→`INTERVIEW` (blue), `reviewing`→`REVIEWING` (yellow),
`applied`→`APPLIED` (neutral); if `applied` and `last_followup` older than 5 days →`STALE` (red).

## Must be added — the redesign shows screens the API doesn't serve yet
Add as new routers in `hustleos-backend/routes/` and register them in `routes/__init__.py`
(`create_router()`). `code/recall_router.py` is a working stub for the first group.

### Tasks — `routes/tasks.py`
- `GET /api/tasks?user_id=` → `[{id,title,meta,due_at,priority:'high'|'normal',done}]`
- `PATCH /api/tasks/{id}` `{done}` → updated task (drives the optimistic check)
- `POST /api/tasks` `{title,due_at,priority}` → created task (Quick Capture "Create task")

### Brief — `routes/brief.py`
- `GET /api/brief?user_id=` → `{generated_at, headline, action_count, highest_priority, followups_due, deadlines_near, plan_prompt}`
  Build it from `PlannerAgent.generate_daily_plan` + `MemoryAgent.get_user_context`; no new agent.

### Timeline — `routes/timeline.py`
- `GET /api/timeline/today?user_id=` → `[{at,title,subtitle,tone:'blue'|'red'|'neutral',flag}]`
  Merge calendar events, task due times and follow-up deadlines server-side so the client only renders.

### RECALL — `routes/recall.py`
- `GET /api/recall/summary` → `{high_intent, actions_today, meetings, positive_signals}`
- `GET /api/recall/prospects` → `[{id,name,role,company,intent,score,score_delta}]`
- `GET /api/recall/prospects/{id}` → adds `{next_best_action:{action,why}, memory:[{text,source,date,confidence}], timeline:[{when,text,tone}]}`
  `memory[]` should come from `MemoryAgent` — human-readable sentences, never raw vectors.
- `POST /api/recall/prospects/{id}/execute` → **SSE / `text/event-stream`**, one event per agent:
  `{"agent":"research","status":"done","detail":"context gathered"}` … final
  `{"agent":"execution","status":"done","detail":"sent"}`. The UI's four-step chain is a literal
  view of this stream — if SSE is inconvenient, poll `GET /api/recall/runs/{run_id}` every 500ms.

### Capture — `routes/capture.py`
- `POST /api/capture/parse` `{url|text}` → `{kind:'job'|'event'|'hackathon'|'article'|'repo'|'form', title, org, location, deadline, category, confidence, fields[], source_url}`
  Stream or return staged progress so the four-step processing UI reflects real work:
  `extracting → categorizing → dates → memory`. Reuse `OpportunityAgent` + `MemoryAgent`.
- `POST /api/capture/commit` `{kind, payload}` → creates the task / application / event / memory
  and returns the created entity so the client can insert it at the top of the list.

### Team + Enterprise — `routes/workspaces.py`
- `GET /api/team/{team_id}/sprint` → `{name, percent, done, total, blocked:[{task,owner}], members:[{name,role,status}], recommendation:{text,actions[]}}`
- `GET /api/org/health` → `{execution_health, delta, projects_at_risk, critical_blockers, teams_overloaded, shipped_this_month, insights:[{text,tone}]}`

### Integrations — `routes/integrations.py`
- `GET /api/integrations` → `[{key,name,connected,last_sync}]`
- `POST /api/integrations/{key}/connect` → OAuth start URL

## Conventions
- Every list endpoint returns `[]` not `null`; the UI has empty states.
- Errors: `{detail}` with a real status code (the current routes swallow exceptions into empty
  200s — keep that for compatibility if you must, but the client treats `detail` as an error).
- Send ISO 8601 timestamps; format for display on the client (mono `3:00 PM`, `TUE 18 AUG`).
- Colors are never sent by the API. The API sends `tone`/`status`/`intent` enums; the client maps
  them to blue / yellow / red. This keeps the semantic palette in one place.
