-- HustleOS — entity continuity columns on conversation_state
--
-- Adds last_entity_type / last_entity_id / last_entity_label so the
-- assistant can resolve pronouns ("it", "that one", "the Google job")
-- across turns without the user repeating the full name.
--
-- Written by agents/conversation_store.py's save_last_entity().
-- Read by agents/voice_agent.py before the tool-calling loop.
-- See HANDOVER.md §Roadmap 4 for full context.
--
-- Idempotent: safe to run more than once.

alter table conversation_state
  add column if not exists last_entity_type  text,
  add column if not exists last_entity_id    text,
  add column if not exists last_entity_label text;
