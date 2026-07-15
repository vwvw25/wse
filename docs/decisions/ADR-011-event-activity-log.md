# ADR-011: Event activity log — purpose and coverage requirement

**Date:** 2026-07-15
**Status:** Accepted

## Context

The event detail page has an **Activity** tab (`event_activity_log` table, `lib/event-activity.ts`) that is meant to be the single place Victoria can look to see everything that has happened on a booking — status changes, invoice edits, musician changes, contract activity, comments, and anything an agent (CEO, accounts, etc.) does automatically.

In practice, coverage has been inconsistent: when the `/admin/invoices` list page was built out with an editable status dropdown, paid date, amount received, and notes, none of those mutations called `logEventActivity`. The musician-invoices page had the same gap — status, payment date, due date, and file upload/removal actions updated the database silently. Victoria updated an invoice's status, paid date, and amount, and the event's Activity feed showed nothing, because the code path simply never logged it. This wasn't a one-off bug — it's a pattern that will keep recurring as new mutations get added unless logging is treated as a required part of writing to an event-related table, not an optional extra.

## Decision

**Purpose:** The event Activity tab is the complete audit trail for a single event. If it touched this event — a person changed it, an agent changed it, an email triggered it — it must appear here. Victoria should never have to check the database or a different page to find out what happened to a booking.

**Coverage requirement:** Any server action or API route that writes to a table scoped to an event (`invoices`, `invoice_line_items`, `event_musicians`, `events`, `quotes`, contracts, set lists, requests, etc.) must call `logEventActivity(eventId, ...)` in the same function, right after the write succeeds. This includes:

- Client invoices — status, issue/due date, paid date, amount received, notes, PO number, auto-send settings, line item add/edit/delete, sent/created/deleted (see `app/admin/invoices/actions.ts` and `app/admin/events/[id]/invoice-actions.ts`)
- Musician invoices — status, due date, payment date, file upload/removal (see `app/admin/musician-invoices/actions.ts` and `app/api/admin/musician-invoices/[slotId]/upload/route.ts`)
- Any future per-event feature (quotes, contracts, set lists, calendar, travel, requests) follows the same rule

**What a log entry needs:**
- `type` — one of the `EventActivityType` values in `lib/event-activity.ts` (`field_change`, `status_change`, `musician_change`, `quote_change`, `invoice_change`, `request_change`, `set_list_change`, `contract_change`, `ai_agent_action`, `comment`). Add a new type rather than overloading an existing one if nothing fits.
- `summary` — a short, human-readable sentence naming the specific thing that changed and its new value (e.g. `Invoice WSE-2026-071 marked paid on 15 Jul 2026`), not just `Invoice updated`.
- Enough identifying context in the summary (invoice number, musician name, etc.) that the entry makes sense on its own — actions that only have a row ID (like a Supabase table PK) must look up the human-readable label before logging, not log the ID.

**When it's optional:** Pure reads, revalidation-only calls, and UI-only state (e.g. which filter tab is selected) don't need a log entry — only writes to persisted, event-scoped data.

## Consequences

- Every new mutation on an event-scoped table needs a `logEventActivity` call as part of its implementation, reviewed as a normal part of the change — not bolted on after Victoria notices it's missing.
- When reviewing a PR or agent-written change that adds or edits a server action touching an event-scoped table, check for the corresponding activity log call before treating the change as complete.
- Existing gaps (invoices, musician invoices) were fixed alongside this ADR; any other silent write paths found later should be fixed the same way and are bugs, not just gaps.
