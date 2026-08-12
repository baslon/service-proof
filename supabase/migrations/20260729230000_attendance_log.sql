-- A simple, append-only clock-in/clock-out log per operative. Deliberately
-- not tied to Supabase Auth session login/logout: a Supabase session can
-- stay valid for days without a fresh sign-in, so hooking this to
-- authentication would record almost nothing. Clocking in and out are
-- instead explicit actions on the Submit page, independent of auth state.
create table attendance_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  operative_id uuid not null references operatives(id),
  event_type text not null check (event_type in ('clock_in', 'clock_out')),
  -- Stamped by the database, not accepted from the client - the point of a
  -- timesheet log is that it can't be backdated or fudged from a device
  -- with a wrong clock.
  occurred_at timestamptz not null default now()
);

alter table attendance_events enable row level security;

create policy attendance_events_select on attendance_events
  for select using (
    organization_id = current_org()
    and (is_admin() or operative_id = current_operative())
  );

create policy attendance_events_insert on attendance_events
  for insert with check (
    organization_id = current_org()
    and operative_id = current_operative()
  );

-- No update or delete policy at all - like submitted evidence elsewhere in
-- this schema, a timesheet entry that could be quietly edited or removed
-- after the fact isn't a record of anything.

-- Keeps clock_in/clock_out strictly alternating per operative, so "the
-- latest event" is always enough to know whether someone is currently
-- clocked in - no separate status column to keep in sync, and it closes
-- the double-tap/retry race that would otherwise log two clock-ins in a row.
create or replace function enforce_attendance_alternation() returns trigger
language plpgsql
as $$
declare
  v_last_type text;
begin
  select event_type into v_last_type
  from attendance_events
  where operative_id = new.operative_id
  order by occurred_at desc
  limit 1;

  if new.event_type = 'clock_in' and v_last_type = 'clock_in' then
    raise exception 'Already clocked in.' using errcode = 'check_violation';
  end if;

  if new.event_type = 'clock_out' and (v_last_type is null or v_last_type = 'clock_out') then
    raise exception 'Not currently clocked in.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger attendance_events_enforce_alternation
  before insert on attendance_events
  for each row execute function enforce_attendance_alternation();
