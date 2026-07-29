-- scheduled_time/submitted_time were timestamptz (timezone-aware), which
-- silently misinterpreted "wall clock time at the site" as a literal UTC
-- instant on write (the app never actually attached a real timezone), then
-- just reprinted that same assumption on read. For a cleaning schedule,
-- "6am" should mean a fixed wall-clock time at the site regardless of who's
-- viewing it or what DST currently applies - not a UTC instant that shifts
-- relative to the viewer. Switching to a plain timestamp (no timezone)
-- removes the ambiguity outright instead of layering on real timezone
-- conversion for a distinction this domain doesn't actually need.
--
-- AT TIME ZONE 'UTC' recovers the original literal wall-clock value for
-- existing rows, since every prior write was made under exactly that
-- (incorrect but internally consistent) assumption.
alter table jobs
  alter column scheduled_time type timestamp using scheduled_time at time zone 'UTC',
  alter column submitted_time type timestamp using submitted_time at time zone 'UTC';

-- create_job's scheduled_time parameter has to match the column's new type.
-- CREATE OR REPLACE can't change a parameter type in place - it would just
-- create a second overloaded version - so the old signature is dropped first.
drop function if exists create_job(uuid, uuid, uuid, text, text, text, text, timestamptz, uuid, int, text);

create or replace function create_job(
  p_organization_id uuid,
  p_client_id uuid,
  p_site_id uuid,
  p_task_type text,
  p_area text,
  p_instructions text,
  p_recurrence text,
  p_scheduled_time timestamp,
  p_operative_id uuid,
  p_photos_required int,
  p_notes text
) returns jobs
language plpgsql
as $$
declare
  next_num int;
  new_display_id text;
  result jobs;
begin
  perform pg_advisory_xact_lock(hashtext('jobs:' || p_organization_id::text));

  select coalesce(max(substring(display_id from 4)::int), 0) + 1
  into next_num
  from jobs
  where organization_id = p_organization_id;

  new_display_id := 'SP-' || lpad(next_num::text, 4, '0');

  insert into jobs (
    organization_id, display_id, client_id, site_id, task_type, area,
    instructions, recurrence, scheduled_time, operative_id, photos_required,
    status, notes
  ) values (
    p_organization_id, new_display_id, p_client_id, p_site_id, p_task_type, p_area,
    p_instructions, p_recurrence, p_scheduled_time, p_operative_id, p_photos_required,
    'Incomplete', p_notes
  )
  returning * into result;

  return result;
end;
$$;

revoke execute on function create_job from public;
grant execute on function create_job to authenticated;
