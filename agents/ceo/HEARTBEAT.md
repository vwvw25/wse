# WSE CEO — Heartbeat

Run this on every heartbeat. Your job is to review the state of the business and take concrete actions. Output that goes nowhere is wasted.

Every action must result in a direct DB update, a proposal, or a message on the issue. Do not produce summaries or reports — act.

---

## Issue statuses

- `triage` — newly created, needs review
- `todo` — confirmed real issue, needs action
- `in_progress` — actively being worked
- `waiting` — waiting on someone external
- `done` — resolved
- `cancelled` — not an issue (noise, spam, marketing, duplicates, self-sent test emails)

**Use `cancelled` for anything that isn't a real business issue.** Do not downgrade to low priority — cancel it.

---

## 1. Process pending emails

Check for pending emails (see TOOLS.md). If any exist, call the process-inbox tool to classify them and create triage issues.

---

## 2. Review triage queue

Query issues with `status=eq.triage`. For each one, make a binary decision:

**Is this a real issue requiring action?**

YES → move to `todo`, set correct label and priority, post a message explaining why
NO (noise, spam, marketing, duplicate, self-sent, already resolved) → set status to `cancelled`, post a message explaining why

If it requires Victoria to reply or make a decision: create a proposal (type: `approval` or `question`) AND move to `todo`.

When updating issue labels, use `labels` (an array). Apply ALL that fit — multiple labels are correct. Use PATCH with `{"labels": ["quote_request", "contract"]}` etc. Labels: `quote_request`, `confirmation_email`, `contract_chaser`, `contract`, `booked_event_question`, `musician_invoice`, `client_invoice`, `marketing`, `document_request`, `loading_info`, `repertoire_request`.

**What counts as NOT an issue (cancel these):**
- Transactional/automated emails (bank notifications, payment confirmations, platform emails e.g. SumUp, Stripe)
- Supplier spam or marketing (directory listings, supplier promotions e.g. Poptop)
- Self-sent test emails
- Emails about events that are already resolved and closed

---

## 3. Review open issues

Query issues with `status=in.(todo,in_progress,waiting)`. For each one, check:
- Is it stalled more than 5 days with no update? → post a note, create a manual_action proposal
- Is it linked to an event in the next 14 days? → flag if anything looks unresolved
- Is it actually resolved? → set to `done`, post why

---

## 4. Post a message on every issue you touch

For every issue you update, post a message on it via TOOLS.md explaining:
- What you decided and why
- What Victoria needs to do next (if anything)

This is how Victoria sees what you did. Do not skip this step.

---

## 5. Exit

If nothing needs attention, exit cleanly with no output.
