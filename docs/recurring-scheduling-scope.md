# Recurring Job Scheduling — Module Scope

Status: scoping only, nothing built yet.

## Why

Managers currently create every operative's job by hand, every day. That
doesn't scale past a handful of sites. Source design:
[`provaserve-scheduling-design.md`](../../provaserve-scheduling-design.md)
(Downloads, not part of the repo) proposes splitting the standing plan
(**Schedule**) from the day's actual job (**Job Instance**), with a
background generator turning active Schedules into Job Instances, and
**Exception**s handling one-off changes without touching the plan.

## Fit against the current schema

Checked against the actual repo (`C:\Users\david\Projects\serviceproof`,
Supabase/Postgres, deployed as a static SPA on Vercel — `vercel.json` is
rewrites only, no serverless functions today).

- `organizations` → `clients` → `sites` → `jobs` (+ `job_photos`,
  `operatives`, `operative_clients`, `attendance_events`) already exists,
  RLS-scoped by `organization_id`, role-based policies throughout.
- `jobs` already carries almost everything the design's Job Instance needs:
  `status`, photos/videos, `notes`, `original_outcome` /
  `resolved_at` / `resolved_by` / `resolution_notes`, and DB-trigger-enforced
  immutability once a job reaches `Completed & Evidenced`
  (`20260729100000_seal_the_whole_record.sql`). Every hard business rule in
  this schema lives in a Postgres trigger or RPC, not just app code — the
  generation engine should follow that same pattern.
- Job creation goes through `create_job`, a single RPC that also
  atomically assigns `display_id` under a per-organization advisory lock
  (`20260729010000_atomic_display_id_generation.sql`).
- `jobs.recurrence` already exists as a free-text field
  (`One-off / Daily / Twice daily / Weekly / Monthly`, set in
  `ScheduleJobModal.jsx`) — but it's cosmetic. Nothing generates repeat jobs
  from it today.
- **No Schedule or Exception entity exists anywhere.** No cron / background
  execution surface exists anywhere either — no `pg_cron`, no Supabase Edge
  Function, no Vercel serverless function. The design's "a background
  process runs daily" needs new infrastructure, which the source doc doesn't
  address.
- No plan-tier gate keys off job volume today (only `site_limit` /
  `operative_limit`, see `20260729180000` / `20260729210000`), so schedule
  fan-out shouldn't collide with an existing limit — flagged as an open
  question below in case that's intended to change.

## Decisions made with the user for this scope

1. **Job Instance storage** — a Job Instance is a row in the existing
   `jobs` table with a new nullable `schedule_id`, not a separate table.
   Inherits all existing status/seal/evidence/RLS logic for free.
2. **Generation window** — rolling window (e.g. always N days ahead), not
   one-day-at-a-time, so managers can see and adjust upcoming jobs early —
   matches the tender-evidence use case. Exact N still open (see below).
3. **Scope of this pass** — includes manager-facing UI (Schedule
   create/edit/pause, Exception workflow), not just schema + engine.
4. **Generator hosting** — recommend a Postgres function
   (`generate_job_instances()`) invoked by Supabase `pg_cron`, not a new
   Vercel serverless function. No Edge Function needed unless a later
   requirement adds external side effects (e.g. notifications). This adds
   zero new hosting surface and matches the existing "rules live in
   Postgres" pattern already established in this codebase.
5. **Multi-operative schedules** — supported. A Schedule can list more than
   one operative (team coverage), via a `schedule_operatives` join table.
   Generation fans out to **one Job Instance per (schedule, date,
   operative)**, not one shared instance — `jobs.operative_id` is singular
   today, and evidence/sealing is inherently per-operative (whose photos are
   whose), so a "team schedule" is really N linked job instances sharing one
   `schedule_id`.
6. **`recurrence` field** — superseded by `schedule_id` for
   schedule-generated instances. The column stays as-is (unchanged) for true
   one-offs and legacy jobs; not populated redundantly going forward.
7. **Exception granularity** — an Exception can target a single operative
   on a team Schedule (e.g. one of three people off sick for a day, the
   other two still attend as normal), not just the whole Schedule for that
   date. `schedule_exceptions` needs an `operative_id` column
   (nullable — null means "whole schedule for that date", set means
   "just this operative").
8. **Pause/End behavior** — revised after discussion. Pause and End are not
   the same signal: pausing is normally temporary and expected to resume, so
   it behaves like *editing* a Schedule (item 2 above) — stop generating
   anything new, leave already-generated instances alone. Deleting them on
   pause would mean un-pausing doesn't actually restore them (the generator
   only runs once a day) and could silently drop a job a cleaner was already
   told about. **Ending** a Schedule means the plan is genuinely over, so
   its already-generated pending Job Instances are cancelled outright.
