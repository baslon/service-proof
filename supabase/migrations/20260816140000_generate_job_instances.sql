-- The generator. Turns active Schedules into Job Instances for a rolling
-- window ahead of today (14 days by default -
-- docs/recurring-scheduling-scope.md, decision 1). Meant to be called only
-- by pg_cron (next migration), never by the browser - it processes every
-- organization at once, so it is deliberately not granted to authenticated
-- (see revoke at the bottom). A user-facing equivalent would need to be
-- scoped to current_org() first; this one isn't, on purpose.
--
-- For each active schedule, each date in the window matching days_of_week,
-- each operative on that schedule's roster:
--   1. Look up an Exception for that (schedule, date), preferring one
--      that names this specific operative over one that applies to the
--      whole schedule (schedule_exceptions_one_per_slot in the schema
--      migration already guarantees at most one of each kind exists).
--   2. 'cancel' -> skip, no instance created.
--      'cover'  -> create the instance for replacement_operative_id
--                  instead of the roster operative.
--      no exception -> create it for the roster operative as normal.
--   3. Skip if that exact (schedule, date, final operative) already has a
--      job - the "don't create duplicates if it runs twice" rule.
create or replace function generate_job_instances(p_days_ahead int default 14)
returns void
language plpgsql
as $$
declare
  v_schedule record;
  v_operative_id uuid;
  v_occurrence_date date;
  v_dow smallint;
  v_final_operative_id uuid;
  v_exception schedule_exceptions%rowtype;
  v_window_end date := current_date + p_days_ahead;
begin
  for v_schedule in
    select * from schedules
    where status = 'active'
      and effective_start_date <= v_window_end
      and (effective_end_date is null or effective_end_date >= current_date)
  loop
    for v_occurrence_date in
      select d::date
      from generate_series(
        greatest(v_schedule.effective_start_date, current_date),
        least(coalesce(v_schedule.effective_end_date, v_window_end), v_window_end),
        interval '1 day'
      ) as d
    loop
      v_dow := extract(dow from v_occurrence_date);
      if v_dow = any(v_schedule.days_of_week) then
        for v_operative_id in
          select operative_id from schedule_operatives where schedule_id = v_schedule.id
        loop
          select * into v_exception
          from schedule_exceptions
          where schedule_id = v_schedule.id
            and exception_date = v_occurrence_date
            and (operative_id = v_operative_id or operative_id is null)
          order by operative_id nulls last
          limit 1;

          if v_exception.type = 'cancel' then
            continue;
          elsif v_exception.type = 'cover' then
            v_final_operative_id := v_exception.replacement_operative_id;
          else
            v_final_operative_id := v_operative_id;
          end if;

          if exists (
            select 1 from jobs
            where schedule_id = v_schedule.id
              and schedule_occurrence_date = v_occurrence_date
              and operative_id = v_final_operative_id
          ) then
            continue;
          end if;

          perform create_job(
            p_organization_id => v_schedule.organization_id,
            p_client_id => v_schedule.client_id,
            p_site_id => v_schedule.site_id,
            p_task_type => v_schedule.task_type,
            p_area => v_schedule.area,
            p_instructions => coalesce(v_schedule.instructions, ''),
            p_recurrence => null,
            p_scheduled_time => v_occurrence_date + v_schedule.start_time,
            p_operative_id => v_final_operative_id,
            p_photos_required => v_schedule.photos_required,
            p_notes => null,
            p_schedule_id => v_schedule.id,
            p_schedule_occurrence_date => v_occurrence_date
          );
        end loop;
      end if;
    end loop;
  end loop;
end;
$$;

revoke execute on function generate_job_instances from public;
