# Email / agent flow

How an inbound email becomes a triaged issue, and how the CEO/accounts agents act on it. This doc covers the ingestion → triage → issue pipeline and the two Claude-powered agents; it does not repeat the CEO agent's own operating model (heartbeat, watcher, instruction files) which is already documented in the project [CLAUDE.md](../../CLAUDE.md) — read that first for the agent's architecture, this doc is about the data pipeline it sits on top of.

## Ingestion

Gmail push notifications hit `POST /api/gmail/push` ([route.ts](../../app/api/gmail/push/route.ts)), which:

1. Reads the Gmail history delta since `gmail_tokens.last_history_id`
2. For each new message (skipping `SENT`/`DRAFT`), inserts a `gmail_inbox` row (`status: 'pending'`)
3. **Immediately**, in the same request, also inserts a bare `issues` row (`status: 'triage'`, title = raw email subject, no labels/priority yet) and sets that `gmail_inbox` row's `status` back to `'done'`

**Known inconsistency, verified in code:** step 3 means every email arrives with an unclassified issue already created and its inbox row already marked `done` — before the classification step ever runs. `processInbox()` in [app/api/agents/ceo/tools/process-inbox.ts](../../app/api/agents/ceo/tools/process-inbox.ts) (the function behind both the CEO's `process-inbox` tool and the `/api/cron/hourly` fan-out) only looks at `gmail_inbox` rows where `status = 'pending'` — by the time it runs, push has already flipped every row to `done`, so this classification path effectively never has anything to process for emails that arrived via push. If you're debugging why issues show up with generic titles and no labels/priority instead of the richer AI-classified version, this is why — the fallback issue from step 3 is the one Victoria actually sees. Fixing this means either not creating the bare issue synchronously in the push handler, or not flipping `status` to `done` until real classification has happened.

`processInbox()` itself, when it does get pending rows (e.g. from a manual backfill), uses Claude Haiku to assign labels (from the fixed set documented in [docs/CONVENTIONS.md](../CONVENTIONS.md)), a priority, an `is_issue` flag, and a short title/summary, then creates the `issues` row — richer than the push-handler's bare fallback.

## Triage → issue lifecycle

New issues land with `status: 'triage'` in [/admin/triage](../../app/admin/triage/page.tsx). From there ([app/admin/triage/actions.ts](../../app/admin/triage/actions.ts)):

- **Accept** (`acceptTriageIssue`) — moves to `status: 'todo'`, writes a `triage_evals` row (comparing the agent's original label/priority/title guess against the human-accepted final values — training/eval data), and marks the source Gmail message as read.
- **Not an issue** (`moveToNotAnIssue`, UI at [not-an-issue](../../app/admin/triage/not-an-issue/page.tsx)) — same eval logging, but records the human disagreeing with the agent's `is_issue: true` classification.

Issue status values and Kanban ordering are the canonical ones in [docs/CONVENTIONS.md](../CONVENTIONS.md) — `triage → backlog → todo → next_up → in_progress → waiting → done → cancelled`. The [Issues](../../app/admin/issues/page.tsx) board and [issue detail page](../../app/admin/issues/[id]/page.tsx) (with `issue_messages` as a chat-style thread) are the general-purpose work tracker this pipeline feeds into.

## Needs You / agent proposals

When the CEO (or another agent) wants a human decision before acting, it writes to `agent_proposals` with a `type` (`approval | question | manual_action`, see [docs/CONVENTIONS.md](../CONVENTIONS.md)) linked to an `issue_id`. These surface on [/admin/needs-you](../../app/admin/needs-you/page.tsx). `respondToProposal` in [actions.ts](../../app/admin/needs-you/actions.ts) sets the proposal's status (`approved | declined | answered | done | reassigned`) and, if Victoria leaves a comment, posts it into that issue's `issue_messages` thread — so the conversation with the agent stays attached to the issue, not siloed in the proposal itself. Per the project CLAUDE.md, an approved/declined proposal is one of the two things (besides a new inbox email) that wakes the CEO's watcher process immediately, rather than waiting for the next 30-minute heartbeat.

## Email-to-quote

A `quote_request` classification is the bridge into the [quote-flow.md](quote-flow.md) pipeline. [/admin/email-to-quote](../../app/admin/email-to-quote/page.tsx) lets an admin paste (or select a triaged) email; `extractFromEmail` in [actions.ts](../../app/admin/email-to-quote/actions.ts) uses Claude Haiku with a heavily-few-shot prompt to pull structured `auto_fill`/`request_details` out of free-text emails, runs the same duplicate-event check as manual event creation (see [event-flow.md](event-flow.md)), then `saveEvent` writes both an `events` row (`status: 'enquiry'`) and a linked `quote_requests` row, plus an `email_parse_evals` row recording the original vs. human-corrected extraction for future prompt tuning.

## The accounts agent

A second, narrower agent (`agents` table, slug `accounts`) with one tool today: `POST /api/agents/accounts/tools/process-musician-invoice` ([route.ts](../../app/api/agents/accounts/tools/process-musician-invoice/route.ts)). It's invoked (not scheduled) when a `musician_invoice`-labelled issue needs handling — fetches the Gmail attachment via `lib/gmail.ts`, and if there isn't one, drafts an explanatory reply (with QuickBooks-specific instructions when the sender looks like an automated QuickBooks invoice email that omitted the PDF). See [invoicing-flow.md](invoicing-flow.md) for what happens once an invoice file is actually attached.

## Tables touched

| Table | Written by |
|---|---|
| `gmail_tokens` | push webhook (history cursor), OAuth callback |
| `gmail_inbox` | push webhook (insert + status), `processInbox()` |
| `issues` | push webhook (bare issue), `processInbox()` (classified issue), triage actions, agents |
| `triage_evals` | accept / not-an-issue actions — agent-vs-human classification eval data |
| `issue_messages` | issue detail chat, proposal responses with comments |
| `agent_proposals` | written by agents, updated by `respondToProposal` |
| `quote_requests` / `events` / `email_parse_evals` | `email-to-quote` — see [quote-flow.md](quote-flow.md) |
| `agents` | agent metadata/instruction-file mirror (see project CLAUDE.md) |
