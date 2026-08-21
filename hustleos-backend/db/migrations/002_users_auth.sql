-- HustleOS — real authentication (users table)
--
-- Replaces the single implicit DEFAULT_USER_ID = 'user_default' convention with real
-- accounts: name + unique email + bcrypt password hash. `profiles.user_id` (and every
-- other Personal-module table from 001_personal_schema.sql) stays a plain `text` column —
-- it now holds this table's `id::text` for real accounts instead of the literal string
-- 'user_default', so no existing schema changes are needed.
--
-- Idempotent: safe to run more than once.

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on users (email);

-- RLS — same closed-by-default stance as 001_personal_schema.sql: the backend connects
-- with the service role (bypasses RLS by design), so this only matters if this database
-- is ever exposed through Supabase's client-side PostgREST/JS API. No policies are
-- created on purpose — RLS enabled + zero policies means anon/authenticated PostgREST
-- roles get no access at all.

alter table users enable row level security;
