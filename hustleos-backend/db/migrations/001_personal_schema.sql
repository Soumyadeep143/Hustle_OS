-- HustleOS — Personal module schema (Supabase / Postgres)
--
-- Scope: everything the "Personal" side of HustleOS owns today, currently split
-- across three flat JSON files:
--   memory.json        -> profiles, applications, captures   (agents/memory_agent.py)
--   tasks_state.json    -> tasks                              (agents/task_store.py)
--   home_state.json     -> timeline_entries, signals, briefs  (agents/home_store.py)
--
-- Out of scope (unchanged, still JSON-backed, own migration later if ever needed):
-- RECALL (recall_state.json), Team (team_state.json), Workspaces/org (workspace_state.json),
-- Integrations (integrations_state.json).
--
-- This app has no real auth/multi-tenant system (single implicit user everywhere,
-- DEFAULT_USER_ID = 'user_default' in the FastAPI backend) — every table is scoped by a
-- plain `user_id text` column matching that existing convention, not a Supabase
-- auth.users uuid. RLS is enabled per Supabase convention, but since the backend talks to
-- Postgres directly with the service role (not through the client-side PostgREST API),
-- these policies are a safety net for if that ever changes, not active access control today.
--
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles — one row per user_id (agents/memory_agent.py's user_profile)
-- ---------------------------------------------------------------------------

create table if not exists profiles (
  user_id text primary key default 'user_default',
  name text not null default '',
  email text not null default '',
  target_role text not null default '',
  target_location text not null default '',
  skills text[] not null default '{}',
  bio text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- applications — job applications (agents/memory_agent.py's applications[])
-- ---------------------------------------------------------------------------

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'user_default',
  company text not null,
  role text not null,
  status text not null default 'applied' check (status in ('applied', 'reviewing', 'interview', 'captured')),
  match_score int not null default 0 check (match_score between 0 and 100),
  description text not null default '',
  applied_at date not null default current_date,
  last_followup date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists applications_user_id_idx on applications (user_id);
create index if not exists applications_status_idx on applications (user_id, status);

-- ---------------------------------------------------------------------------
-- captures — Quick Capture items that aren't an application or a RECALL
-- prospect: event / article / repo / note (agents/memory_agent.py's captures[])
-- ---------------------------------------------------------------------------

create table if not exists captures (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'user_default',
  kind text not null check (kind in ('event', 'article', 'repo', 'note')),
  title text not null,
  org text not null default '',
  location text,
  deadline text,
  category text,
  source_url text,
  created_at timestamptz not null default now()
);

create index if not exists captures_user_id_idx on captures (user_id);

-- ---------------------------------------------------------------------------
-- tasks — Home/Work FOCUS list (agents/task_store.py)
-- ---------------------------------------------------------------------------

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'user_default',
  title text not null,
  meta text not null default 'Today',
  due_at text,
  priority text not null default 'normal' check (priority in ('high', 'normal')),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on tasks (user_id);

-- ---------------------------------------------------------------------------
-- timeline_entries — Home TODAY section (agents/home_store.py)
-- ---------------------------------------------------------------------------

create table if not exists timeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'user_default',
  at text not null default 'Today',
  title text not null,
  subtitle text,
  tone text not null default 'neutral' check (tone in ('blue', 'red', 'neutral')),
  flag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists timeline_entries_user_id_idx on timeline_entries (user_id);

-- ---------------------------------------------------------------------------
-- signals — Home SIGNALS section (agents/home_store.py)
-- ---------------------------------------------------------------------------

create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'user_default',
  text text not null,
  tag text not null default 'RECOMMENDATION',
  tone text not null default 'yellow' check (tone in ('blue', 'red', 'yellow', 'neutral')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists signals_user_id_idx on signals (user_id);

-- ---------------------------------------------------------------------------
-- briefs — Home AI Brief headline, one row per user_id (agents/home_store.py)
-- ---------------------------------------------------------------------------

create table if not exists briefs (
  user_id text primary key default 'user_default',
  headline text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- seed_flags — replaces the JSON stores' embedded "have we auto-seeded this
-- user yet" booleans (tasks_state.json's implicit has_tasks, home_state.json's
-- timeline_seeded/signals_seeded). One row per (user_id, flag_name) once seeded.
-- ---------------------------------------------------------------------------

create table if not exists seed_flags (
  user_id text not null default 'user_default',
  flag_name text not null check (flag_name in ('tasks', 'timeline', 'signals')),
  seeded_at timestamptz not null default now(),
  primary key (user_id, flag_name)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — enabled per Supabase convention. The backend connects
-- with the service role (bypasses RLS by design), so these policies matter
-- only if this database is ever exposed through Supabase's client-side
-- PostgREST/JS API. There's no real per-user auth in this app yet (every
-- table is scoped by a free-text user_id, not auth.uid()), so this is a
-- closed-by-default stance, not real per-user isolation — tighten these once
-- real auth exists.
-- ---------------------------------------------------------------------------

alter table profiles enable row level security;
alter table applications enable row level security;
alter table captures enable row level security;
alter table tasks enable row level security;
alter table timeline_entries enable row level security;
alter table signals enable row level security;
alter table briefs enable row level security;
alter table seed_flags enable row level security;

-- No policies are created here on purpose: with RLS enabled and zero policies,
-- every table is inaccessible via the anon/authenticated PostgREST roles by
-- default, while the service-role connection the backend uses is unaffected.
