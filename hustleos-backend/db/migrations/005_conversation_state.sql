-- HustleOS — conversational working memory (Supabase / Postgres)
--
-- Backs the "AI superbrain" spec's Conversational Working Memory layer:
-- when the assistant asks a focused follow-up question ("What time is the
-- interview?"), this table remembers what was pending so the NEXT message
-- ("5 PM") can complete it instead of the user having to resend the whole
-- request. See agents/conversation_store.py.
--
-- One row per user_id (a single pending slot at a time is enough for the
-- scheduling clarification case this backs today — extensible to other
-- pending_type values later without a schema change, since the payload is
-- jsonb).
--
-- Idempotent: safe to run more than once.

create table if not exists conversation_state (
  user_id text primary key,
  pending_type text,
  pending_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table conversation_state enable row level security;
