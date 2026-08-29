# Operative Language Module — Module Scope

Status: scoping only, nothing built yet.

## Why

Operatives are cleaners in the field, not necessarily English speakers. The
Submit page (their entire app experience — job list, clock in/out, proof
submission) is English-only today. This module lets an operative see that
page in their own language — and, per direct user feedback, lets them
*write* in their own language too: their notes reach the admin translated
into English, and the admin's job instructions reach them translated into
whichever language they've chosen. Both directions are core to this pass,
not a follow-on.

## Decisions made with the user for this scope

1. **Who sets the language** — the operative self-selects, from inside the
   Submit page, and can change it at any time. No admin-facing UI change.
   This is a deliberate departure from every other operative attribute
   (name, active flag, client scoping), which are all admin-set via the
   Operatives page/modal.
2. **Scope of pages** — Submit page only. Login and SetPassword are one
   shared form for admins and operatives, and the app has no way to know
   who's signing in (or what they've chosen) until after auth succeeds —
   translating them would mean guessing a language pre-auth. Out of scope
   for this pass; they stay English for everyone.
3. **Translation storage** — static JSON dictionaries committed to the repo
   (`en.json`, `es.json`, ...), loaded at build time. No new table, no
   admin-editable copy, no new hosting surface — consistent with this
   repo's existing bias (see the scheduling module's choice of
   `pg_cron` over a new Vercel function) toward not adding infrastructure
   a requirement doesn't actually call for.
4. **Initial languages** — French, Spanish, Polish, Portuguese, Romanian
   (plus English, which stays the default/fallback).
5. **Free-text translation, both directions, in scope for this pass** — an
   operative's own notes reach the admin translated into English; an
   admin's job instructions reach the operative translated into their
   chosen language. See the dedicated section below — the two directions
   turned out to need genuinely different mechanics once checked against
   this schema's sealing rules, not a single symmetric feature.
6. **Pluralization** — simplified/approximate phrasing is acceptable for
   Polish and Romanian; no grammatical plural-rule engine.
7. **No first-run prompt** — an operative with no `language` set just sees
   English, silently. No one-time popup nudging them toward the picker.
8. **Translation engine** — Azure Translator.

## Fit against the current app

Checked against the actual repo
(`C:\Users\david\Projects\serviceproof`).

- **No i18n infrastructure exists at all.** The only hits for
  `language`/`locale` in the codebase are `toLocaleDateString` /
  `toLocaleTimeString` calls (date formatting, unrelated) and Postgres's
  `language sql` / `language plpgsql` function declarations. This is a
  greenfield addition, not an extension of something partial.
- **`profiles` and `operatives` are read-only to the browser today, by
  design.** `20260729060000_role_based_rls.sql` deliberately replaced their
  blanket policies with `_select`-only ones, with an explicit comment: every
  write to these tables goes through a service-role serverless function
  (invites, superadmin provisioning) specifically so `profiles.role` can
  never be self-edited. A self-service "operative sets their own language"
  is the **first legitimate client-side write** to either table. It needs
  to be added narrowly — a general UPDATE policy on `profiles` would
  reopen exactly the hole that migration closed.
- **`AuthContext.loadProfile`** already selects a fixed column list off
  `profiles` on every login/session load
  (`organization_id, role, name, operative_id, organizations(...)`) — a new
  `language` column is a one-line addition there.
