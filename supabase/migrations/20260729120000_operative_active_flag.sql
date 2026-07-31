-- Deactivating an operative needs to be non-destructive: jobs.operative_id
-- points at this row forever, including on sealed jobs that can never be
-- edited again, so the row itself must never be deleted. A boolean flag
-- keeps every historical job's attribution intact regardless of whether the
-- operative still works there.
--
-- The flag on its own only controls whether someone is offered as an
-- assignee for new work - it does not touch their ability to log in. That
-- is handled separately in api/set-operative-active.js via Supabase Auth's
-- ban mechanism, which is a property of the auth user, not of this row.
alter table operatives
  add column active boolean not null default true;
