-- Every operative was available for every job in the organisation, with no
-- way to say "this person only works Client X's sites" or "this person can
-- cover Client Y as well as their usual client." A join table represents
-- that: zero rows for an operative means unrestricted (today's behaviour,
-- so nobody becomes unassignable just because nobody got around to linking
-- them yet), one or more rows narrows them to exactly those clients.
--
-- No organization_id column here, matching job_photos - membership is
-- proven by joining to a table that already carries it, rather than
-- duplicating a value that could in principle drift from the operative or
-- client it's supposed to describe.
create table operative_clients (
  operative_id uuid not null references operatives(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  primary key (operative_id, client_id)
);

alter table operative_clients enable row level security;

create policy operative_clients_select on operative_clients
  for select using (
    exists (select 1 from operatives op where op.id = operative_id and op.organization_id = current_org())
  );

-- Unlike operatives itself, this table has no auth.users entanglement - an
-- admin linking or unlinking a client is a plain data write, so it can go
-- through ordinary RLS-checked policies from the browser rather than a
-- serverless endpoint. Both sides of the link are checked against
-- current_org() independently, so an admin can never link one of their own
-- operatives to another organisation's client, or vice versa.
create policy operative_clients_insert on operative_clients
  for insert with check (
    is_admin()
    and exists (select 1 from operatives op where op.id = operative_id and op.organization_id = current_org())
    and exists (select 1 from clients c where c.id = client_id and c.organization_id = current_org())
  );

create policy operative_clients_delete on operative_clients
  for delete using (
    is_admin()
    and exists (select 1 from operatives op where op.id = operative_id and op.organization_id = current_org())
  );
