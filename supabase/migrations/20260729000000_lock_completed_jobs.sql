-- The app only ever checked client-side whether a job was already
-- "Completed & Evidenced" before allowing a resubmission - nothing in the
-- database stopped an update from overwriting locked evidence if the
-- client's local cache happened to be stale. This enforces the same rule
-- at the database layer: once a job is locked, only an admin can touch it
-- further - corrections go through Edit Job, not a resubmission.
--
-- RESTRICTIVE (rather than the default permissive) so it narrows what's
-- allowed on top of the existing org_isolation policy instead of being
-- OR'd with it. USING checks the row's status as it exists *before* this
-- update, not what it's being changed to - so an operative can still mark
-- a fresh job Completed & Evidenced for the first time; only a second
-- write against an already-locked row gets blocked.
create policy jobs_lock_completed on jobs
  as restrictive
  for update
  using (
    status <> 'Completed & Evidenced'
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (true);
