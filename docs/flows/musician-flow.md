# Musician booking flow

How a specific musician gets attached to an event slot, invited, and confirmed — including the automatic cascade to a backup musician when someone declines or misses the deadline. This is the most automation-heavy flow in the app outside of the CEO agent.

## Slots vs musicians vs invites

Three different things, easy to conflate:

- **`event_musicians`** — a *slot* on an event (e.g. "Guitarist for the 12th March gig"). Has `instrument`, `fee`, `additional_costs`, `availability` (`tbc | yes | no`), `deadline_hours`, `cascade_template_id`, `cascade_enabled`, plus the musician-invoice fields covered in [invoicing-flow.md](invoicing-flow.md). `musician_id` is nullable — a slot can exist unfilled.
- **`musicians`** — the person/profile record (contact details, default fee, dietary requirements, home city).
- **`musician_invites`** — one row per invite sent for a slot, keyed by a unique `token` used in the emailed link. Tracks `availability`, `email_sent_at`, `reminder_sent_at`, `link_clicked_at`, `invite_status`/`reminder_status`.

Slots are created via [app/admin/events/[id]/musicians/actions.ts](../../app/admin/events/[id]/musicians/actions.ts) — either one at a time (`addEventMusicianSlot`) or in bulk from a **band template** (`applyTemplateToEvent`, only adding instruments not already present). Assigning a musician to a slot (`assignMusicianToSlot`) resets `availability` to `tbc` if the musician is cleared.

## Sending an invite

`POST /api/musicians/send-availability` ([route.ts](../../app/api/musicians/send-availability/route.ts)) emails the musician a yes/no link (`/availability/[token]`) built from `event_musicians` + `events` data, and records the invite in `musician_invites`.

## The musician's response

[app/availability/[token]/page.tsx](../../app/availability/[token]/page.tsx) is the public page a musician lands on. Clicking yes/no posts to `POST /api/availability/respond` ([route.ts](../../app/api/availability/respond/route.ts)) — the most stateful route in this flow:

1. **Idempotency check** — if the invite is already past a pending state (`tbc`/`email_sent`/`reminder_sent`), returns the existing recorded result rather than double-processing.
2. **Deadline check** — if `email_sent_at + deadline_hours` has already passed when the musician responds, the invite is marked `deadline_expired` (not accepted/declined) and cascades to the next musician instead.
3. **Two-phase write** — updates `musician_invites` first, then `event_musicians.availability`; if the second write fails, the first is rolled back so the musician can retry.
4. **Event activity log** — logs the accept/decline via `logEventActivity`.
5. **Admin notification email** — sent to `monitoring_settings.alert_email` on every accept or decline (best-effort, non-fatal on failure).
6. **On decline** (`slot.cascade_enabled !== false`) — calls `triggerCascade` (below).
7. **On accept** — sends a confirmation email with event details, a Google Calendar deep-link, and an iCal download link (`/api/ical/[token]`), plus a randomly-selected celebration GIF from `celebration_gifs` (see [ADR-009](../decisions/ADR-009-musician-availability-ux.md) for why — the yes-response UX and autoresponder were deliberately built up from a plain confirmation card). Email failure here doesn't block the response being recorded.

## Cascade — automatic backup musician

`triggerCascade` (exported from [app/api/availability/respond/route.ts](../../app/api/availability/respond/route.ts) and reused by the cascade cron) finds the next musician to invite when the current one declines or expires:

1. Ordered candidate list comes from the slot's `cascade_template_id` (via `cascade_template_musicians`), falling back to the older `preference_orders` table keyed by instrument if no cascade template is set.
2. Skips musicians already invited for this slot (`musician_invites`) and musicians already confirmed (`availability: 'yes'`) on a *different* slot for the same event, to avoid double-booking one person across two roles.
3. Updates the **same** `event_musicians` row in place (not a new slot) with the next musician and resets `availability: 'tbc'`, then fires a new `send-availability` invite.

**Deadline expiry** is checked in two places: inline when a late response arrives at `/api/availability/respond`, and proactively by `/api/cron/cascade` ([route.ts](../../app/api/cron/cascade/route.ts)), which scans all `email_sent`/`reminder_sent` invites past their deadline and cascades each one. This cron is not independently scheduled in `vercel.json` — it's fanned out from `/api/cron/hourly` (see the infrastructure note in [invoicing-flow.md](invoicing-flow.md)).

## Musician onboarding

Separate from availability. `POST /api/musicians/send-onboard` ([route.ts](../../app/api/musicians/send-onboard/route.ts)) generates a `musician_onboarding_tokens` row and emails a link to `/onboarding/[token]` ([page.tsx](../../app/onboarding/[token]/page.tsx) / [OnboardingForm.tsx](../../app/onboarding/[token]/OnboardingForm.tsx)). Two token `type`s: `general` (new musician filling in their profile) and `info_request` (existing musician asked to update specific fields, via `fields_requested`). `POST /api/onboarding/[token]/route.ts` writes only an explicit allowlist of fields back to `musicians` and stamps `completed_at` so the token can't be reused. `/api/cron/onboarding-reminders` (also fanned out from `hourly`) chases incomplete onboarding.

## Band templates and preferences

- **Band templates** ([app/admin/band-builder](../../app/admin/band-builder/page.tsx)) — reusable instrument line-ups (`band_templates` + `band_template_slots`), applied to an event via `applyTemplateToEvent`.
- **Cascade templates** (`cascade_template_musicians`) — per-instrument ranked musician lists used by `triggerCascade`, managed from [app/admin/musicians/cascade-actions.ts](../../app/admin/musicians/cascade-actions.ts).
- **Preference orders** (`preference_orders`) — the older, simpler per-instrument ranking, still used as a fallback when a slot has no cascade template.

## Tables touched

| Table | Written by |
|---|---|
| `event_musicians` | slot CRUD, assignment, availability updates, cascade |
| `musician_invites` | send-availability, respond, cascade |
| `musicians` | admin CRUD, onboarding form submission |
| `musician_onboarding_tokens` | send-onboard, onboarding submission |
| `band_templates` / `band_template_slots` | Band Builder admin UI |
| `cascade_template_musicians` / `preference_orders` | cascade template / preference-order admin UI |
| `celebration_gifs` | Settings → Celebration GIFs |
| `event_activity_log` | invite accept/decline, deadline expiry |
| `notifications` | best-effort alert if a response fails to record |
