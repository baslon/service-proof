-- Lets a superadmin cap how many sites an organization can have in total -
-- shared across every admin on that org, not a separate allowance per
-- person. Null means unlimited, which is what every existing organization
-- gets by default, so nothing changes until a superadmin sets one.
alter table organizations add column site_limit integer;

-- Sites can be created two ways: through create_site() (what the app
-- actually calls), or in principle through a direct insert if RLS allows
-- it. Enforcing the cap here, as a trigger on the table itself, means it
-- holds regardless of which path is used - the same reasoning behind
-- every other hard rule in this schema (evidence requirements, sealed
-- jobs, resolution guards) living in a trigger rather than only in
-- application code.
--
-- Takes the same per-organization advisory lock create_site() already
-- uses for display_id generation. Advisory locks are reentrant within a
-- transaction, so this is a no-op when create_site() already holds it,
-- and it's what actually closes the race window for two concurrent
-- inserts that bypass the RPC and try to squeeze in over the limit
-- at the same time.
create or replace function enforce_site_limit() returns trigger
language plpgsql
as $$
declare
  v_limit integer;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('sites:' || new.organization_id::text));

  select site_limit into v_limit from organizations where id = new.organization_id;

  if v_limit is not null then
    select count(*) into v_count from sites where organization_id = new.organization_id;
    if v_count >= v_limit then
      raise exception 'This organization has reached its limit of % site(s).', v_limit
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger sites_enforce_limit
  before insert on sites
  for each row execute function enforce_site_limit();
