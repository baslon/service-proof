-- current_org() previously caused infinite recursion: it queries profiles
-- to look up the caller's organization, but profiles' own RLS policy calls
-- current_org() to decide what's visible — each evaluation re-triggered the
-- other, hitting Postgres's stack depth limit.
--
-- security definer runs the function's internal query as its owner (which
-- owns the tables and bypasses RLS), so looking up the caller's org no
-- longer re-evaluates the policy that depends on it.
create or replace function current_org() returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid()
$$;
