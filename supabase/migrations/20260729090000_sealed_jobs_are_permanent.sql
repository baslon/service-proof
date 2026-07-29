-- jobs_lock_completed froze the contents of a Completed & Evidenced job,
-- but jobs_delete only ever checked is_admin() - so an admin could delete a
-- sealed job outright, evidence and photos with it. We locked editing the
-- evidence and left removing it wide open.
--
-- Blocking the delete on its own would not have been enough. Admins are
-- exempt from jobs_lock_completed, so the two-step of reopening a sealed
-- job and then deleting it would have reached the same place. Making the
-- seal one-way is what turns "sealed" into a promise rather than a
-- speed bump.
--
-- The cost, stated plainly: an admin can no longer reopen an evidenced job
-- at all. Correcting its notes, assignee or instructions still works - only
-- the status is frozen. A job scheduled in error is still deletable right
-- up until the moment it is evidenced.

drop policy jobs_delete on jobs;

create policy jobs_delete on jobs
  for delete
  using (
    organization_id = current_org()
    and is_admin()
    and status <> 'Completed & Evidenced'
  );

-- A policy can't express this: USING sees only the old row and WITH CHECK
-- only the new one, so "if it was sealed it must stay sealed" needs both
-- rows at once. A trigger is the natural place for a transition rule.
create or replace function prevent_unsealing_job() returns trigger
language plpgsql
as $$
begin
  if old.status = 'Completed & Evidenced' and new.status is distinct from old.status then
    raise exception 'Job % is Completed & Evidenced and cannot be reopened.', old.display_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger jobs_no_unseal
  before update on jobs
  for each row execute function prevent_unsealing_job();
