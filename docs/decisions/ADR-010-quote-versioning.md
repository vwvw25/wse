# ADR-010: Quote Versioning and Status Tracking

**Date:** 2026-04-22  
**Status:** Accepted

## Context

Previously, quotes were standalone records with no version history. When a client needed a revised quote, the options were either to edit the existing record (losing the original) or create an entirely new one with no link to the previous. There was also no way to record which price option the client ultimately accepted when booking.

## Decision

Add version numbering, status tracking, and accepted-option recording to the existing `quotes` table — no separate versions table needed.

### Schema additions

```sql
alter table quotes add column if not exists version     int  not null default 1;
alter table quotes add column if not exists status      text not null default 'sent';
alter table quotes add column if not exists accepted_option text;
```

### Status model

| Status | Meaning |
|--------|---------|
| `draft` | Created as a new version, not yet sent |
| `sent` | Sent to the client |
| `superseded` | A newer version exists |
| `accepted` | Client booked; `accepted_option` records which option |

### Version chain

Quotes linked to an event via `event_id` form a version chain. Standalone quotes remain at `version: 1`. When "New version →" is clicked:

1. Source quote is marked `superseded`
2. A copy is inserted with `version + 1`, `status: 'draft'`, same `inputs` / `calculated` / `settings_snapshot` / `event_id`
3. User is redirected to the edit flow for the new draft

### Accepted option

When a client books, the admin opens the Quotes tab on the event page, finds the relevant quote, and selects the accepted price option from a dropdown. The option is stored as a human-readable string (e.g. `"Trio — 2×45 — £2,400"`) rather than an index, so it remains readable even if the quote's price options change in future.

## New files

- `app/api/quotes/[id]/new-version/route.ts` — POST: creates new version, marks source superseded
- `app/api/quotes/[id]/accept/route.ts` — POST: sets status + accepted_option
- `app/admin/events/[id]/EventQuotesClient.tsx` — Quotes tab UI with version cards, status badges, accept flow
- `app/quote/[id]/NewVersionButton.tsx` — Client component button on the quote page

## UI changes

- **Event page Quotes tab**: Lists all versions newest-first. Each card shows version number, status badge, date, price range, option count, and accepted option if set. Actions: View, Audit, New version (newest non-superseded only), Mark as accepted.
- **Quote page header**: Shows version badge (v1, v2…) and status badge. Shows "Back to event" link if `event_id` present. Shows "New version →" instead of "Edit →" for event-linked quotes.
- **Admin quotes table**: Added Ver (v1, v2…) and Status columns with colour-coded badges.

## Consequences

- Full version history is preserved — no quotes are deleted or overwritten.
- Accepted option is recorded at booking time, giving a clear audit trail of what was priced and what was booked.
- Existing quotes default to `version: 1`, `status: 'sent'`, `accepted_option: null` — no data migration needed beyond the column additions.
- Standalone (non-event) quotes still get the version/status columns but the "New version" UI is only exposed on event-linked quotes.

## Migration

Run `supabase/migrate-quote-versioning.sql` on the production database before deploying.
