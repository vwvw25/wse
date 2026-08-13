# Event / booking flow

An `events` row is the spine of the whole app — quotes, invoices, musician bookings, contracts, set lists, and travel all hang off `event_id`. This doc covers the event record's lifecycle: creation, status pipeline, editing, and the tabs on its detail page. For what happens *inside* a specific tab (quotes, invoicing, musicians), see the dedicated flow docs.

## Creation

Three paths, same destination (`events` row + redirect to `/admin/events/[id]`):

| Path | File | Notes |
|---|---|---|
| Manual | [app/admin/events/new/NewEventForm.tsx](../../app/admin/events/new/NewEventForm.tsx) → `createEvent` in [actions.ts](../../app/admin/events/actions.ts) | Full manual form, defaults `status: 'enquiry'` |
| From parsed email | [email-agent-flow.md](email-agent-flow.md) → `saveEvent` in [email-to-quote/actions.ts](../../app/admin/email-to-quote/actions.ts) | Always `status: 'enquiry'`; also creates a `quote_requests` row |
| Duplicated from another event | `/quote/new?event=<id>` (see [quote-flow.md](quote-flow.md)) | Not a new event — reuses the existing `events` row as prefill for a new quote |

**Duplicate detection**: both the manual form and email-to-quote flow call `findPotentialDuplicateEvents` ([lib/duplicate-events.ts](../../lib/duplicate-events.ts)) before saving. It matches on same `event_date` **and** (same venue name/postcode OR same client email/agency/agent), excluding already-`cancelled`/`client_declined` events — same date alone isn't enough since multiple genuine bookings can share a date. A match surfaces [DuplicateWarningModal.tsx](../../app/admin/events/DuplicateWarningModal.tsx) with links to the existing event(s); the user can "Create anyway".

## Status pipeline

Defined in [lib/event-statuses.ts](../../lib/event-statuses.ts):

`enquiry` → `quoted` → `pencil_hold` / `confirmed_stc` → `contract_received` → `contracted`, with `client_declined`/`cancelled` as exits.

Full rationale for the pipeline (and why it replaced an earlier 4-status model) is in [ADR-005](../decisions/ADR-005-event-status-model.md) — `contract_received` was added after that ADR was written, so the ADR's table is one status short of the current code. Status changes are almost always manual (via [StatusSelect.tsx](../../app/admin/events/StatusSelect.tsx) → `updateEventStatus`), except the automatic `enquiry` on creation and the automatic flip to `quoted` when a quote is first generated (see [quote-flow.md](quote-flow.md)).

`BOOKING_STATUSES = ['confirmed_stc', 'contract_received', 'contracted']` drives the separate **Bookings** view ([app/admin/bookings](../../app/admin/bookings/page.tsx)) — a filtered, future-first subset of Events for the operationally-relevant bookings.

### Band status badge (Events list)

The **Band** column on the list view ([EventsClient.tsx](../../app/admin/events/EventsClient.tsx), `BandStatusBadge`) only renders once an event is in `confirmed_stc` / `contract_received` / `contracted` — the same three statuses as `BOOKING_STATUSES` above (a booking isn't "band-ready" as a concept before it's confirmed). For those events, it reads each `event_musicians` slot plus its joined `musician_invites` (see [musician-flow.md](musician-flow.md) for the slot/invite data model) and shows:

- **Booked** — every slot has a `musician_id` assigned.
- **In progress** — not fully booked, but at least one slot has an invite currently out (`musician_invites.availability` is `email_sent` or `reminder_sent` — sent and not yet resolved).
- **Not booked** — not fully booked and no invite is currently out, i.e. either no invite has been sent for any open slot, or every invite sent so far ended in `no` (declined) or `deadline_expired`.

Deliberately excluded from "open": `tbc`, which `musician_invites` rows are inserted with before the invite email actually sends (see `POST /api/musicians/send-availability`) — a row stuck on `tbc` means the send failed, not that an invite is out with the musician, so it should read as "Not booked" rather than "In progress".

**Known gotcha:** `EventRecord.status` in [types/quote.ts:288](../../types/quote.ts) is a *different, stale* union — it's missing `contract_received` and still lists legacy `pending`/`confirmed` values that ADR-005's migration renamed away. `lib/event-statuses.ts`'s `EventStatus` type is the current source of truth; don't trust the one in `types/quote.ts`.

