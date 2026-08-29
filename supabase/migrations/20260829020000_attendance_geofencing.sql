-- Schema step 2 of GPS/geofenced clock-in (docs/gps-geofencing-clock-in-scope.md):
-- the per-organization kill switch, the location columns on
-- attendance_events, and the RPC that replaces AppContext.jsx's direct
-- insert into that table.

-- Decision 6 in the scope doc: a superadmin lever, not a plan gate (decision
-- 5 already made this available on every tier). Defaults true so existing
-- organizations get the feature the moment this ships, not silently opted
-- out.
alter table organizations
  add column geofencing_enabled boolean not null default true;

-- null = no coordinates available to check on either side (no device
-- location, or none of the operative's sites for today are geocoded yet).
-- true/false = actually checked against the nearest of the operative's
-- sites for today.
alter table attendance_events
  add column latitude numeric,
  add column longitude numeric,
  add column accuracy_meters numeric,
  add column within_geofence boolean;

-- Replaces the direct `insert into attendance_events` in AppContext.jsx's
-- clockIn/clockOut. Not security definer - it runs as the calling
-- operative under the existing attendance_events_insert RLS policy and the
-- existing enforce_attendance_alternation trigger fires exactly as it does
-- today, since triggers fire regardless of insert path. This function only
-- adds the location write and the distance calculation on top.
--
-- Deliberately checks against "today" specifically via scheduled_time::date
-- = current_date, not Submit.jsx's own myJobs query - that list
-- intentionally shows the operative's whole rolling window of actionable
-- jobs (up to 14 days out, since a Schedule generates in that batch size),
-- so reusing it here would geofence against sites the operative isn't
-- visiting until next week and defeat the point of the check.
--
-- 150m radius (decision 3): absorbs typical GPS drift (often 20-50m, worse
-- indoors) plus a moderately large facility footprint. Fixed constant for
-- v1, not per-organization configurable.
create or replace function record_attendance_event(
  p_event_type text,
  p_lat numeric default null,
  p_lng numeric default null,
  p_accuracy numeric default null
) returns attendance_events
language plpgsql
as $$
declare
  v_org_id uuid := current_org();
  v_operative_id uuid := current_operative();
  v_geofencing_enabled boolean;
  v_min_distance_meters numeric;
  v_within boolean;
  result attendance_events;
begin
  if v_operative_id is null then
    raise exception 'Only operatives can record attendance.' using errcode = 'insufficient_privilege';
  end if;

  select geofencing_enabled into v_geofencing_enabled
  from organizations where id = v_org_id;

  if v_geofencing_enabled and p_lat is not null and p_lng is not null then
    select min(earth_distance(ll_to_earth(p_lat, p_lng), ll_to_earth(s.latitude, s.longitude)))
    into v_min_distance_meters
    from jobs j
    join sites s on s.id = j.site_id
    where j.operative_id = v_operative_id
      and j.scheduled_time::date = current_date
      and s.latitude is not null
      and s.longitude is not null;

    if v_min_distance_meters is not null then
      v_within := v_min_distance_meters <= 150;
    end if;
  end if;

  insert into attendance_events (
    organization_id, operative_id, event_type, latitude, longitude, accuracy_meters, within_geofence
  ) values (
    v_org_id, v_operative_id, p_event_type, p_lat, p_lng, p_accuracy, v_within
  )
  returning * into result;

  return result;
end;
$$;

revoke execute on function record_attendance_event from public;
grant execute on function record_attendance_event to authenticated;