- **Submit.jsx string inventory** (646 lines, single file, no shared
  operative-only components besides `StatusBadge`/`ConfirmDialog`, both of
  which are also used by admin pages):
  - **UI chrome** — labels, button text, headings, placeholders, empty
    states, confirm-dialog copy. This is the actual scope of translation:
    roughly 35-40 distinct strings across `ClockControl`, `JobList`,
    `SubmissionForm`, and the page shell.
  - **Canonical enum values stored in the database** —
    `COMPLETION_OPTIONS` (`Completed` / `Completed with issue` / `Unable to
    complete`) and job `status` (`Incomplete`, `Missing Evidence`, `At
    Risk`, `Completed & Evidenced`, ...) are literal strings used as data,
    not just copy — they're written to `jobs` and matched against elsewhere
    (`DEFAULT_COMPLETION_STATUS`, `ACTIONABLE_STATUSES`, RLS/trigger logic
    server-side). These get a **display-only** translation lookup keyed by
    the English value; the value itself, in the database and in app logic,
    never changes.
  - **Free-text data — not covered by the static dictionary, but two
    fields (`job.notes`, `job.instructions`) get *live* translation
    instead** — see the dedicated section below. `site.name`,
    `client.name`, `job.taskType`, and `job.area` stay untranslated for
    now (see open questions).
  - **Shared components** — `StatusBadge` and `ConfirmDialog` render
    whatever `label`/`body`/`title` props they're given; they're used by
    admin pages too and should stay untouched. Submit.jsx's own call sites
    pass already-translated strings in — e.g. today's
    `label={job.status === 'Incomplete' ? 'Assigned' : undefined}` becomes
    `label={t(...)}` at the call site, not a change to `StatusBadge`. One
    existing call (`showConfirm`'s `ConfirmDialog`) relies on the
    component's built-in `cancelLabel = 'Cancel'` default rather than
    passing one explicitly — that call needs an explicit translated
    `cancelLabel` added, since the shared default itself won't be
    translated.
  - **Richest case** — the "Submit as Completed?" confirm body is JSX with
    embedded `<strong>`/`&mdash;`, not a flat string
    (`This marks the job as **Completed & Evidenced**...`). The dictionary
    format needs to support that, not just plain-string values.
- **Admin's own "preview" of Submit** — an admin can open the real
  Submit.jsx (not the marketing `SubmitPreview.jsx` mockup, which is
  static sample content on the Landing page and entirely out of scope)
  via the Dashboard's "Open mobile proof form" action. Since the picker
  lives on the page itself and is driven by `profiles.language`, an admin
  previewing it sees/uses the same picker — which is a useful side effect
  (an admin can check a translation before relying on it) rather than
  something to special-case away.

## Free-text translation: operative notes → English, instructions → operative's language

This needs a live translation API call (Azure Translator) — a
static dictionary can't cover arbitrary typed text. The two directions
turned out **not** to be symmetric, because of a rule this schema
enforces hard: `20260729100000_seal_the_whole_record.sql` installs a
`before update` trigger that rejects **any** change to a job row once
`old.status = 'Completed & Evidenced'` — not just to status or evidence,
the whole row, no exceptions, by explicit design (the migration's own
comment: *"A seal with exceptions is also hard to state and easy to
erode."*). That constraint decides where each translation can happen.

### Notes → English (for the admin)

The original ask was "translate on view, when the admin opens the job" —
but a `Completed` submission seals the job **in the same request** that
writes the notes, so by the time an admin opens it, the row is already
locked and cannot be written to again, ever. Caching a translation into
the row at view time is therefore only possible for the minority of jobs
that never seal (`At Risk` / `Missing Evidence` outcomes stay editable).
For `Completed` jobs — presumably the common case — it isn't possible at
all under this schema's rules, short of carving out an exception to the
seal, which is exactly the thing that migration was written to rule out.

**Resolution: translate at submission time, not at view time**, so the
translation is written in the same request that writes the notes — before
the row seals, not after:

- `jobs.notes_en text null` — cached English translation of `notes`.
- `jobs.notes_language text null` — snapshot of the language `notes` was
  written in (the operative's `profiles.language` *at the moment of
  submission* — snapshotted, not looked up live, since the operative could
  change their language preference later and the job might already be
  sealed by then).
- In `submitProof` (`AppContext.jsx:382`), immediately before the existing
  evidence/notes write: if the submitting operative's language isn't
  English, call the translation endpoint and include `notes_en` /
  `notes_language` in the very same update that writes `notes` and
  (possibly) seals the job. No new write to the row ever happens after
  that point.
- **Failure handling**: if the translation call fails (patchy site wifi is
  a real scenario this codebase already designs around for photo/video
  uploads), the submission still proceeds with `notes_en` left `null` —
  proof of work takes priority over a translation convenience. For a
  `Completed` job this failure is then permanent, by the same sealing rule
  that makes the rest of the record permanent. Admin display falls back to
  showing the original-language `notes` whenever `notes_en` is null — the
  same fallback that covers "operative wrote in English to begin with," so
  there's no separate error state to design.
- This does add one network round-trip to the operative's submit action.
  Given `notes` is a short field (not a document), Azure Translator's
  API is typically well under a second — folds into the "Saving…" state
  the form already shows during photo uploads, rather than needing its own
  spinner.
- Where admin sees it: `EditJobModal.jsx:481` (the notes textarea/display)
  and `Report.jsx:230` (the client report's notes line) both currently
  render `j.notes` directly — both switch to `j.notes_en || j.notes`.

### Instructions → operative's language

The reverse direction has no sealing conflict: instructions only matter
while a job is still open (nobody needs translated instructions for
finished work), so caching a translation the first time the assigned
operative views it is safe — that write happens well before any seal.

- `jobs.instructions_translated text null` and
  `jobs.instructions_translated_language text null` (which language the
  cached value is in, so a stale cache — operative's preference changed,
  or the job got reassigned to a different-language operative — can be
  detected and re-translated rather than shown wrong).
- On the Submit page (`Submit.jsx:279`, the instructions block in
  `SubmissionForm`): if `job.instructions` is set and the viewing
  operative's language isn't English, show
  `instructions_translated` when its cached language matches; otherwise
  call the translation endpoint, display the result, and write it back to
  the job row (permitted today — `jobs_update`'s existing RLS already lets
  the assigned operative update their own job; this just uses two more
  columns of that same permission, not a new grant).
- Since `jobs.operative_id` is singular (confirmed in the scheduling
  scope: one Job Instance is generated per (schedule, date, operative)),
  there's exactly one target language per job here — no need to cache
  translations for multiple operatives on the same row.
- Simpler alternative considered and rejected: translating instructions
  eagerly when the Schedule's daily generator runs
  (`generate_job_instances()`). Rejected because that function runs inside
  Postgres via `pg_cron`, which has no outbound HTTP call available today
  (no `pg_net` or equivalent extension in use) — doing it there would mean
  adding a new kind of infrastructure this repo doesn't have, whereas
  lazy/on-view translation is just one more call from code that already
  runs in the browser.

### New shared piece: a translation proxy endpoint

Both directions need the same server-side piece: a new
`/api/translate.js` (Vercel serverless function, matching the existing
`/api/*` pattern) that accepts `{ text, source, target }`, calls Azure
Translator with a server-held API key, and returns the result. It
does **not** need the `service_role` Supabase key the other `/api/*`
functions use (it isn't acting on anyone else's behalf) — it does need to
check the caller has a valid Supabase session before proxying to Azure,
purely to stop the API key/quota being spammed by anyone who finds the
URL.

## Proposed schema

**`profiles`** (altered)
Add nullable `language text` — one of `'en'`, `'es'`, `'fr'`, `'pl'`,
`'pt'`, `'ro'` (constrained via a check constraint), default `null`. Null
is treated as English by the app; no backfill needed for existing rows.

**`set_my_language(p_language text)`** — a new Postgres RPC, the narrow
exception to "profiles is read-only to the browser":
```sql
update profiles set language = p_language where id = auth.uid();
```
validated against the same allowed set as the check constraint (so it
can't be used to write garbage even if the client-side dropdown is
bypassed). No service-role/serverless function needed — this only ever
touches the caller's own row, which is exactly what an RPC + `auth.uid()`
is for, not a privilege-escalation case like invites are. Matches the
existing "hard rules live in a trigger or RPC" pattern already established
here (`create_job`, `current_org()`).

**`jobs`** (altered)
Add nullable `notes_en text`, `notes_language text`,
`instructions_translated text`, `instructions_translated_language text`.
All four are ordinary columns written through the existing
`jobs_update` RLS policy (admin, or the assigned operative) — no new
policy needed, and no exception to the sealing trigger: `notes_en` /
`notes_language` are only ever written in the same request that writes
`notes` (before any seal), and `instructions_translated` /
`instructions_translated_language` are only ever written while a job is
still open.

## Translation loading

- `src/i18n/en.json`, `es.json`, `fr.json`, `pl.json`, `pt.json`,
  `ro.json` — flat key → value (or key → JSX-template for the one rich
  case above), committed to the repo.
- A small `useT()` hook/helper (no i18next or similar — the string count is
  small enough that pulling in a full i18n library would be the kind of
  unneeded abstraction this codebase otherwise avoids) that:
  - Reads `user.language` (default `'en'`) from `AuthContext`.
  - Looks up a key in that language's dictionary, **falling back to the
    English value for any individual missing key** — translations will
    lag behind copy changes, and a partial translation should never leave
    a blank label, only an English one.
  - Supports simple `{placeholder}` interpolation for the handful of
    dynamic strings (`Clocked in since {time}`, `Your jobs ({count})`,
    `You need {count} more photo(s)...`, `{done} / {required} required`).

## Language picker UI

Lives on the Submit page itself (in the header area, next to "Signed in
as"/"Log out"), a simple select/dropdown of the six languages. On change,
calls the `set_my_language` RPC and updates `AuthContext`'s in-memory user
so the page re-renders immediately, without a full reload.

## Suggested build order

1. Schema: `profiles.language` + check constraint + `set_my_language` RPC.
2. `src/i18n/en.json` as the source of truth — every string pulled out of
   Submit.jsx into keys, English values only, page re-wired to call
   `t(key)` everywhere (behavior-neutral commit, still English-only).
3. Language picker UI + `set_my_language` wiring + `AuthContext` update.
4. Remaining five dictionaries filled in via machine translation (no
   human review pass planned for v1, per decision above).
5. Status/completion-option display lookup (English value → translated
   label), applied only at Submit.jsx's render call sites, not inside
   `StatusBadge`.
6. Schema: the four `jobs` translation-cache columns.
7. `/api/translate.js` proxy endpoint (Azure Translator, session
   check, no service-role key).
8. Notes → English: wire the translation call into `submitProof`, gated
   on the operative's language and completed before the existing
   notes/evidence write; admin-facing displays
   (`EditJobModal.jsx`, `Report.jsx`) switch to `notes_en || notes`.
9. Instructions → operative's language: wire the lazy-translate-and-cache
   call into `Submit.jsx`'s instructions block, keyed on
   `instructions_translated_language` matching the viewer's current
   language.

## Decisions (round 4)

12. **UI chrome translation source** — machine-translated, no human
    reviewer for v1. The five static dictionaries
    (`es.json`/`fr.json`/`pl.json`/`pt.json`/`ro.json`) get generated by
    machine translation directly; there's no separate review step planned.
13. **`job.area` / `job.taskType`** — not translated. Only `instructions`
    gets translated for the operative; area and task type stay English
    as shown today.
14. **Translation engine, finalized** — Azure Translator, chosen over
    Google Cloud Translation for the larger permanent free tier
    (2,000,000 characters/month vs. Google's 500,000) at effectively the
    same translation quality; both still require an account with billing
    enabled even though usage here should never exceed the free tier.

## Open questions still needing input

None remaining — all decisions above are settled. The user will set up
the Azure account and Translator resource themselves; once the resulting
API key is available (as an environment variable the Vercel deployment
can read), `/api/translate.js` can be built against it.
