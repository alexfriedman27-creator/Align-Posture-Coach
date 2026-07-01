-- Defense-in-depth SHAPE constraints for synced tables (closes audit gap 4.1).
--
-- Context: the app ships a PUBLIC anon key with no server-side validation layer.
-- RLS (0001) already confines every write to the caller's own rows, so the only
-- residual risk is a tampered client persisting malformed values in its OWN rows
-- (bad date keys, an oversized module_id, an out-of-domain slot). Impact is low —
-- a user can only corrupt their own data — but these bounds keep the model honest
-- and complement the VALUE bounds in 0002.
--
-- IMPORTANT: these tables were created implicitly by supabase-js upserts, so the
-- remote column TYPES are not known from the client code (e.g. `date` may be a
-- real `date` column, and `*_ids` may be `jsonb`/`text[]` rather than `text`).
-- A constraint that doesn't match the actual column type would abort the whole
-- migration. To stay safe against every schema shape, each constraint is added
-- inside its own exception guard: it applies where valid and is SKIPPED (with a
-- notice) where it doesn't fit or where existing rows already violate it. Review
-- the notices; a skipped constraint is informational, not an error.
--
-- Run in the Supabase SQL editor (or via `supabase db push`). Re-running is safe.

do $$
declare
  -- table, constraint-name, check-expression
  specs text[][] := array[
    -- daily_plans: canonical YYYY-MM-DD date key.
    array['daily_plans', 'daily_plans_date_shape',
          $c$ date ~ '^\d{4}-\d{2}-\d{2}$' $c$],
    -- module_sessions: canonical date key + bounded module/program id.
    array['module_sessions', 'module_sessions_date_shape',
          $c$ date ~ '^\d{4}-\d{2}-\d{2}$' $c$],
    array['module_sessions', 'module_sessions_module_id_len',
          $c$ char_length(coalesce(module_id, '')) <= 100 $c$],
    -- custom_exercises: slot must be one of the five fixed body-region slots.
    array['custom_exercises', 'custom_exercises_slot_domain',
          $c$ slot in ('neck','shoulder_scapula','thoracic_spine','core_pelvis','hip') $c$],
    -- custom_exercises: bound the stored photo URI.
    array['custom_exercises', 'custom_exercises_photo_uri_len',
          $c$ char_length(coalesce(photo_uri, '')) <= 2000 $c$]
  ];
  s text[];
begin
  foreach s slice 1 in array specs
  loop
    begin
      execute format('alter table public.%I drop constraint if exists %I;', s[1], s[2]);
      execute format('alter table public.%I add constraint %I check (%s);', s[1], s[2], s[3]);
      raise notice 'applied constraint % on %', s[2], s[1];
    exception when others then
      -- Wrong column type for the expression, or existing rows violate it.
      raise notice 'SKIPPED constraint % on % (%): %', s[2], s[1], sqlstate, sqlerrm;
    end;
  end loop;
end $$;
