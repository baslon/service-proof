-- Pause and End are different signals, not two names for the same thing.
-- Pausing is normally temporary (a site's inaccessible for a week, a
-- contract's under review, an operative's on leave) and expected to
-- resume - so it behaves like editing a Schedule (decision 2 in
-- docs/recurring-scheduling-scope.md): stop generating anything new, but
-- leave whatever's already generated alone. Deleting those on pause would
-- mean un-pausing doesn't actually restore them (the generator only runs
-- once a day), and would silently drop jobs a cleaner may already have been
-- told about.
--
-- Ending means the plan is genuinely over, with no resumption expected, so
-- its pending Job Instances are cancelled outright.
--
-- "Cancelled" isn't a new job_status - a not-yet-visited generated instance
-- is just 'Incomplete' with no submitted_time, exactly the set of jobs
-- jobs_delete already permits an admin to remove
-- (20260729140000_protect_submitted_jobs_from_deletion.sql). Deleting those
-- rows reuses that existing rule instead of adding a status value the rest
-- of the app (StatusBadge, Dashboard, Report.jsx) would need to learn to
-- render. A job that's already in progress, submitted, or sealed is left
-- untouched either way - the visit already happened or is happening.
create or replace function cancel_pending_instances_on_schedule_end() returns trigger
language plpgsql
as $$
begin
  if new.status = 'ended' and old.status <> 'ended' then
    delete from jobs
    where schedule_id = new.id
      and status = 'Incomplete'
      and submitted_time is null;
  end if;
  return new;
end;
$$;

create trigger schedules_cancel_pending_on_end
  after update on schedules
  for each row execute function cancel_pending_instances_on_schedule_end();
