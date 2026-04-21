# ADR-007: Client model — all bookings have a client record

**Date:** 2026-04-21  
**Status:** Accepted

## Context

Previously, event contact info (agency name, agent name, client email) was stored as loose text fields on the events table with no reusable record. This meant invoices couldn't consistently identify who to bill, repeat agencies had no shared record, and there was no place to store address or billing details.

## Decision

A `clients` table stores all bookers — agencies, direct clients, and event planners — as first-class records. Every event can be linked to one client via `client_id`.

### Client types

| Type | Meaning |
|------|---------|
| `direct` | Individual booking directly (wedding couple, corporate HR) |
| `agency` | Talent agency; WSE invoices the agency, not the end client |
| `event_planner` | Planning company; may act like either of the above |

### Linking flow on the event page

- **No client linked:** "Create client" button (pre-fills from event fields — agency name, agent name, client email) or "Link existing" picker to reuse an existing record
- **Client linked:** shows name, type badge, email inline with Edit and Unlink actions
- Pre-fill logic: agency events default type to `agency` and name from `agency_name`; direct events default type to `direct` and name/email from `agent_name`/`client_email`

### Musician availability statuses

Extended the `MusicianAvailability` type with two new states that are set automatically:

| Status | Set when |
|--------|----------|
| `email_sent` | Availability request email is sent |
| `reminder_sent` | Reminder email is sent (halfway through deadline period) |

This gives the admin a clear view of communication state without manual updates.

## Reasoning

- Agencies book multiple events — a shared client record means address/email only needs to be entered once and stays consistent across all invoices
- Bill-to on invoices always comes from the client record, not loose event fields, removing ambiguity
- Pre-fill from parser-extracted fields means creating a client record is one click after the parser runs — no re-entry
- Keeping `agency_name` / `agent_name` fields on events unchanged preserves backward compatibility with existing quote generation and email templates

## Consequences

- `clients` table requires migration
- `events.client_id` column added (nullable FK — existing events have no linked client until manually set)
- `{{booking_details}}` and quote page booking details card now show richer event information: arrival, load-out, guests, sound requirements, notes — pulled from the event record to give clients confidence the brief has been read
