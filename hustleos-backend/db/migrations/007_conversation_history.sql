-- HustleOS — conversation history for real multi-turn context
--
-- Stores the last N (user, assistant) exchanges so VoiceAgent's chat path
-- sees actual conversational history instead of treating every message as
-- an isolated one-shot query. Written/read by
-- agents/conversation_store.py's append_turn() / get_history(). Trimmed
-- server-side on every write so the JSONB blob never grows unbounded.
--
-- Idempotent: safe to run more than once.

alter table conversation_state
  add column if not exists history jsonb not null default '[]'::jsonb;
