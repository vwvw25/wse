# ADR-005: Event status model and Bookings view

**Date:** 2026-04-14  
**Status:** Accepted

## Context

Events (quoted enquiries) needed a status system to track pipeline progression and to power a separate Bookings view. The original system had four statuses: `pending`, `quoted`, `confirmed`, `cancelled` — too coarse for a real sales pipeline.

## Decision

Seven statuses forming a full pipeline:

| Status | Meaning |
|--------|---------|
| `enquiry` | Email received, quote not yet sent |
| `quoted` | Quote sent to client/agent |
| `pencil_hold` | Tentative hold placed |
| `client_declined` | Client chose not to proceed |
| `cancelled` | Booking was confirmed then cancelled |
| `confirmed_stc` | Verbally confirmed, subject to contract |
| `contracted` | Fully contracted |

**Auto-set:** New events created from email-to-quote are automatically set to `enquiry`.  
**Manual transitions:** All other status changes are made manually via the event detail page.

A separate **Bookings** nav item shows only `confirmed_stc` and `contracted` events, future-first, with a toggle to reveal past bookings.

The Events page gains a Kanban view (in addition to the existing list view) with one column per status.

## Reasoning

- The original four statuses didn't map to how the business actually tracks deals
- `enquiry` vs `quoted` is the most important early distinction — it tells Victoria what has been actioned vs what hasn't
- Separating Bookings from Events means the most operationally important view (confirmed + contracted) is one click away and not buried in a long events list
- Kanban gives a pipeline overview; list gives the date-sorted operational view

## Consequences

- A SQL migration is needed to remap `pending` → `enquiry` and `confirmed` → `confirmed_stc` for existing rows
- `dancing_under_40` and `dancing_over_40` status values are kept in the TypeScript union for backward compat with existing quote records but won't be assigned to new events
- Status is still a plain text column — the check constraint added in the migration enforces valid values going forward
