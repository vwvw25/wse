# Flow docs

Each file below traces one end-to-end user or system flow through the codebase: entry points, the files involved in order, the tables each step writes to, and any known gotchas. These exist so that understanding "how does X work" doesn't require re-reading every file in the path each time — read the flow doc first, then jump to the specific file/line you need to change.

For *why* a piece of the data model looks the way it does, see [../decisions](../decisions/README.md) (ADRs) — flow docs link out to the relevant ADR rather than repeating its reasoning. For UI/data conventions (statuses, labels, colours), see [../CONVENTIONS.md](../CONVENTIONS.md).

| Flow | Covers |
|---|---|
| [quote-flow.md](quote-flow.md) | Enquiry → priced quote → sent → accepted/versioned |
| [event-flow.md](event-flow.md) | The `events` record itself: creation, status pipeline, detail-page tabs, activity log |
| [invoicing-flow.md](invoicing-flow.md) | Client invoices (WSE bills the client) and musician invoices (musician bills WSE) |
| [musician-flow.md](musician-flow.md) | Slot assignment, availability invites, automatic cascade to backup musicians, onboarding |
| [email-agent-flow.md](email-agent-flow.md) | Gmail ingestion → triage → issues, the CEO/accounts agents, email-to-quote |

## Keeping these current

These are hand-written, not generated — they will drift as the code changes. When a change to a flow's core logic lands (new status, new table, new entry point, a step added/removed), update the relevant doc as part of that change rather than after the fact. If you're not sure whether a change is "core" enough to warrant an update, err on the side of updating — a doc that's slightly over-detailed is cheaper than one nobody trusts.

## Infrastructure-wide notes worth knowing before touching any flow

- **Only 2 Vercel cron jobs exist** (`/api/cron/hourly`, `/api/cron/invoices` — see `vercel.json`), because the Hobby plan caps it there. Every other "cron job" referenced in the flow docs (`reminders`, `onboarding-reminders`, `email-health`, `musician-payment-reminders`, `cascade`, Gmail inbox processing, Gmail watch renewal) is fanned out from `/api/cron/hourly` via internal `fetch` calls, not independently scheduled. See [invoicing-flow.md](invoicing-flow.md) for detail.
- **`logEventActivity` is mandatory, not optional**, for any write to a table scoped to an event. This is [ADR-011](../decisions/ADR-011-event-activity-log.md)'s rule, and every flow doc above calls it out at the relevant point — the Activity tab on an event is supposed to be a complete audit trail, and it silently isn't if a new mutation forgets this call.
