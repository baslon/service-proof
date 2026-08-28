-- RLS for the new scheduling tables, mirroring the existing pattern:
-- everyone in the organization can read (an operative's job is meaningless
-- without knowing the plan behind it), but only admins create/edit/remove
-- Schedules, team assignments, and Exceptions - scheduling stays an admin
-- action, same as Sites and Clients (20260729060000_role_based_rls.sql).

alter table schedules enable row level security;

create policy schedules_select on schedules
  for select using (organization_id = current_org());
create policy schedules_insert on schedules
  for insert with check (organization_id = current_org() and is_admin());
create policy schedules_update on schedules
  for update using (organization_id = current_org() and is_admin())
  with check (organization_id = current_org() and is_admin());
create policy schedules_delete on schedules
  for delete using (organization_id = current_org() and is_admin());

alter table schedule_operatives enable row level security;

create policy schedule_operatives_select on schedule_operatives
  for select using (
    exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  );
create policy schedule_operatives_insert on schedule_operatives
  for insert with check (
    is_admin()
    and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
    and exists (select 1 from operatives o where o.id = operative_id and o.organization_id = current_org())
  );
create policy schedule_operatives_delete on schedule_operatives
  for delete using (
    is_admin() and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  );

alter table schedule_exceptions enable row level security;

create policy schedule_exceptions_select on schedule_exceptions
  for select using (
    exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  );
create policy schedule_exceptions_insert on schedule_exceptions
  for insert with check (
    is_admin()
    and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
    and (operative_id is null or exists (select 1 from operatives o where o.id = operative_id and o.organization_id = current_org()))
    and (replacement_operative_id is null or exists (select 1 from operatives o where o.id = replacement_operative_id and o.organization_id = current_org()))
  );
create policy schedule_exceptions_update on schedule_exceptions
  for update using (
    is_admin() and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  )
  with check (
    is_admin() and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  );
create policy schedule_exceptions_delete on schedule_exceptions
  for delete using (
    is_admin() and exists (select 1 from schedules s where s.id = schedule_id and s.organization_id = current_org())
  );
