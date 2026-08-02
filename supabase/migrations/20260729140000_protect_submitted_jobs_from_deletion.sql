-- jobs_delete only ever checked status <> 'Completed & Evidenced', so an At
-- Risk or Missing Evidence job - one an operative actually visited and
-- reported on, usually with a note and sometimes photos - was still freely
-- deletable. That is a real record of an incident, not a schedule slot.
-- Deleting it erases the fact that the company ever knew about a problem,
-- with nothing left behind - a bigger gap than anything the sealed-job
-- work closed earlier, since the incentive to make a problem disappear is
-- strongest exactly when something went wrong.
--
-- The dividing line moves from "is this sealed" to "has this ever been
-- submitted". submitted_time is set once by submitProof and is never
-- cleared afterwards, including if an admin later resets status back to
-- Incomplete via Edit Job - so it survives exactly the case a status check
-- alone would miss.
--
-- The original status check stays alongside it rather than being replaced:
-- an admin can seal a job directly through Edit Job (add photos, then set
-- status to Completed & Evidenced) without ever going through submitProof,
-- and that path never sets submitted_time. Checking submitted_time alone
-- would have reopened deletion for that specific sealed-but-never-submitted
-- case. Together the two conditions are strictly more restrictive than
-- before, never less.
drop policy jobs_delete on jobs;

create policy jobs_delete on jobs
  for delete using (
    organization_id = current_org()
    and is_admin()
    and status <> 'Completed & Evidenced'
    and submitted_time is null
  );
