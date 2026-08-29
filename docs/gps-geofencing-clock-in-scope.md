# GPS/Geofenced Clock-In — Module Scope

Status: scoping only, nothing built yet.

## Why

Attendance today (`attendance_events`) is entirely self-reported: an
operative taps Clock In / Clock Out and the only thing the database
verifies is that in/out alternate correctly and that the timestamp is
server-stamped, not client-supplied. There is no check that the operative
was anywhere near the site they claim to be working. This is the weakest
part of Provaserve's "proof of work" story relative to direct competitors
(Swept, Janitorial Manager) — both verify *where* a clock-in happened, not
just *that* it happened, and it's a credibility gap a buyer comparing
tools will notice immediately.

## Fit against the current app

Checked against the actual repo (`C:\Users\david\Projects\serviceproof`).

- **Clock-in is a single global shift toggle, not tied to a site or
  job.** `ClockControl` in [`Submit.jsx`](../src/pages/Submit.jsx) calls
  `clockIn()`/`clockOut()` with no arguments; `attendance_events`
  ([`20260729230000_attendance_log.sql`](../supabase/migrations/20260729230000_attendance_log.sql))
  has no `site_id` or `job_id` column at all — just `operative_id`,
  `event_type`, and a DB-stamped `occurred_at`. There is currently no
  concept of "clocked in *at*" anything. This is the central design
  question this scope has to resolve (see Decisions below) — it's not
  just "add lat/lng columns."
- **Sites have no coordinates today.** `sites`
  ([`20260728120000_init_multi_tenant_schema.sql`](../supabase/migrations/20260728120000_init_multi_tenant_schema.sql))
  stores `address` and `postcode` as free text only. A geofence needs a
  lat/lng to compare against, so this is a prerequisite, not an aside —
  every existing site needs one before geofencing means anything for it.
- **The append-only, DB-stamped pattern already used for `occurred_at`
  is the right model to extend.** `attendance_events` deliberately
  doesn't trust the client for anything (see that migration's comments);
  location should follow the same rule — the raw coordinates can only
  ever come from the client (no server-side alternative exists for "where
  is this phone"), but *what the app does with those coordinates* (the
  distance-to-site calculation, the in/out-of-range flag) belongs
  server-side, in an RPC, not computed in the browser and trusted as-is.
  Matches this schema's existing pattern of "a hard rule lives in a
  trigger or RPC, not just app code" (see `create_job`, `current_org()`,
  `set_my_language` in the language module scope).
- **The app's established failure-handling bias is "degrade, don't
  block."** The language module's notes-translation flow explicitly lets
  a submission proceed with `notes_en` left null if the translation API
  fails, because "proof of work takes priority over a translation
  convenience." Geolocation on a mobile device (denied permission, GPS
  cold-start, indoor signal loss in a large facility) will fail or be
  wildly inaccurate often enough that the same bias should apply here —
  see the enforcement decision below.
- **No mapping/geocoding infrastructure exists anywhere in this repo.**
  Greenfield addition, same situation the language module was in for
  translation.

## Decisions made with the user for this scope

1. **What the geofence checks against** — any of the operative's sites
   for today (the union of sites from their assigned jobs that day), not
   a single picked site. No UI change to `ClockControl`: the check is
   "were you near *one of* the places you're supposed to be today," not
   tied to a specific job or site selection. If this proves too loose in
   practice (e.g. an operative clocking in near an unrelated site that
   happens to also be theirs that day), a tighter site-picker flow is a
   later follow-up, not part of this pass.
2. **Enforcement: flag-and-record, not blocked.** An out-of-range or
   no-location clock-in/out is always allowed — it's marked (an
   "Off-site" / "Unknown location" indicator on Attendance) rather than
   rejected. Matches this app's existing bias of never blocking
   proof-of-work on a technical failure (the same pattern the language
   module uses for translation failures: the submission proceeds, the
   convenience degrades).
3. **Radius: 150m.** Middle ground between GPS drift (often 20–50m,
   worse indoors) and typical facility footprint size. Fixed constant for
   v1, not per-organization configurable — that can be added later if a
   specific org's site geography needs it.
4. **Geocoding provider: Google Maps Geocoding API.** Best accuracy for
   UK addresses/postcodes; same shape of tradeoff as the language
   module's Azure Translator choice (paid API with a free tier, requires
   an account with billing enabled). The user sets up the Google Cloud
   project and API key themselves, the same way as the Azure Translator
   resource — once the key is available as an environment variable,
   `/api/geocode.js` can be built against it.

## Proposed schema

**`sites`** (altered)
Add nullable `latitude numeric`, `longitude numeric`. Null means "not yet
geocoded" — the geofence check is skipped for that site rather than
blocking anything, same fallback bias as elsewhere in this schema.
Existing sites need a one-time backfill geocode pass; new/edited sites
geocode on save.

