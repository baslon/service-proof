-- Registers the actual "run daily" part. 3am is arbitrary but deliberate -
-- before UK working hours, so the day's/week's newly generated jobs are
-- already sitting there by the time any manager opens the app.
--
-- cron.schedule() upserts by job name, so re-running this migration (e.g.
-- pasted twice by accident) updates the existing schedule rather than
-- creating a second one.
select cron.schedule(
  'generate-job-instances',
  '0 3 * * *',
  $$ select generate_job_instances(); $$
);
