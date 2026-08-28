# Provaserve — Application Overview

What the app does today, as a single reference. Unlike the other docs in
this folder (which scope a feature *before* it's built), this one describes
what's actually live, as of 2026-08-28.

## What it is

A multi-tenant SaaS for cleaning companies to prove work happened: manage
sites and cleaning staff, generate and track jobs, capture photo/video
evidence, and report on completion to their own clients. Backend is
Supabase (Postgres + Auth + Storage); frontend is a React/Vite SPA on
Vercel, with a handful of Vercel serverless functions under `/api` for
anything that needs the service_role key (invites, billing, superadmin).

## Tenancy and roles

- **Organization** — a cleaning company, the tenant boundary. Every table is
  scoped to one via Postgres row-level security (`current_org()`).
- **Admin** — a manager at that organization. Full access to everything
  below except the Submit page's mobile evidence flow.
- **Operative** — a cleaner. Sees only their own assigned jobs, through the
  Submit page.
- **Superadmin** — cross-tenant, no organization of its own. A separate
  login flow (`/superadmin`) and its own set of `/api/superadmin/*`
  endpoints, entirely outside the normal admin/operative model.

## Entities

- **Client** — the cleaning company's own customer (a contract).
- **Site** — a physical location under a client.
- **Operative** — a cleaner, optionally scoped to specific clients (empty
  scope = eligible for all).
- **Job** — the actual unit of work: one visit, one status, one set of
  evidence. Created either directly (one-off) or generated from a Schedule.
- **Schedule / schedule_operatives / schedule_exceptions** — the recurring
  plan a Job can be generated from (see below).
- **Attendance event** — a clock-in or clock-out, self-reported by an
  operative.
- **Plan / subscription** — Stripe-backed billing tier, gating site and
  operative counts.

## Feature walkthrough

### Dashboard (admin)

The main job list across the whole organization: filterable by client,
site, and status, defaulting to the last 30 days (with an option to show
all time). Summary cards for each status, banners for Missing Evidence and
At Risk jobs, plan-limit warnings when nearing the site/operative cap.
Quick actions to add an operative or schedule a one-off job; click any job
to open Edit Job.

### Sites

Add, view, and delete sites. Each shows its job status breakdown and access
notes (with copy-to-clipboard for a cleaner on-site). Deletion is blocked
while any job still references the site.

### Clients

Add, view, and delete clients. Each shows a live completion-rate bar and
its site/job counts. Deletion is blocked while the client still has sites
or jobs.

### Operatives

Invite a cleaner (creates their login via a service-role endpoint, since
that needs privileges the browser never holds), resend an invite, toggle
active/inactive (controls assignability and login, not history), and scope
them to specific clients (or leave unrestricted). Desktop table / mobile
card views.

### Schedules — recurring job scheduling

The newest feature. Splits the standing plan from the day's actual job:

- A **Schedule** is a site + task + team (one or more operatives) + days of
  week + time + effective date range. Set up once, rarely touched again.
- A daily `pg_cron` job (`generate_job_instances()`, 3am) turns every active
  Schedule into real Jobs for a rolling 14-day window, one per
  (schedule, date, operative) — idempotent, so a re-run never duplicates.
- **Pause** stops future generation only; already-generated jobs are left
  alone. **End** does the same and also cancels this schedule's
  not-yet-visited pending jobs — the two are deliberately different, since
  pause is normally temporary.
- **Exceptions** cover or cancel a single date without touching the
  Schedule itself. If that date's job was already generated (the common
  case, given the 14-day window), the exception fixes it immediately rather
  than waiting for the next generation run.

Full design and the decisions behind it: [`recurring-scheduling-scope.md`](recurring-scheduling-scope.md).

### Attendance

A read-only log of clock-in/clock-out events, filterable by operative.
Operatives record these themselves from the Submit page; a database trigger
enforces that in/out always alternate correctly.

### Client report

A printable (browser print, not a generated file), date-ranged service
summary for one client or all of them: completion rate, a table of
evidenced jobs, and an exceptions list (Missing Evidence / At Risk, with
photo count and notes). Defaults to the current calendar month.

### Billing

Stripe-backed subscription management: current plan and usage against the
site/operative limits, a monthly/annual toggle, self-serve subscribe or
switch for standard tiers, "contact us" for enterprise. A superadmin can
also manually override an organization's limits independent of its plan.

### Submit (operative view)

A mobile-styled page, also usable by an admin as a preview. Shows the
operative's own assigned jobs — now sorted soonest-first and showing each
job's scheduled date/time, not just its position in a list. Clocking
in/out. Submitting proof: completion outcome (Completed / Completed with
issue / Unable to complete), required photo count enforced before a job can
be marked Completed, at least one photo required for At Risk, optional
video (never counts toward the photo requirement), and a required note.

### SuperAdmin

A separate portal, unreachable through normal login. Create organizations,
invite admins or operatives into any org, and manage each org's
site/operative limits (plan-controlled or manually overridden).

## Rules enforced at the database layer

These hold regardless of which path (UI, RPC, or a direct API call) is
used to reach them — the pattern throughout this schema is that a hard
rule lives in a trigger or RLS policy, not just app code:

- **Tenant isolation** — every table's RLS checks `organization_id` against
  the caller's own profile.
- **Atomic ID generation** — display IDs (`SP-0041`, `ST-01`, `CL-02`) are
  assigned inside a locked transaction, so two concurrent creates can never
  collide.
- **Sealed jobs are immutable** — once a job reaches Completed & Evidenced,
  nothing about it (status, assignment, notes, photos) can be changed by
  anyone, including an admin. Corrections happen by appending a new visit,
  not editing history.
- **A submitted job can't be deleted** — only a genuinely untouched one can,
  sealed or not.
- **Evidence thresholds** — Completed needs the full required photo count;
  At Risk needs at least one.
- **First-reported outcome is permanent** — `original_outcome` is set once
  and never overwritten, kept separate from any later resolution.
- **Operative eligibility** — unrestricted by default, narrowed only by an
  explicit client link.
- **Plan limits** — site and operative counts are capped per-organization
  via a trigger, closed against races the same way ID generation is.
- **Recurring generation is idempotent and exception-aware** — see
  Schedules above.

## Known gaps

- **Tender Evidence Pack** — scoped in
  [`tender-evidence-pack-scope.md`](tender-evidence-pack-scope.md) but not
  built. Would turn job/evidence data into an exportable pack for tender
  submissions.
- **No SLA target** — "missed job" is reportable today, but there's no
  contracted-response-time field to measure it against.
- **No document/attachment library** — method statements, insurance certs,
  accreditations, etc. have no home in the schema yet.
