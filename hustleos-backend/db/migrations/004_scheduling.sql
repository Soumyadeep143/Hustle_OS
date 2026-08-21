-- HustleOS — Smart task/event scheduling for the Home TODAY timeline
--
-- Upgrades timeline_entries from free-text (`at`, `flag`) to real structured
-- scheduling: item type, a fixed priority scale, an actual resolved date/time
-- (nullable = unscheduled "Anytime" item), reminder preference, and calendar
-- sync bookkeeping. `at`/`tone`/`flag` stay as server-computed display fields
-- for backward compatibility — the new frontend positions/labels items from
-- scheduled_date/start_time/all_day directly, never from `at`.
--
-- Also adds calendar_connections for real (but optional) Google Calendar
-- OAuth — inert until GOOGLE_CLIENT_ID/SECRET are configured in .env.
--
-- The `tasks` table (FOCUS checklist) is a separate, simpler concept and is
-- intentionally untouched here.
--
-- Idempotent: safe to run more than once.

alter table timeline_entries
  add column if not exists item_type text not null default 'task'
    check (item_type in ('task', 'event', 'interview', 'follow_up', 'reminder', 'deadline')),
  add column if not exists priority text not null default 'none'
    check (priority in ('highest', 'high', 'medium', 'low', 'none')),
  add column if not exists scheduled_date date,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists all_day boolean not null default false,
  add column if not exists duration_minutes int,
  add column if not exists reminder_minutes_before int,
  add column if not exists timezone text,
  add column if not exists calendar_target text not null default 'none'
    check (calendar_target in ('none', 'google')),
  add column if not exists calendar_event_id text,
  add column if not exists calendar_synced_at timestamptz,
  add column if not exists notes text,
  add column if not exists original_phrase text,
  add column if not exists completed boolean not null default false,
  add column if not exists completed_at timestamptz;

-- Widen tone to one distinct value per priority level (highest -> blue,
-- high -> red, medium -> yellow, low -> green, none -> neutral).
alter table timeline_entries drop constraint if exists timeline_entries_tone_check;
alter table timeline_entries add constraint timeline_entries_tone_check
  check (tone in ('blue', 'red', 'yellow', 'green', 'neutral'));

-- Serves the Today timeline's actual query pattern: a user's items for a
-- given resolved date, plus the unscheduled/Anytime bucket (scheduled_date
-- is null) which always needs to be included regardless of date filter.
create index if not exists timeline_entries_user_date_idx
  on timeline_entries (user_id, scheduled_date);

-- ---------------------------------------------------------------------------
-- calendar_connections — one row per user with a linked Google Calendar
-- ---------------------------------------------------------------------------

create table if not exists calendar_connections (
  user_id text primary key,
  provider text not null default 'google' check (provider in ('google')),
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  scope text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table calendar_connections enable row level security;
-- No policies created on purpose — same closed-by-default stance as every
-- other table in this schema (service-role backend connection bypasses RLS
-- by design; this only matters if the DB is ever exposed via PostgREST).
