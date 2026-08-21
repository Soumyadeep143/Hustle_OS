-- HustleOS — RECALL schema (Supabase / Postgres)
--
-- Replaces recall_state.json's flat "prospects"/"companies" GTM-sales model
-- (lead_score, intent, relationship, next_best_action) with a general
-- user-captured-item model: RECALL is a personal capture/memory/follow-up
-- system, not a sales pipeline. See recall_schemas.py / recall_store.py.
--
-- Follows the same conventions as 001_personal_schema.sql: user_id text
-- (matching the JWT subject from auth.py, not a Supabase auth.users uuid),
-- RLS enabled with zero policies (the backend connects with the service
-- role and bypasses RLS; these policies are a safety net only).
--
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- recall_items — one row per user-captured link/note (agents/recall_store.py)
-- ---------------------------------------------------------------------------

create table if not exists recall_items (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,

  url text,
  source text not null default 'other' check (source in ('linkedin', 'x', 'instagram', 'reddit', 'other')),

  title text not null,
  description text not null default '',
  notes text not null default '',
  ai_summary text,

  category text not null default 'Other',
  subcategory text,
  tags text[] not null default '{}',

  status text not null default 'saved' check (status in (
    'saved', 'interested', 'applied', 'following_up', 'interview',
    'responded', 'opportunity', 'completed', 'archived'
  )),
  priority text check (priority in ('low', 'medium', 'high')),

  company text,
  person text,
  location text,
  event_date text,

  follow_up_at date,
  follow_up_note text,

  related_application_id uuid references applications (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recall_items_user_id_idx on recall_items (user_id);
create index if not exists recall_items_user_status_idx on recall_items (user_id, status);
create index if not exists recall_items_user_followup_idx on recall_items (user_id, follow_up_at);

-- ---------------------------------------------------------------------------
-- recall_timeline_events — real, backend-timestamped event log per item
-- ---------------------------------------------------------------------------

create table if not exists recall_timeline_events (
  id uuid primary key default gen_random_uuid(),
  recall_item_id uuid not null references recall_items (id) on delete cascade,
  user_id text not null,

  event_type text not null check (event_type in (
    'CAPTURED', 'UPDATED', 'CATEGORIZED', 'APPLICATION_CREATED',
    'MARKED_APPLIED', 'FOLLOW_UP_CREATED', 'FOLLOW_UP_COMPLETED',
    'NOTE_ADDED', 'STATUS_CHANGED', 'ARCHIVED'
  )),
  label text not null,
  detail text,

  created_at timestamptz not null default now()
);

create index if not exists recall_timeline_events_item_idx on recall_timeline_events (recall_item_id, created_at);

-- ---------------------------------------------------------------------------
-- Row Level Security — see 001_personal_schema.sql for the full rationale.
-- No policies on purpose: RLS-enabled + zero policies blocks the anon/
-- authenticated PostgREST roles by default; the service-role connection
-- this backend uses is unaffected.
-- ---------------------------------------------------------------------------

alter table recall_items enable row level security;
alter table recall_timeline_events enable row level security;
