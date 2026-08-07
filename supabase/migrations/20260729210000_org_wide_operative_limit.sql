-- Lets a superadmin cap how many operatives an organization can have in
-- total, mirroring site_limit exactly: null means unlimited, which is
-- what every existing organization gets by default.
alter table organizations add column operative_limit integer;

-- Counts only active operatives - a deactivated former employee doesn't
-- permanently occupy a seat, the same way seat-based billing works
-- everywhere else. A freshly invited operative defaults to active = true
-- immediately (before they've even confirmed their account), so a pending
-- invite already counts the moment it's sent - otherwise an org could
-- dodge the cap by sending unlimited unconfirmed invites.
--
-- operatives has no client-writable insert policy at all today - every
-- row is created through a service-role-keyed serverless endpoint, which
-- bypasses RLS - but enforcing the cap here rather than only inside those
-- endpoints means a future insert path can't accidentally skip the check.
-- Takes the same per-organization advisory lock pattern as site_limit, to
-- close the race window for two concurrent invites both trying to squeeze
-- in under the limit at once.
create or replace function enforce_operative_limit() returns trigger
language plpgsql
as $$
declare
  v_limit integer;
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('operatives:' || new.organization_id::text));

  select operative_limit into v_limit from organizations where id = new.organization_id;

  if v_limit is not null then
    select count(*) into v_count from operatives where organization_id = new.organization_id and active = true;

    if v_count >= v_limit then
      raise exception 'This organization has reached its limit of % operative(s).', v_limit
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger operatives_enforce_limit
  before insert on operatives
  for each row execute function enforce_operative_limit();
