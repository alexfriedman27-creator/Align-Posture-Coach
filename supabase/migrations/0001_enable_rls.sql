-- Row-Level Security for all synced tables.
--
-- Context: the app ships a PUBLIC anon key and every client writes its own
-- user_id / id into rows. RLS is therefore the ONLY server-side authorization
-- boundary. Every policy below scopes access to the caller's own auth.uid().
-- We intentionally use auth.uid() (verified server-side) rather than any
-- value from user_metadata (which end users can modify).
--
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Re-running is safe: policies are dropped-if-exists before recreation.

-- ─────────────────────────────────────────────────────────────────────────
-- Tables keyed by the auth UUID directly (PK `id` == auth.uid()).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.user_profile enable row level security;

drop policy if exists "user_profile_select_own" on public.user_profile;
create policy "user_profile_select_own" on public.user_profile
  for select using (auth.uid() = id);

drop policy if exists "user_profile_insert_own" on public.user_profile;
create policy "user_profile_insert_own" on public.user_profile
  for insert with check (auth.uid() = id);

drop policy if exists "user_profile_update_own" on public.user_profile;
create policy "user_profile_update_own" on public.user_profile
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "user_profile_delete_own" on public.user_profile;
create policy "user_profile_delete_own" on public.user_profile
  for delete using (auth.uid() = id);


alter table public.user_progress enable row level security;

drop policy if exists "user_progress_select_own" on public.user_progress;
create policy "user_progress_select_own" on public.user_progress
  for select using (auth.uid() = id);

drop policy if exists "user_progress_insert_own" on public.user_progress;
create policy "user_progress_insert_own" on public.user_progress
  for insert with check (auth.uid() = id);

drop policy if exists "user_progress_update_own" on public.user_progress;
create policy "user_progress_update_own" on public.user_progress
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "user_progress_delete_own" on public.user_progress;
create policy "user_progress_delete_own" on public.user_progress
  for delete using (auth.uid() = id);


-- ─────────────────────────────────────────────────────────────────────────
-- Tables keyed by a separate `user_id` column.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['daily_plans', 'module_sessions', 'badges', 'custom_exercises']
  loop
    execute format('alter table public.%I enable row level security;', t);

    execute format('drop policy if exists %I on public.%I;', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id);',
      t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id);',
      t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I;', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id);',
      t || '_delete_own', t);
  end loop;
end $$;


-- ─────────────────────────────────────────────────────────────────────────
-- Safety net: enable RLS on every other table in the public schema so a
-- forgotten/legacy table can never be world-readable via the anon key.
-- (A table with RLS on but no policy denies all access by default.)
-- Review the output and add per-user policies for any table listed.
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename not in (
        'user_profile', 'user_progress',
        'daily_plans', 'module_sessions', 'badges', 'custom_exercises'
      )
  loop
    execute format('alter table public.%I enable row level security;', r.tablename);
    raise notice 'RLS enabled with NO policies (deny-all) on: %', r.tablename;
  end loop;
end $$;
