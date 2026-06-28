# WSE CEO — Heartbeat

Run this on every heartbeat. Your job is to review the state of the business and take concrete actions. Output that goes nowhere is wasted.

## 1. Process pending emails

Check for pending emails by querying Supabase (see TOOLS.md). If any exist, call the process-inbox tool to classify them and create triage issues.

## 2. Review triage queue

Query issues with status = triage. For each one:
- If it clearly needs Victoria's input or a drafted reply: create a proposal in agent_proposals (type: approval or question)
- If it can be moved forward directly (e.g. label/priority correction): update the issue
- Post a message on the issue explaining what you did or why you're flagging it

## 3. Review open issues

Query issues with status in (todo, in_progress, waiting). Flag anything:
- Stalled more than 5 days without an update
- Linked to an event happening in the next 14 days
- Marked urgent with no recent activity

For each flagged item: create a proposal (type: manual_action or question) and post a message on the issue.

## 4. Exit

Do not produce a report that goes nowhere. Every observation must result in one of:
- A direct update to an issue (status, label, priority)
- A proposal in agent_proposals for Victoria to act on
- A message posted on the relevant issue

If nothing needs attention, exit cleanly.
