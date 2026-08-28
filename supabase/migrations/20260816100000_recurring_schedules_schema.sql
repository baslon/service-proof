-- Recurring job scheduling: the standing plan ("Sarah cleans Riverside
-- Office Mon/Wed/Fri 6am"), kept separate from the day's actual job. See
-- docs/recurring-scheduling-scope.md for the full design.
--
-- A Job Instance is deliberately just a row in the existing jobs table
-- (schedule_id below), not a parallel table - jobs already carries every
-- field a Job Instance needs (status, photos, notes, resolution fields) and
-- the seal/evidence rules already enforced on it should cover generated
-- jobs for free, with no separate lifecycle to keep in sync.

create type schedule_status as enum ('active', 'paused', 'ended');

create table schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  client_id uuid not null references clients(id) on delete restrict,
  site_id uuid not null references sites(id) on delete restrict,
  task_type text not null,
  area text,
  instructions text,
  photos_required int not null default 6,
  -- 0 = Sunday .. 6 = Saturday, matching JS Date.getDay() so the frontend
  -- can pass/read this array with no conversion layer.
  days_of_week smallint[] not null,
  start_time time not null,
  expected_duration_minutes int,
  status schedule_status not null default 'active',
  effective_start_date date not null default current_date,
  effective_end_date date,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (effective_end_date is null or effective_end_date >= effective_start_date),
  check (array_length(days_of_week, 1) > 0 and days_of_week <@ array[0,1,2,3,4,5,6]::smallint[])
);

-- Team coverage: a Schedule can list more than one operative for the same
-- site/day/time. Generation fans this out to one Job Instance per
-- (schedule, date, operative) - jobs.operative_id is singular and evidence
-- is inherently per-person, so a "team schedule" is really several linked
-- job instances sharing one schedule_id, not one shared instance.
create table schedule_operatives (
  schedule_id uuid not null references schedules(id) on delete cascade,
  operative_id uuid not null references operatives(id) on delete cascade,
  primary key (schedule_id, operative_id)
);

-- A change to a single date without touching the master Schedule: cover for
-- a sick operative, or cancel a visit outright. Deliberately does NOT cover
-- "extra one-off job" - that stays a direct, unlinked job created the same
-- way it is today (see docs/recurring-scheduling-scope.md, decision 9);
-- Exception only ever modifies a date the Schedule already governs.
--
-- operative_id null means "applies to the whole schedule on this date"
-- (only meaningful for cancel - a cover with no specific person to replace
-- doesn't resolve cleanly on a team schedule, so cover always names who
-- it's covering for). Set means "just this one operative's slot."
create type schedule_exception_type as enum ('cover', 'cancel');

create table schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules(id) on delete cascade,
  exception_date date not null,
  operative_id uuid references operatives(id),
  type schedule_exception_type not null,
  replacement_operative_id uuid references operatives(id),
  notes text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  check (type <> 'cover' or operative_id is not null),
  check (type = 'cover' or replacement_operative_id is null)
);

-- Postgres treats every NULL as distinct, so a plain unique constraint on
-- (schedule_id, exception_date, operative_id) would silently allow multiple
-- "whole schedule" cancellations to stack up for the same date. Normalizing
-- NULL to a sentinel UUID inside the index makes "whole schedule" a single
-- comparable value like any real operative_id, closing that gap.
create unique index schedule_exceptions_one_per_slot
  on schedule_exceptions (
    schedule_id,
    exception_date,
    coalesce(operative_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- schedule_id links a Job Instance back to the Schedule that produced it
-- (null for one-off jobs, exactly as today). schedule_occurrence_date is
-- the calendar date within the schedule's cycle this instance represents -
-- kept separate from scheduled_time (which already encodes date + time)
-- because the generator needs a cheap, exact key to check "have I already
-- made this one" without reparsing a timestamp, and because a cover
-- reassignment changes who scheduled_time's job belongs to but not which
-- occurrence it is.
alter table jobs
  add column schedule_id uuid references schedules(id) on delete restrict,
  add column schedule_occurrence_date date,
  add constraint jobs_schedule_occurrence_date_pairing
    check ((schedule_id is null) = (schedule_occurrence_date is null));

-- The actual "don't create duplicates if it runs twice" guarantee. The
-- generator checks for an existing row before inserting (the normal-case
-- path, avoids raising on every rerun), and this index is the backstop that
-- makes a duplicate impossible even if two generation runs ever overlap -
-- the same belt-and-suspenders pattern as the advisory lock + limit check
-- in enforce_site_limit() (20260729180000_org_wide_site_limit.sql).
create unique index jobs_schedule_occurrence_unique
  on jobs (schedule_id, schedule_occurrence_date, operative_id)
  where schedule_id is not null;
