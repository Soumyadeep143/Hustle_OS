-- HustleOS — conversation history column on conversation_state
--
-- Adds the `history` jsonb column that conversation_store.py's
-- append_turn() / get_history() methods read and write.
-- Without this column every get_history() silently returns [] and
-- every append_turn() rolls back silently — the agent has no memory
-- of anything said earlier in the same session.
--
-- Format stored: [{role, content}, ...] ordered oldest-first,
-- trimmed to the last _MAX_HISTORY_TURNS * 2 messages on each write
-- so the blob never grows unbounded.
--
-- Idempotent: safe to run more than once.

alter table conversation_state
  add column if not exists history jsonb not null default '[]'::jsonb;
