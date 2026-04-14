# Changelog

Running log of implementation changes. Significant architectural decisions are recorded separately in [`docs/decisions/`](docs/decisions/README.md).

---

## 2026-04-14

### Booking type simplification (ADR-003, ADR-004)
- Step 1 of the quote builder now shows only **Wedding** and **Other** — removed Background / Dancing under 40 / Dancing over 40 options
- Non-wedding quotes priced at background rates; inclusions now show a PA upgrade note: *"If dancing with more than 40 guests, full PA + sound engineer required — add £X"*
- Booking type headings and background suitability description removed from quote output (client-facing)
- `dancing_under_40` and `dancing_over_40` types retained in codebase for backward compat with existing quotes

### Extended Background PA distinction
- Added `hasExtendedBackgroundPA` (quartet+) as separate from `hasRegularBackgroundPA` (duo/trio)
- Inclusions now show "Extended Background PA" for quartet+ background bookings
- PA note injection logic updated to insert after the last visible PA item

### Quote UI / email version
- Email version font changed to Arial sans-serif 14px (Gmail Normal)
- Added "Based on being able to load out at finish time" inclusion when `is_load_out_at_finish` is ticked

### Event status system (ADR-005)
- Replaced 4-status model (`pending`, `quoted`, `confirmed`, `cancelled`) with 7-status pipeline
- New statuses: `enquiry`, `quoted`, `pencil_hold`, `client_declined`, `cancelled`, `confirmed_stc`, `contracted`
- New events auto-set to `enquiry`; all other transitions manual
- Events page: added Kanban view toggle alongside existing list view
- Event detail page: static status badge replaced with live `StatusSelect` dropdown
- Added **Bookings** nav item — shows `confirmed_stc` + `contracted` events, future-first, with past toggle
- SQL migration provided: `supabase/migrate-event-statuses.sql`

### Agent first name fix
- Added `agent_first_name` and `agent_surname` columns to Supabase `events` table (were missing, causing `{{agent_first_name}}` template variable to silently fail)
