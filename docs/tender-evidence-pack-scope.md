# Tender Evidence Pack — Module Scope

Status: scoping only, nothing built yet.

## Why

UK cleaning tenders score bidders on quality (method statements, supervision, QA),
price, and social value — social value alone is now often worth 10%+ of the score.
Evaluators specifically reward specific, measurable evidence over generic claims.
Provaserve's job data already proves exactly the kind of thing evaluators are
scoring for ("Quality Control & Performance Management" / "past performance"):
completion rates, photo evidence, issue resolution times, SLA adherence. No
competitor currently turns this into a one-click export — it's the differentiator.

The pack has two halves with very different build profiles:

- **Module A — Performance Data Export Engine.** Auto-generated from job data.
  This is the unique part only Provaserve can build well. Build first.
- **Module B — Document Attachment Library.** Static documents the cleaning
  company already holds (method statement, insurance, accreditations, etc).
  Pure storage, no generation logic. Build second.
- **Module C — Pack Assembler.** Combines A + B into one exportable bundle.
  Build last.

## What the schema already gives us

Checked against the actual repo (`C:\Users\david\Projects\serviceproof`,
Supabase/Postgres backend). This resolved most of the open questions from the
first pass of this scope:

- **Buyer/contract grouping already exists.** `organizations` → `clients` →
  `sites` → `jobs` → `job_photos`. `clients` *is* the buyer/contract level —
  no schema addition needed for the multi-site rollup to group by buyer.
- **Missed-job / lateness data is there.** `jobs.scheduled_time` and
  `jobs.submitted_time` are wall-clock timestamps (deliberately not
  timezone-shifted — see `20260729030000_wall_clock_job_times.sql`), so
  SLA/lateness is a direct query, not new tracking.
- **Issue resolution record already exists, unused.** `20260729150000_split_outcome_from_resolution.sql`
  added `original_outcome`, `resolved_at`, `resolved_by`, `resolution_notes`
  to `jobs`, DB-enforced (manual resolution requires an admin + a note;
  redoing the job resolves it automatically with `resolved_by` null so the
  two paths stay distinguishable). `AppContext.jsx` already maps these to
  `originalOutcome` / `resolvedAt` / `resolutionNotes` client-side. Nothing
  currently displays them — this is a report waiting for a UI, not a data
  problem.
- **Photo *and* video evidence exist.** `job_photos` holds both
  (`media_type`), added in `20260729190000_add_video_evidence.sql`.
- **Evidence is genuinely immutable once sealed.** `20260729100000_seal_the_whole_record.sql`
  blocks *any* change — by anyone, including an admin — to a job's status,
  assignment, notes, or photos once it reaches `Completed & Evidenced`.
  Corrections happen by appending a new visit, never by editing history. This
  is worth stating explicitly inside the pack itself ("evidence cannot be
  altered after submission"), not just kept as an internal property.
- **No feature-gating mechanism yet.** `plans` (Starter/Pro/Enterprise, see
  `20260729220000_subscription_plans.sql`) currently gates only site/operative
  counts. If the Tender Pack should be a paid-tier feature, that's a new gate,
  not something already wired up. Open decision, see below.
- **No documents/attachments table exists anywhere in the schema.** Module B
  is a clean slate, exactly as originally scoped — no surprises there.

## Existing precedent: Report.jsx

[`src/pages/Report.jsx`](../src/pages/Report.jsx) is a working v0 of part of
Module A: client-scoped, date-ranged completion rate, an evidenced-jobs
table, and an exceptions list (`At Risk` / `Missing Evidence`, with photo
count and notes) — exported via `window.print()`.

Reusable pattern: client filter + date range + printable layout.
Not reusable as-is:
- `window.print()` is a browser print dialog, not a generated PDF — fine for
  an ad-hoc internal report, not robust enough for a tender submission
  artifact that needs to look identical regardless of the browser/OS
  producing it.
- Single-client only; no site grouping, no multi-site rollup.
- Doesn't touch `original_outcome` / `resolved_at` — resolution-time
  reporting isn't started.
- Doesn't touch `job_photos` — no photo-evidence log exists yet.

## Module A — Performance Data Export Engine

Five reports, each independently exportable and combinable into the pack.

| Report | Data source | Status |
|---|---|---|
| Completion rate (overall + per site, trended) | `jobs.status`, `scheduled_time` | Overall version exists in Report.jsx; per-site breakdown is new |
| Photo-evidence log | `job_photos` (photo + video) | New — no gallery/export view exists |
| Issue resolution record | `jobs.original_outcome/resolved_at/resolved_by/resolution_notes` | Data exists and is already loaded into AppContext; no report surfaces it |
| Missed-job / SLA adherence | `jobs.scheduled_time` vs `submitted_time`, `status` | New — no explicit SLA target concept exists yet; needs a decision (see open questions) |
| Multi-site summary | roll up all of the above grouped by `site_id` under one `client_id` | New — Report.jsx is single-client, ungrouped |

**Scoping controls needed:** client (buyer), optional site subset, date
range — same shape as Report.jsx's existing filter bar, extended with a site
filter.

**Export format:** tenders are submitted as PDF (sometimes with a raw-data
appendix). This needs a real templated PDF generation path — `window.print()`
is not sufficient for a submission artifact. Raw numbers should also be
exportable as CSV/XLSX for a buyer who wants to verify.

## Module B — Document Attachment Library

New table, no dependency on Module A. Categories: method statement, insurance
certificates (public + employer's liability), accreditations (BICSc, ISO
9001/14001, SafeContractor, Constructionline), modern slavery statement,
social value commitments, references/case studies.

Core: upload, replace/version, tag by category.
Worth flagging as a near-term follow-on rather than launch-blocking: expiry
tracking + reminders for certs/accreditations that lapse — turns the library
from pure storage into something with standalone ongoing value, and a stale
cert in a submitted pack would actively hurt a bid.

## Module C — Pack Assembler

User picks buyer (client) + optional site subset + date range → pulls the
relevant Module A reports + the current tagged Module B documents → outputs
one combined PDF or a zip matching common tender submission structures.

## Suggested build order

1. Completion rate (per-site) + missed-job/SLA — pure numbers, proves the
   data pipeline and the new PDF export path.
2. Photo-evidence log + issue resolution record — adds photo layout and
   surfaces the already-existing resolution data.
3. Multi-site summary — rollup across 1–2.
4. Module B (document library) — simple CRUD + storage, no dependency on A.
5. Module C (assembler/export).

## Open questions

- **SLA target:** is "SLA adherence" measured against a defined target
  (e.g. contracted response time), or just reported as missed-job % with no
  target to compare against? No such field exists on `clients` or `sites`
  today — if a target is wanted, that's a schema addition.
- **Who generates the pack:** the cleaning company (Provaserve's own user), or
  David/Provaserve staff generating it on their behalf?
- **Branding:** white-labelled per cleaning company, or Provaserve-branded?
  Report.jsx currently hard-codes the Provaserve logo/name in the header.
- **Feature gating:** should the Tender Pack sit behind a specific plan tier
  (Pro/Enterprise)? `plans` has no per-feature gating today — would need a
  new mechanism if so.
- **PDF generation approach:** library/service choice not yet decided
  (client-side generation vs. a server-side render step) — affects Module A's
  build order and effort more than anything else on this list.
