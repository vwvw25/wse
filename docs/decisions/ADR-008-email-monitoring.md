# ADR-008: Email monitoring, delivery logging, and notification system

**Date:** 2026-04-21  
**Status:** Accepted

## Context

All outbound emails (availability requests, onboarding, invoices, confirmations, reminders) were sent via Resend with no visibility into delivery success. Silent failures — where an email was never attempted due to a SaaS bug, or was sent but never delivered — would go unnoticed.

## Decision

Implement a three-layer monitoring system:

1. **Write-ahead logging** — every email is recorded in `email_logs` with status `pending` before the send is attempted, then updated to `sent`/`failed`. This catches SaaS-side failures where the email never reached Resend.

2. **Resend webhooks** — a `/api/webhooks/resend` endpoint receives delivery events (`delivered`, `bounced`, `complained`) and updates the log row. Bounced and complained emails also create a notification.

3. **Health cron** — an hourly cron checks for emails stuck in `pending` (>5 min, likely a bug) or `sent` (>30 min, not yet confirmed delivered). For each, it creates a notification and sends an alert email to a configured admin address.

## Status model

`pending` → `sent` → `delivered`  
`pending` → `failed`  
`sent` → `bounced` | `complained`

A row stuck in `pending` or `sent` beyond the configured threshold indicates a problem.

## Consequences

- Every outbound email goes through `lib/send-email.ts` wrapper — consistent logging everywhere.
- Webhook URL must be configured in Resend dashboard: `{BASE_URL}/api/webhooks/resend?secret={RESEND_WEBHOOK_SECRET}`.
- `RESEND_WEBHOOK_SECRET` env var must be set.
- Admin can view all logs at `/admin/email-logs` (linked from Settings).
- Notification bell in admin nav shows unread count.
