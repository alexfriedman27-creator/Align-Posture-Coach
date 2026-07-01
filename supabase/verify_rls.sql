-- Read-only RLS verification. Paste into the Supabase SQL editor and run.
-- Confirms migration 0001 is actually applied to the live project (audit item 2.1).
-- Nothing here writes data; safe to run anytime.

-- 1) Every table in the public schema + whether RLS is ON, and how many
--    policies it has. Anything with rls_enabled = false, OR rls_enabled = true
--    with policy_count = 0 on a table you expect to be readable, is a red flag.
select
  c.relname                                   as table_name,
  c.relrowsecurity                            as rls_enabled,
  count(p.polname)                            as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relkind = 'r'
group by c.relname, c.relrowsecurity
order by rls_enabled, table_name;

-- 2) The synced tables MUST show rls_enabled = true. This flags any that don't.
select tablename, 'RLS NOT ENABLED — FIX' as problem
from pg_tables
where schemaname = 'public'
  and tablename in ('user_profile','user_progress','daily_plans',
                    'module_sessions','badges','custom_exercises')
  and not rowsecurity;

-- 3) Full policy dump: command, USING (read filter) and WITH CHECK (write filter).
--    Confirm every synced table has select/insert/update/delete, and that
--    insert/update rows show a with_check referencing auth.uid().
select
  tablename,
  policyname,
  cmd,
  qual         as using_expr,
  with_check   as with_check_expr
from pg_policies
where schemaname = 'public'
order by tablename, cmd;

-- 4) Sanity: no policy should rely on user_metadata for identity (item 2.4).
--    This returns rows only if something is wrong.
select tablename, policyname, cmd, 'uses user_metadata — FIX' as problem
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') ilike '%user_metadata%'
       or coalesce(with_check,'') ilike '%user_metadata%');