## The event detail page

[app/admin/events/[id]/page.tsx](../../app/admin/events/[id]/page.tsx) (~820 lines) is a server component that fetches the event plus everything joined to it, and renders a tabbed client shell with 12 tabs:

`information | musicians | quotes | requests | set-lists | contract | invoices | calendar | travel | av | activity | comments`

| Tab | Component | Covered in |
|---|---|---|
| Information | inline in `page.tsx`, edit form at [edit/EditEventForm.tsx](../../app/admin/events/[id]/edit/EditEventForm.tsx) | this doc |
| Musicians | [EventMusiciansClient.tsx](../../app/admin/events/[id]/musicians/EventMusiciansClient.tsx) | [musician-flow.md](musician-flow.md) |
| Quotes | [EventQuotesClient.tsx](../../app/admin/events/[id]/EventQuotesClient.tsx) | [quote-flow.md](quote-flow.md) |
| Requests | [RequestsSection.tsx](../../app/admin/events/[id]/RequestsSection.tsx) | client-facing change requests, not yet documented separately |
| Set lists | [SetListEditor](../../app/admin/set-lists/[id]/SetListEditor.tsx) (shared with `/admin/set-lists`) | not yet documented separately |
| Contract | [ContractSection.tsx](../../app/admin/events/[id]/ContractSection.tsx) + `saveContractReview`/`saveContractParsed` in actions.ts | this doc |
| Invoices | [InvoiceSection.tsx](../../app/admin/events/[id]/InvoiceSection.tsx) | [invoicing-flow.md](invoicing-flow.md) |
| Calendar | [CalendarNotesSection.tsx](../../app/admin/events/[id]/CalendarNotesSection.tsx) | this doc |
| Travel | [TravelDetailsForm.tsx](../../app/admin/events/[id]/TravelDetailsForm.tsx), [JourneyDetailsCard.tsx](../../app/admin/events/[id]/JourneyDetailsCard.tsx), [TravelExpensesTable.tsx](../../app/admin/events/[id]/TravelExpensesTable.tsx) | this doc |
| AV | [AvSection.tsx](../../app/admin/events/[id]/AvSection.tsx) → `updateEventAv` in actions.ts | see below |
| Activity | reads `event_activity_log` | see below |
| Comments | [CommentsSection.tsx](../../app/admin/events/[id]/CommentsSection.tsx) → `addEventComment` | this doc |

The **information** tab edit path ([EditEventForm.tsx](../../app/admin/events/[id]/edit/EditEventForm.tsx)) autosaves on debounced field change via `updateEvent` in [actions.ts](../../app/admin/events/actions.ts) — it never redirects, since the user is expected to stay on the page through the whole editing session.

### Contract review

Contract text gets parsed (see `app/api/admin/parse-contract`) into structured fields, then diffed against the event's current values. Mismatches become `ContractFlag`s (`{field, label, contract_value, event_value}`) shown in the UI; `acceptContractFlag`/`resolveContractFlag` in [actions.ts](../../app/admin/events/actions.ts) let the admin apply the contract's value or dismiss the flag. Fields inside the `request_details` JSONB blob (`band_size_requested`, `sets_requested`) need manual `logEventActivity` calls since the automatic diff trigger (below) only sees plain top-level columns.

### AV

The AV tab ([AvSection.tsx](../../app/admin/events/[id]/AvSection.tsx)) is a standalone tab, separate from Information — it used to be a card on Information (`pa_provided_by` / `powerless_pa_required` / `lighting_required`, all inside `request_details`), but that shape was replaced entirely by four plain top-level `events` columns plus two new lookup tables. There is no JSONB involved and no migration path from the old fields — they were dropped, not renamed.

**Columns** (all nullable, all logged automatically by the plain-column activity trigger — no manual `logEventActivity` call needed):

| Column | Type | Meaning |
|---|---|---|
| `av_provided_by` | `'us' \| 'client' \| 'venue'` | Who's supplying the AV for this event |
| `av_rider_id` | uuid → `av_riders.id` | Which rider document applies |
| `rider_status` | `'sent' \| 'unsent'` | Whether that rider has been sent to the client/venue |
| `av_setup_id` | uuid → `av_setups.id` | Which named AV set-up WSE needs to bring |

**Conditional display logic** (enforced in `AvSection.tsx`, not the DB):

