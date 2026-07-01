-- Defense-in-depth value constraints for the synced tables.
--
-- Context: the app ships a PUBLIC anon key. RLS (migration 0001) already scopes
-- every row to its owner's auth.uid(), so a user can only write their OWN rows.
-- These CHECK constraints add the second half of the story: bounding the VALUES
-- a user can store, so a tampered client can't persist negative or absurd stats
-- (e.g. total_xp = 999999999) or oversized text blobs. Impact of skipping this
-- is low (a user can only cheat their own numbers), but the constraints are cheap
-- and keep the data model honest.
--
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- Re-running is safe: each constraint is dropped-if-exists before recreation.

-- ─────────────────────────────────────────────────────────────────────────
-- user_progress: all counters are non-negative; sane upper bounds.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_progress
  drop constraint if exists user_progress_bounds;
alter table public.user_progress
  add constraint user_progress_bounds check (
    total_xp        >= 0
    and level       between 1 and 100
    and streak_days between 0 and 100000
    and longest_streak between 0 and 100000
    and total_sessions >= 0
    and total_minutes  >= 0
  );

-- ─────────────────────────────────────────────────────────────────────────
-- user_profile: bound free-text fields and reminder time.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_profile
  drop constraint if exists user_profile_bounds;
alter table public.user_profile
  add constraint user_profile_bounds check (
    char_length(coalesce(name, '')) <= 200
    and char_length(coalesce(username, '')) <= 200
    and reminder_hour   between 0 and 23
    and reminder_minute between 0 and 59
  );

-- ─────────────────────────────────────────────────────────────────────────
-- daily_plans / module_sessions: non-negative XP and duration.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.daily_plans
  drop constraint if exists daily_plans_bounds;
alter table public.daily_plans
  add constraint daily_plans_bounds check (xp_earned >= 0);

alter table public.module_sessions
  drop constraint if exists module_sessions_bounds;
alter table public.module_sessions
  add constraint module_sessions_bounds check (
    xp_earned >= 0 and duration_seconds >= 0
  );

-- ─────────────────────────────────────────────────────────────────────────
-- custom_exercises: bound free-text fields and duration.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.custom_exercises
  drop constraint if exists custom_exercises_bounds;
alter table public.custom_exercises
  add constraint custom_exercises_bounds check (
    char_length(coalesce(name, '')) <= 200
    and char_length(coalesce(description, '')) <= 2000
    and duration_seconds between 0 and 86400
  );
