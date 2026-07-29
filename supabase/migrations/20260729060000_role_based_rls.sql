-- Every tenant-scoped table had a single org_isolation policy covering all
-- commands, so "admin" vs "operative" existed only in the UI. Any operative
-- could point a REST client at their own session token and delete a client,
-- reschedule someone else's job, or - worst - promote themselves with
-- `update profiles set role = 'admin'`, which also handed them the admin
-- exemption in jobs_lock_completed and unlocked completed jobs.
--
-- Separately, jobs_lock_completed froze the jobs row but nothing froze
-- job_photos, so the photos a sealed job points to could still be deleted
-- or swapped. The row was immutable; the thing that made it proof was not.
--
-- Both are the same underlying gap - a rule the app assumes but the
-- database never enforced - so both are closed here, with per-command
-- policies replacing the blanket ones.

-- security definer so these can be called from inside policies without the
-- profiles lookup recursing back through profiles' own RLS, exactly as
-- current_org() already does.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

-- Which operative the caller is, if any. Null for admins, which is why
-- every use below pairs it with an is_admin() branch rather than relying
-- on it alone (`operative_id = null` is null, never true).
create or replace function current_operative() returns uuid
language sql stable security definer set search_path = public
as $$ select operative_id from profiles where id = auth.uid() $$;

-- organizations, profiles and operatives are read-only to the browser.
-- Every write to them already goes through a service_role serverless
-- function (invites, superadmin provisioning), which bypasses RLS
-- entirely - so there is no legitimate client-side write to permit, and
-- allowing none is what stops profiles.role from being self-edited.
drop policy org_isolation on organizations;
create policy organizations_select on organizations
  for select using (id = current_org());

drop policy org_isolation on profiles;
create policy profiles_select on profiles
  for select using (organization_id = current_org());

drop policy org_isolation on operatives;
create policy operatives_select on operatives
  for select using (organization_id = current_org());

-- Clients and sites are admin-managed. Operatives still need to read them
-- (a job is meaningless without its site name), but never to change them.
drop policy org_isolation on clients;
create policy clients_select on clients
  for select using (organization_id = current_org());
create policy clients_insert on clients
  for insert with check (organization_id = current_org() and is_admin());
create policy clients_update on clients
  for update using (organization_id = current_org() and is_admin())
  with check (organization_id = current_org() and is_admin());
create policy clients_delete on clients
  for delete using (organization_id = current_org() and is_admin());

drop policy org_isolation on sites;
create policy sites_select on sites
  for select using (organization_id = current_org());
create policy sites_insert on sites
  for insert with check (organization_id = current_org() and is_admin());
create policy sites_update on sites
  for update using (organization_id = current_org() and is_admin())
  with check (organization_id = current_org() and is_admin());
create policy sites_delete on sites
  for delete using (organization_id = current_org() and is_admin());

-- Jobs are the one table operatives legitimately write to, but only the
-- ones assigned to them, and only to submit proof - scheduling and
-- deleting stay with admins. The with check mirrors the using clause so an
-- operative can't hand a job to someone else (or take one) on the way past.
--
-- The existing jobs_lock_completed restrictive policy still ANDs on top of
-- this and is left untouched.
drop policy org_isolation on jobs;
create policy jobs_select on jobs
  for select using (organization_id = current_org());
create policy jobs_insert on jobs
  for insert with check (organization_id = current_org() and is_admin());
create policy jobs_update on jobs
  for update
  using (
    organization_id = current_org()
    and (is_admin() or operative_id = current_operative())
  )
  with check (
    organization_id = current_org()
    and (is_admin() or operative_id = current_operative())
  );
create policy jobs_delete on jobs
  for delete using (organization_id = current_org() and is_admin());

-- Finding #2: evidence for a sealed job is now sealed with it. Photo writes
-- require the parent job to be one the caller may write to AND not already
-- Completed & Evidenced - the same admin exemption as jobs_lock_completed,
-- so corrections still go through an admin rather than being impossible.
--
-- Note this makes write order significant: evidence has to be inserted
-- while the job is still open, then the job sealed. submitProof in
-- AppContext.jsx does exactly that.
drop policy org_isolation on job_photos;
create policy job_photos_select on job_photos
  for select using (
    job_id in (select id from jobs where organization_id = current_org())
  );
create policy job_photos_insert on job_photos
  for insert with check (
    job_id in (
      select id from jobs
      where organization_id = current_org()
        and (is_admin() or operative_id = current_operative())
        and (is_admin() or status <> 'Completed & Evidenced')
    )
  );
create policy job_photos_delete on job_photos
  for delete using (
    job_id in (
      select id from jobs
      where organization_id = current_org()
        and (is_admin() or operative_id = current_operative())
        and (is_admin() or status <> 'Completed & Evidenced')
    )
  );