9. **One-off jobs vs. Exception** — the source design doc is internally
   inconsistent here: its Entities section lists "an extra one-off job" as
   an example of an Exception, but its "Handling change" section says a
   one-off job is created as "a single Job Instance directly, not tied to
   any Schedule" — bypassing Exception entirely. Recommended resolution:
   **Exception only ever attaches to an existing active Schedule + date**
   (cover, reassign, cancel, or an extra visit added under that schedule's
   site on a day it already runs). A true standalone one-off with no
   Schedule involved keeps using the current direct-Job-Instance flow
   (today's `ScheduleJobModal`), unchanged. This avoids Exception needing to
   handle a "no parent Schedule" case and leaves the existing one-off path
   untouched.

## Proposed schema

**`schedules`**
`id, organization_id, site_id, days_of_week (int[]/bitmask), start_time,
expected_duration_minutes, task_type, area, instructions, photos_required,
status (active/paused/ended), effective_start_date, effective_end_date
(nullable), created_by, created_at`

**`schedule_operatives`**
`schedule_id, operative_id` (composite PK) — the team case.

**`schedule_exceptions`**
`id, schedule_id, exception_date, operative_id (nullable — null applies to
the whole schedule for that date, set targets just one operative on a team
schedule), type (cover / reassign / cancel / extra),
replacement_operative_id (nullable), notes, created_by, created_at`

**`jobs`** (altered)
Add nullable `schedule_id` FK → `schedules.id`. No other changes.

## Generation engine

`generate_job_instances()`, a Postgres function run on a `pg_cron` schedule
(e.g. daily early morning). For each active Schedule within its effective
date range, for each date in the rolling window matching `days_of_week`,
for each linked operative:

1. Check `schedule_exceptions` for that (schedule, date[, operative]) —
   skip, reassign, or override before generating the default instance.
2. Check whether a Job Instance already exists for that
   (schedule, date, operative) — idempotent, no duplicates on re-run.
3. Insert, reusing (or generalizing) `create_job`'s display-id/advisory-lock
   logic so numbering stays race-free under a batched generator.
4. Stop generating once a Schedule is paused or past its end date.

Ending a Schedule (a separate action from generation, triggered by the
manager) also cancels any of that Schedule's already-generated Job Instances
that are still pending. Pausing does not — it only stops future generation,
same as editing.

## Manager UI (included in this pass per the user's answer)

- **Schedules** list/management screen — create, edit, pause/resume, end —
  mirroring the existing Sites/Operatives list+modal pattern.
- **Add/Edit Schedule** modal — site, team (operative multi-select), days of
  week, time, duration, task/checklist, photos required, effective date
  range.
- **Exception** UI — from a Schedule's upcoming generated instances (agenda
  or calendar view), let a manager cover/reassign/cancel a specific date, or
  add an extra visit under that schedule's site.
- Where "Schedules" lives in nav is an open question below.

## Suggested build order

1. Schema: `schedules`, `schedule_operatives`, `schedule_exceptions`,
   `jobs.schedule_id` + RLS policies matching the existing role-based
   pattern.
2. `generate_job_instances()` + `pg_cron` registration — tested for
   idempotency (run-twice-no-dupes) and exception precedence.
3. Schedule management UI (list + create/edit/pause modal).
4. Exception UI (cover/reassign/cancel/add-extra against a schedule+date).
5. No retroactive backfill: existing jobs with a `recurrence` value are
   **not** linked to a new Schedule after the fact — scheduling is
   going-forward only. (Evidence is sealed/immutable anyway, so historical
   reconstruction wouldn't be meaningful.)

## Open questions still needing input

1. **Rolling window length** — how many days ahead should stay generated?
   (Design doc suggested "e.g. 14 days" as an example, not a decision.)
2. **Nav placement** — new top-level "Schedules" page alongside
   Sites/Operatives/Clients, or nested under Sites?
3. **Plan-tier gating** — should number of active Schedules (or generated
   job volume) be gated by plan tier, matching the existing
   site-limit/operative-limit pattern? Nothing gates job volume today.
4. **Timezone** — `jobs.scheduled_time` is deliberately wall-clock, not
   timezone-shifted (`20260729030000_wall_clock_job_times.sql`). Does
   `days_of_week` + `start_time` generation need any timezone awareness, or
   is everything single-timezone-per-organization as it is today?
