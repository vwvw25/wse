# ADR-006: Invoicing system

**Date:** 2026-04-21  
**Status:** Accepted

## Context

After quoting, WSE needed to generate, send, and track invoices. The previous workflow used external tools. Requirements included: multiple invoices per event (e.g. deposit + balance), VAT-optional, agency vs direct billing, downloadable PDF, auto-send scheduling, and invoice numbering that carries brand identity.

## Decision

### Data model

Four new tables:
- `clients` — reusable client/agency records linked to events
- `invoices` — one or more per event; status `outstanding | paid`
- `invoice_line_items` — fully editable line items per invoice
- `invoice_settings` — singleton row: VAT flag, bank details, logo URL, default notes, per-year sequence counters

### Invoice numbering

Format: `WSE-YEAR-XXX` (e.g. `WSE-2026-067`). Per-year counter stored in `invoice_settings.year_counters` as a JSONB map `{"2026": 67}`. Starting value `66` so the first generated invoice is 067. Counter increments atomically on each `createInvoice` call.

### PDF generation

`@react-pdf/renderer` renders server-side inside a Next.js API route (`GET /api/admin/invoices/[id]/pdf`). No headless browser required — compatible with Vercel's serverless runtime. The PDF includes letterhead, bill-to block, line items table, totals (VAT-conditional), bank details, and notes.

### Bill-to always from client record

All invoices bill to the linked `client` record regardless of whether the event is an agency or direct booking. The client record stores the agency's name, email, and address when the booker is an agency.

### Auto-send

Two trigger modes per invoice:
- `auto_send_day_of_event` — sends on the morning of the event date
- `auto_send_at` — sends at a specific datetime

Both are processed by a Vercel Cron at `0 8 * * *` (`/api/cron/invoices`). Invoices are sent via Resend with the PDF attached. Once sent, `sent_at` is set to prevent re-sending.

### VAT

VAT is off by default. When enabled in Settings, a VAT column appears on line items (0% or 20%), the PDF shows a subtotal + VAT breakdown, and the VAT registration number appears on the PDF.

## Reasoning

- Multiple invoices per event handles the common deposit + balance split without workarounds
- `@react-pdf/renderer` was chosen over Puppeteer/wkhtmltopdf because it runs in Vercel's serverless environment without binary dependencies
- Bill-to from client record (not from loose event fields) ensures consistency across invoice, PDF, and auto-send email
- Per-year counter in JSONB avoids a separate sequence table and is simple to inspect/override

## Consequences

- Requires migration: `clients`, `invoices`, `invoice_line_items`, `invoice_settings` tables
- `events` table gains a `client_id` FK column
- Invoice settings (bank details, VAT, logo) must be configured in Settings before PDFs are usable
- Auto-send only works for clients with a stored email address
