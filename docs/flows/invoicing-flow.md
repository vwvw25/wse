# Invoicing flow

Two separate, unrelated invoicing systems live under this one label: **client invoices** (WSE bills the client/agency) and **musician invoices** (a musician bills WSE for a gig). Don't conflate them — they use different tables, different UIs, and different automation.

Full data model rationale is in [ADR-006](../decisions/ADR-006-invoicing.md) — read that first.

## Client invoices

One event can have multiple invoices (e.g. deposit + balance). Core tables: `clients`, `invoices`, `invoice_line_items`, `invoice_settings` (singleton — VAT flag, bank details, logo, per-year numbering counters).

**Creation** — `createInvoice` in [app/admin/events/[id]/invoice-actions.ts](../../app/admin/events/[id]/invoice-actions.ts): generates the next `WSE-YEAR-XXX` number from `invoice_settings.year_counters`, defaults `due_date` to event date + 30 days, optionally seeds line items. Every mutation here (create, status/date/notes/PO changes, line item add/edit/delete, mark-sent, delete) calls `logEventActivity` — this is the pattern ADR-011 requires for anything touching an event-scoped table.

**Editing** — [app/admin/invoices/InvoicesClient.tsx](../../app/admin/invoices/InvoicesClient.tsx) (global list, all events) and the event detail page's Invoices tab ([InvoiceSection.tsx](../../app/admin/events/[id]/InvoiceSection.tsx)) both write through the same action functions, so activity logging is consistent regardless of entry point.

**PDF** — `GET /api/admin/invoices/[id]/pdf` ([route.tsx](../../app/api/admin/invoices/[id]/pdf/route.tsx)) renders server-side with `@react-pdf/renderer` (no headless browser — works on Vercel serverless). Bill-to is always pulled from the linked `clients` record, never from loose event fields, so it stays consistent between invoice, PDF, and auto-send email.

**Sending** — manual send via `POST /api/admin/invoices/[id]/send` ([route.tsx](../../app/api/admin/invoices/[id]/send/route.tsx)), or automatic via the daily `/api/cron/invoices` job ([route.tsx](../../app/api/cron/invoices/route.tsx)), which checks two trigger modes per invoice: `auto_send_at` (specific datetime passed) or `auto_send_day_of_event` (event date is today). Sends through Resend with the PDF attached, sets `sent_at` to prevent re-sending.

### Dashboard: "Total outstanding" and "Uninvoiced" cards

[app/admin/invoices/page.tsx](../../app/admin/invoices/page.tsx) computes a `scopedEvents` array (type `ScopedEvent` in [InvoicesClient.tsx](../../app/admin/invoices/InvoicesClient.tsx)) — one entry per event where `status IN (confirmed_stc, contracted)` and `event_date` has already passed. This is the scope for both cards; it deliberately excludes future-dated bookings and anything not yet confirmed, since those aren't overdue by definition.

**"Invoiced" means sent, not merely created.** An `invoices` row existing with `status: 'unsent'` is a draft — nothing has actually gone to the client. `isUninvoiced` is true when an event has no invoice at all, **or** every invoice on it is still `unsent`. The moment any one invoice on the event moves past `unsent` (sent/chased/paid/paid_incorrect_amount), the event no longer counts as uninvoiced — even if a second invoice on that same event (e.g. a balance payment) is still a draft. Don't shortcut this to "does an invoice row exist" — that was the bug being fixed here.

- **Total outstanding** = sum, across every event in scope, of: invoice line-item totals for that event's non-`paid` invoices (so `unsent`/`sent`/`chased`/`paid_incorrect_amount` all count), or the event's `booked_fee` if it has no invoice at all to sum from. This is a single per-event calculation, not "unpaid invoices total + uninvoiced total" added together — doing that separately would double-count an event whose only invoice is an unsent draft.
- **Uninvoiced** = the subset of the above where `isUninvoiced` is true, i.e. nothing has gone out yet for that event.
- Card 1, "Unpaid invoices", is a different, unscoped number — every invoice not `paid`/`paid_incorrect_amount`, regardless of the linked event's status or date. It isn't restricted to confirmed/contracted past gigs the way the two cards above are.

## Musician invoices

Not a separate table — status lives directly on `event_musicians` (the per-slot booking record): `musician_invoice_status`, `musician_payment_date`, `musician_invoice_due_date`, `musician_invoice_path`/`filename`. Actions in [app/admin/musician-invoices/actions.ts](../../app/admin/musician-invoices/actions.ts) each look up the musician's name via `event_musicians.musician_id` before logging, since a bare row ID isn't a useful activity-log summary (see [ADR-011](../decisions/ADR-011-event-activity-log.md)).

**Manual upload** — [app/api/admin/musician-invoices/[slotId]/upload/route.ts](../../app/api/admin/musician-invoices/[slotId]/upload/route.ts) stores the file in the `musician-invoices` Storage bucket.

**Automated ingestion** — a musician emailing their invoice in gets picked up by the CEO agent's inbox triage (see [email-agent-flow.md](email-agent-flow.md)), which creates an `issues` row and hands it to `POST /api/agents/accounts/tools/process-musician-invoice` ([route.ts](../../app/api/agents/accounts/tools/process-musician-invoice/route.ts)) — the **accounts agent**'s one and only tool today. It fetches the Gmail attachment, and if none is present, drafts a reply asking the musician to resend (with special-cased QuickBooks instructions, since QuickBooks-generated invoice emails often omit the PDF unless a setting is enabled).

**Payment reminders** — `/api/cron/musician-payment-reminders` chases overdue musician invoices; it isn't a standalone Vercel cron entry — see Infrastructure note below.

## Infrastructure note: the 2-cron-job constraint

Vercel's Hobby plan caps cron jobs at 2, each at most daily (see project `CLAUDE.md`). [vercel.json](../../vercel.json) only declares `/api/cron/hourly` (9am) and `/api/cron/invoices` (8am). Every other "cron job" in the codebase — `reminders`, `onboarding-reminders`, `email-health`, `musician-payment-reminders`, `cascade`, Gmail inbox processing, Gmail watch renewal — is **not** independently scheduled; `/api/cron/hourly` ([route.ts](../../app/api/cron/hourly/route.ts)) fans out to all of them via internal `fetch` calls on each run. If you add a new time-based job, add it to this fan-out rather than to `vercel.json`, or you'll exceed the plan limit.

## Tables touched

| Table | Written by |
|---|---|
| `clients` | client invoicing — linked from `events.client_id` |
| `invoices` | create/update/delete/send actions, cron auto-send |
| `invoice_line_items` | line item CRUD |
| `invoice_settings` | Settings page (numbering counters, VAT, bank details) |
| `event_musicians` | musician invoice status/dates/file path |
| Storage `musician-invoices` bucket | manual upload, accounts-agent ingestion |
| `event_activity_log` | every mutation above, via `logEventActivity` |
