-- Schema step 1 of GPS/geofenced clock-in (docs/gps-geofencing-clock-in-scope.md).
-- Sites need coordinates before any geofence check means anything - address/
-- postcode alone (existing columns) can't be compared to a phone's GPS
-- reading.
--
-- cube/earthdistance rather than PostGIS: this repo's existing bias is
-- toward not adding infrastructure a requirement doesn't call for (the same
-- reasoning that picked pg_cron over a new service for scheduling). These
-- are both standard Postgres contrib extensions, available on Supabase
-- without any extra setup, and earth_distance()/ll_to_earth() is all a
-- fixed-radius proximity check needs.
create extension if not exists cube;
create extension if not exists earthdistance;

-- Null means "not yet geocoded" - the geofence check is skipped for that
-- site rather than blocking anything (same fallback bias used throughout
-- this schema for other missing-data cases). Existing sites need a one-time
-- backfill (scripts/backfill-site-coordinates.mjs); new sites geocode via
-- api/geocode.js at creation time, before create_site is called.
alter table sites
  add column latitude numeric,
  add column longitude numeric;

-- Adds two optional, trailing parameters to create_site, same pattern as
-- 20260816130000_create_job_schedule_params.sql did for create_job: CREATE
-- OR REPLACE adding parameters at the end, both defaulting to null, so the
-- existing call from AppContext.jsx's addSite (before this feature's
-- geocoding step lands there) is unaffected.
create or replace function create_site(
  p_organization_id uuid,
  p_client_id uuid,
  p_name text,
  p_address text,
  p_postcode text,
  p_site_contact text,
  p_phone text,
  p_access_notes text,
  p_latitude numeric default null,
  p_longitude numeric default null
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
    site_contact, phone, access_notes, latitude, longitude
  ) values (
    p_organization_id, new_display_id, p_client_id, p_name, p_address, p_postcode,
    p_site_contact, p_phone, p_access_notes, p_latitude, p_longitude
  )
  returning * into result;

  return result;
end;
$$;
