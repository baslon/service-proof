-- Adds two optional, trailing parameters to create_job so the generator
-- (next migration) can create Job Instances through the exact same
-- function every other job already goes through - same atomic display_id
-- generation under the same per-organization advisory lock
-- (20260729010000_atomic_display_id_generation.sql), no separate insert
-- path to keep in sync. Both default to null, so the existing call from
-- AppContext.jsx's addJob (which never passes them) is unaffected - this is
-- CREATE OR REPLACE adding parameters at the end, not changing an existing
-- one, so unlike 20260729030000_wall_clock_job_times.sql this doesn't need
-- a drop first.
--
-- recurrence stays null for schedule-generated instances (superseded by
-- schedule_id - docs/recurring-scheduling-scope.md, decision 6); it's still
-- available for true one-off jobs, which pass schedule_id/occurrence_date
-- as null and keep populating recurrence exactly as they do today.
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
  p_notes text,
  p_schedule_id uuid default null,
  p_schedule_occurrence_date date default null
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
    status, notes, schedule_id, schedule_occurrence_date
  ) values (
    p_organization_id, new_display_id, p_client_id, p_site_id, p_task_type, p_area,
    p_instructions, p_recurrence, p_scheduled_time, p_operative_id, p_photos_required,
    'Incomplete', p_notes, p_schedule_id, p_schedule_occurrence_date
  )
  returning * into result;

  return result;
end;
$$;
