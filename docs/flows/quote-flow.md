# Quote flow

How a booking enquiry becomes a priced, sent, versioned quote. This is the most-touched flow in the codebase — read this before changing anything under `app/quote/`, `app/api/quotes/`, or the pricing libs in `lib/`.

## Entry points

A quote can start from three places, all converging on the same two-step form:

| Entry point | How | Prefill source |
|---|---|---|
| Manual, no context | Admin clicks "New quote" on [/admin/quotes](../../app/admin/quotes/page.tsx) | None |
| From a parsed email | [Email-to-quote](email-agent-flow.md) creates an `events` row + `quote_requests` row, then links to `/quote/new?request=<id>` | `quote_requests.auto_fill` / `request_details` |
| From an existing event | Event page → "New quote" links to `/quote/new?event=<id>` | `events` row directly |

## Step 1 — booking basics

[app/quote/new/page.tsx](../../app/quote/new/page.tsx) (server) loads prefill data from `quote_requests` or `events`, then renders [NewQuoteForm.tsx](../../app/quote/new/NewQuoteForm.tsx) (client). This collects: client type (direct/agency), booking type (wedding/other), travel type, single vs multi-day, event date. On "Continue" it does **not** hit the database — it just serialises everything into query params and navigates to `/quote/new/details`.

## Step 2 — full details

[app/quote/new/details/page.tsx](../../app/quote/new/details/page.tsx) (server) re-fetches prefill from `quote_requests`/`events` (richer than step 1's), then renders [DetailsForm.tsx](../../app/quote/new/details/DetailsForm.tsx) (client, ~950 lines — the single biggest file in this flow).

DetailsForm handles three distinct load paths via the `edit` / `prefill` / `request` query params, all funnelled through the same `useEffect` prefill logic:

- `?request=<quote_request_id>` — email-to-quote path, reads `quote_requests.auto_fill`/`request_details`
- `?prefill=<quote_id>` — "duplicate this quote" path, reads an existing `quotes.inputs`
- `?edit=<quote_id>` — **edit an existing quote in place**, also reads `quotes.inputs`, but submit does `PATCH /api/quotes/[id]` instead of `POST /api/quotes`

Per-booking-type state (a quote can carry multiple `booking_types` at once, e.g. background + dancing) is tracked in three parallel maps keyed by `BookingType`: `bandSizesByType`, `setConfigsByType`, `bandTypeByType`. See [lib/lineups.ts](../../lib/lineups.ts) for the `BandType` → `BandSize` → line-up label tables that drive the line-up picker and fee fields shown per type.

**Known gap:** `BandSize` (`types/quote.ts:4`) has no `'solo'` value — the smallest option is `'duo'`. `Settings.solo_rate_multiple` exists in the schema but nothing in the UI, `lib/lineups.ts`, or `lib/calculations.ts` currently reads it. Adding a solo lineup means: extend `BandSize`, add a `solo` entry to every `BandType` in `LINE_UP_LABELS` and `MUSICIAN_FEE_KEYS`, and wire `solo_rate_multiple` into the pricing calculation.

On submit, DetailsForm assembles a `QuoteInputs` object and either:
- `POST /api/quotes` ([route.ts](../../app/api/quotes/route.ts)) — creates `quotes` row (`version: 1`, `status: 'sent'`), and if `event_id` is set, flips the event to `status: 'quoted'` and logs event activity
- `PATCH /api/quotes/[id]` ([route.ts](../../app/api/quotes/[id]/route.ts)) — recalculates and overwrites `inputs`/`calculated` in place, logs "Quote edited" activity

Either way it redirects to `/quote/[id]`.

## Pricing

`POST`/`PATCH` both call `calculate(inputs, settings)` from [lib/calculations.ts](../../lib/calculations.ts) — a pure function, deliberately kept side-effect-free (see [ADR-002](../decisions/ADR-002-quote-calculation-architecture.md)). It produces a `QuoteCalculated` object containing an array of `PriceOption` (one per band size × set config combination), each fully priced. `settings` is fetched fresh from the `settings` table each time and snapshotted onto the quote row (`settings_snapshot`) so historical quotes don't drift if pricing rules change later.

- [lib/quote-items.ts](../../lib/quote-items.ts) — turns a `PriceOption` + `QuoteInputs` into the "what's included" / "requirements" bullet lists shown on the quote and in the email
- [lib/option-line-items.ts](../../lib/option-line-items.ts) — turns a `PriceOption` into the itemised breakdown shown in the Audit modal ([AuditButton.tsx](../../app/quote/[id]/AuditButton.tsx))
- [lib/quote-html.ts](../../lib/quote-html.ts) — renders the standalone quote/booking-details HTML used on the email compose page

## Viewing, sending, versioning

- [app/quote/[id]/page.tsx](../../app/quote/[id]/page.tsx) — the client-facing quote page. Self-heals: if `calculated` has broken/null prices (stale schema), it recalculates and silently re-saves before rendering.
- [app/quote/[id]/email/page.tsx](../../app/quote/[id]/email/page.tsx) + `EmailComposer.tsx` — compose and send the quote via a chosen `email_templates` row; actual send goes through [app/api/send-quote/route.ts](../../app/api/send-quote/route.ts), which independently recalculates, saves a **new** `quotes` row, and emails via Resend
- [app/quote/[id]/text/page.tsx](../../app/quote/[id]/text/page.tsx) — same idea, plain-text/SMS-style output
- [NewVersionButton.tsx](../../app/quote/[id]/NewVersionButton.tsx) → `POST /api/quotes/[id]/new-version` ([route.ts](../../app/api/quotes/[id]/new-version/route.ts)) — marks the source `superseded`, inserts a copy at `version + 1` / `status: 'draft'`, redirects to `/quote/new/details?edit=<newId>`. **This is the same edit UI used for the "edit quote" feature** — versioning and editing are the same code path, differing only in whether a new row is created first.
- `POST`/`DELETE /api/quotes/[id]/accept` ([route.ts](../../app/api/quotes/[id]/accept/route.ts)) — sets `status: 'accepted'` + `accepted_option` (a human-readable string, not an index — see [ADR-010](../decisions/ADR-010-quote-versioning.md)), or reverts it

Full status model and version-chain semantics are documented in [ADR-010](../decisions/ADR-010-quote-versioning.md) — read that before touching `status`/`version`/`accepted_option` logic.

## Admin views

- [app/admin/quotes/page.tsx](../../app/admin/quotes/page.tsx) + `QuotesTable.tsx` — flat list of all quotes across all events, with version/status columns
- [app/admin/quote-requests/[id]/page.tsx](../../app/admin/quote-requests/[id]/page.tsx) — a single parsed email request, its linked event, and every quote generated from it
- Event detail page's Quotes tab (see [event-flow.md](event-flow.md)) — version-chain view scoped to one event

## Tables touched

| Table | Written by |
|---|---|
| `quote_requests` | `email-to-quote` (insert), read by step 1/2 prefill |
| `quotes` | `POST/PATCH /api/quotes`, `new-version`, `accept`, `send-quote` |
| `events` | status flip to `quoted` on first quote; read for prefill |
| `settings` | read-only here — see [invoicing-flow.md](invoicing-flow.md) for where it's written |
| `add_ons` | read-only, powers the Add-ons card |
| `email_templates` | read-only, powers the email composer |
| `email_parse_evals` | insert from email-to-quote (eval/training data, not read by this flow) |