- `av_provided_by = 'client'` or `'venue'` → show **Rider** (`av_rider_id`, a `<select>` over all `av_riders`). Once a rider is selected, also show **Rider status** (`rider_status`, Sent/Unsent).
- `av_provided_by = 'us'` → show **AV required** (`av_setup_id`, a `<select>` over all `av_setups`).
- Switching `av_provided_by` clears whichever of the above no longer applies (e.g. picking `'us'` after `'client'` nulls out `av_rider_id`/`rider_status`), so stale selections can't linger under the wrong branch.

Each field saves immediately on change via `updateEventAv` in [actions.ts](../../app/admin/events/actions.ts) (no debounce, unlike the Information tab's autosave) — every call writes the full `{av_provided_by, av_rider_id, rider_status, av_setup_id}` object so the clearing logic above is persisted, not just the field that changed.

**Riders and set-ups are managed in Settings → AV**, not on the event page itself:
- **Riders** ([app/admin/av-riders](../../app/admin/av-riders/page.tsx)) — `name`, an optional file attachment (PDF/DOC/DOCX, uploaded to the private `av-riders` Storage bucket, lazily created on first upload — see `uploadRiderFile` in [actions.ts](../../app/admin/av-riders/actions.ts)), and an optional `link_url`. Files are served via a signed URL from `GET /api/admin/av-riders/[id]/file` (1hr expiry), same pattern as contract file viewing.
- **Set ups** ([app/admin/av-setups](../../app/admin/av-setups/page.tsx)) — just a `name` (e.g. "Full dancefloor"), CRUD following the exact `dress_code_templates` pattern.

Both admin pages are linked from Settings' "AV" nav item as link-outs (same pattern as "Add-ons"), not embedded inline in `settings/page.tsx`.

## Activity log

Every event has an audit trail in `event_activity_log`, written via `logEventActivity` in [lib/event-activity.ts](../../lib/event-activity.ts). **[ADR-011](../decisions/ADR-011-event-activity-log.md) is required reading before adding any new mutation on an event-scoped table**: the rule is that any write to `events`, `quotes`, `invoices`, `event_musicians`, contracts, set lists, or requests must call `logEventActivity` in the same function, right after the write succeeds — plain top-level column changes on `events` are logged automatically by a DB trigger, but anything inside a JSONB blob (`request_details`, `contract`) or on a different table needs an explicit call. ADR-011 exists because this was silently skipped for invoices and musician invoices for a while — that's the failure mode to avoid when adding new mutations.

`event_activity_log` has a nullable `category` column, populated only for rows where `type = 'comment'`. It's chosen from a fixed list (`COMMENT_CATEGORIES` in [lib/event-activity.ts](../../lib/event-activity.ts) — AV, Timings, Set List & Repertoire, ID & Security, Parking & Load In/Out, Dress Code, Food & Drink, Contact Information, Invoicing, Accommodation & Travel, General) via a dropdown in [CommentsSection.tsx](../../app/admin/events/[id]/CommentsSection.tsx), and rendered as a pill in place of the fixed "Comment" label used on the Activity tab. Add new values to `COMMENT_CATEGORIES` to extend the list — no schema change needed since the column is free text.

## Deletion

`deleteEvent` in [actions.ts](../../app/admin/events/actions.ts) unlinks (`event_id = null`) rather than deletes any `quotes` referencing the event before deleting the event row — quotes survive event deletion as orphaned/standalone records.

## Tables touched

| Table | Written by |
|---|---|
| `events` | create/edit/status/contract/booking-details/AV actions in [actions.ts](../../app/admin/events/actions.ts) |
| `quote_requests` | insert only from email-to-quote (see [quote-flow.md](quote-flow.md)) |
| `event_activity_log` | `logEventActivity`, from every event-scoped mutation across the app |
| `dress_code_templates` | read-only here, powers the dress code picker |
| `av_riders` | read-only here (AV tab); CRUD lives in [app/admin/av-riders](../../app/admin/av-riders/actions.ts) |
| `av_setups` | read-only here (AV tab); CRUD lives in [app/admin/av-setups](../../app/admin/av-setups/actions.ts) |
| Supabase Storage `contracts` bucket | contract file upload/delete |
| Supabase Storage `av-riders` bucket | rider file upload/delete, lazily created on first upload |
