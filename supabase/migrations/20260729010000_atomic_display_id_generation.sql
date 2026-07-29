-- nextId() on the client computed the next display_id (e.g. "SP-0041") from
-- whatever jobs/sites/clients happened to be cached locally, then inserted
-- separately. Two concurrent creates in the same organization could compute
-- the same "next" number before either had committed, and the second insert
-- would fail on the unique(organization_id, display_id) constraint.
--
-- Moving the whole "compute next number, then insert" sequence into a single
-- database function closes the race: pg_advisory_xact_lock serializes
-- concurrent callers for the same organization+entity, and the lock is held
-- for the function's entire transaction, not just the read.
--
-- security invoker (the default) is deliberate here, not an oversight - RLS
-- on the underlying table still applies to the insert inside the function,
-- so a caller still can't write into an organization they don't belong to.

create or replace function create_client(
  p_organization_id uuid,
  p_name text,
  p_sector text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_contract_start_date date,
  p_notes text
) returns clients
language plpgsql
as $$
declare
  next_num int;
  new_display_id text;
  result clients;
begin
  perform pg_advisory_xact_lock(hashtext('clients:' || p_organization_id::text));

  select coalesce(max(substring(display_id from 4)::int), 0) + 1
  into next_num
  from clients
  where organization_id = p_organization_id;

  new_display_id := 'CL-' || lpad(next_num::text, 2, '0');

  insert into clients (
    organization_id, display_id, name, sector, contact_name, contact_email,
    contact_phone, contract_start_date, notes
  ) values (
    p_organization_id, new_display_id, p_name, p_sector, p_contact_name, p_contact_email,
    p_contact_phone, p_contract_start_date, p_notes
  )
  returning * into result;

  return result;
end;
$$;

create or replace function create_site(
  p_organization_id uuid,
  p_client_id uuid,
  p_name text,
  p_address text,
  p_postcode text,
  p_site_contact text,
  p_phone text,
  p_access_notes text
) returns sites
language plpgsql
as $$
declare
  next_num int;
  new_display_id text;
  result sites;
begin
  perform pg_advisory_xact_lock(hashtext('sites:' || p_organization_id::text));

  select coalesce(max(substring(display_id from 4)::int), 0) + 1
  into next_num
  from sites
  where organization_id = p_organization_id;

  new_display_id := 'ST-' || lpad(next_num::text, 2, '0');

  insert into sites (
    organization_id, display_id, client_id, name, address, postcode,
    site_contact, phone, access_notes
  ) values (
    p_organization_id, new_display_id, p_client_id, p_name, p_address, p_postcode,
    p_site_contact, p_phone, p_access_notes
  )
  returning * into result;

  return result;
end;
$$;

create or replace function create_job(
  p_organization_id uuid,
  p_client_id uuid,
  p_site_id uuid,
  p_task_type text,
  p_area text,
  p_instructions text,
  p_recurrence text,
  p_scheduled_time timestamptz,
  p_operative_id uuid,
  p_photos_required int,
  p_notes text
) returns jobs
language plpgsql
as $$
declare
  next_num int;
  new_display_id text;
  result jobs;
begin
  perform pg_advisory_xact_lock(hashtext('jobs:' || p_organization_id::text));

  select coalesce(max(substring(display_id from 4)::int), 0) + 1
  into next_num
  from jobs
  where organization_id = p_organization_id;

  new_display_id := 'SP-' || lpad(next_num::text, 4, '0');

  insert into jobs (
    organization_id, display_id, client_id, site_id, task_type, area,
    instructions, recurrence, scheduled_time, operative_id, photos_required,
    status, notes
  ) values (
    p_organization_id, new_display_id, p_client_id, p_site_id, p_task_type, p_area,
    p_instructions, p_recurrence, p_scheduled_time, p_operative_id, p_photos_required,
    'Incomplete', p_notes
  )
  returning * into result;

  return result;
end;
$$;

revoke execute on function create_client from public;
revoke execute on function create_site from public;
revoke execute on function create_job from public;
grant execute on function create_client to authenticated;
grant execute on function create_site to authenticated;
grant execute on function create_job to authenticated;