**`attendance_events`** (altered)
Add nullable `latitude numeric`, `longitude numeric`, `accuracy_meters
numeric` (whatever the browser's Geolocation API reports — worth keeping,
since a 2000m accuracy reading should probably be treated differently
from a 10m one), and `within_geofence boolean null` (`null` = no
coordinates available to check on either side — no device location, or
none of the operative's sites for that day are geocoded yet —
`true`/`false` = checked against the nearest of the operative's sites for
that day).

**`record_attendance_event(p_event_type text, p_lat numeric, p_lng
numeric, p_accuracy numeric)`** — a new RPC, replacing today's direct
`insert` into `attendance_events` from `AppContext.jsx`'s `clockIn`/
`clockOut`. Runs the existing alternation check plus the new distance
calculation server-side, using Postgres's `cube`/`earthdistance`
contrib extension (`earth_distance`/`ll_to_earth`) rather than pulling in
PostGIS — matches this repo's stated bias toward not adding
infrastructure a requirement doesn't call for (the same reasoning that
picked `pg_cron` over a new service for scheduling). "The operative's
sites for today" needs its own date filter on `jobs.scheduled_time`
inside the RPC — it is **not** the same set `Submit.jsx`'s `myJobs` uses
for the on-screen list. That list deliberately shows the operative's
whole rolling window of actionable jobs (up to 14 days out, since a
Schedule generates in that batch size — see the comment at
[`Submit.jsx:511`](../src/pages/Submit.jsx#L511)), not just today's, so
reusing it here would geofence against sites the operative isn't visiting
until next week and defeat the point of the check.

**New `/api/geocode.js`** (Vercel serverless function) — same shape as
the language module's proposed `/api/translate.js`: accepts an address,
calls Google Maps Geocoding API with a server-held key, returns
coordinates. Session-checked, not `service_role`.

## Suggested build order

1. Schema: enable `cube`/`earthdistance`, add `sites.latitude/longitude`.
2. `/api/geocode.js` + wire into site create/edit; one-time backfill
   script for existing sites.
3. Schema: `attendance_events` location columns + `record_attendance_event`
   RPC (alternation check moves from trigger-only into the RPC's
   transaction, or the trigger stays and the RPC just adds the location
   write in the same statement — needs checking against the current
   trigger once this is picked up).
4. `Submit.jsx`: request browser geolocation on Clock In/Out, call the
   new RPC instead of the current direct insert; on permission denial or
   API failure, proceed with a null-location event (flag-and-record, per
   decision 2) rather than blocking.
5. `Attendance.jsx`: show a distance/"Off-site" indicator per event.
6. Dashboard: an off-site-attendance banner alongside the existing
   Missing Evidence / At Risk ones.
7. Schema: `organizations.geofencing_enabled`; wire the check into
   `record_attendance_event`; add the toggle to superadmin's existing
   per-org management screen.

5. **Plan gating: available on every tier, not gated.** `plans`
   ([`20260729220000_subscription_plans.sql`](../supabase/migrations/20260729220000_subscription_plans.sql))
   only caps site/operative counts today — there's no feature-flag
   mechanism on plans at all, so gating this would mean building that
   infrastructure from scratch for a single feature, out of scope for
   this pass. More importantly, this feature exists specifically to close
   the credibility gap against Swept/Janitorial Manager; gating it behind
   Pro/Enterprise would hide it from exactly the Starter-tier prospects
   who are comparing tools during a trial. Geocoding cost is also low and
   flat (once per site, not per clock-in), so there's no strong
   cost-control reason to gate it either. Revisit only if a general
   feature-gating mechanism gets built for other reasons later.

6. **Superadmin per-organization kill-switch.** A superadmin can turn
   geofencing off for one organization independently of the rest of the
   platform — matches the existing pattern of superadmin manually
   overriding one org's site/operative limits
   ([`app-overview.md`](app-overview.md)'s SuperAdmin section). This is
   an operational/support lever (e.g. an org whose sites can't be
   geocoded reliably, or one that needs it temporarily disabled), not
   another gating layer on top of decision 5 — decision 5 says every org
   gets access to the feature; this decision is about who can turn that
   access off for a specific org and when. Superadmin-only: the org's own
   Admin has no UI for this, the same way they have no UI for their own
   plan limit overrides today.

## Proposed schema (addendum for the kill-switch)

**`organizations`** (altered)
Add `geofencing_enabled boolean not null default true`. When `false`,
`record_attendance_event` skips the distance check entirely for that
org's operatives — `within_geofence` is written `null` (same as "no
coordinates available," not `false`), so a disabled org's attendance log
doesn't fill up with false "off-site" flags.

Superadmin's existing `/api/superadmin/*` surface gets one new action to
flip this per organization, alongside the existing limit-override calls —
no new endpoint pattern, just one more field on an org record superadmin
can already edit.

## Open questions still needing input

None remaining — all decisions above are settled.
