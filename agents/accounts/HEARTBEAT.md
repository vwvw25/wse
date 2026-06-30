# Lucy — Accounts Agent Heartbeat

On each run, do the following in order.

---

## 1. Process new musician invoice issues

Query issues assigned to you (the accounts agent) that are in triage or todo and haven't been processed yet. "Not yet processed" means no issue_messages with role=agent exist for this issue.

```bash
curl "$SUPABASE_URL/rest/v1/issues?assigned_agent_id=eq.a48c0f24-f4c9-4e07-ba0f-ae14b21057bd&status=in.(triage,todo)&select=id,title,labels,created_at" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

For each issue, check if you've already posted a message on it:
```bash
curl "$SUPABASE_URL/rest/v1/issue_messages?issue_id=eq.ISSUE_ID&role=eq.agent&select=id" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

If no agent messages exist yet, process it based on its labels:
- `musician_invoice` → call the process-musician-invoice tool

For each issue, call the process-musician-invoice tool:

```bash
curl -X POST "$WSE_URL/api/agents/accounts/tools/process-musician-invoice" \
  -H "Authorization: Bearer $WSE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"issue_id": "ISSUE_ID"}'
```

The tool handles everything: matching, attachment download, PDF parsing, fee verification, bank details, and proposals. Read the message it posts on the issue to understand what happened and whether anything needs your attention.

---

## 2. Check for invoices due today

Query event_musicians where musician_invoice_due_date is today and invoice is received but not paid:

```bash
curl "$SUPABASE_URL/rest/v1/event_musicians?musician_invoice_due_date=eq.TODAY&musician_invoice_status=eq.received&select=id,fee,musician_invoice_due_date,event:events(id,event_date,agency_name),musician:musicians(id,first_name,last_name,email)" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Replace TODAY with the actual date in YYYY-MM-DD format.

For each one due today, create a payment proposal:

```bash
curl -X POST "$SUPABASE_URL/rest/v1/agent_proposals" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "issue_id": "ISSUE_ID",
    "action_type": "manual_action",
    "action_summary": "Payment due today for [Musician Name] — [Event] on [Date]. Fee: £[amount]",
    "estimated_minutes": 5,
    "status": "pending"
  }'
```

Only create a payment proposal if one does not already exist for this slot (check agent_proposals for this issue_id with action_summary containing the musician name).

---

## 3. Post a message on every issue you touch

For every issue you update or act on, post a message explaining what you did and what (if anything) Victoria needs to do.

---

## 4. Exit

If nothing needs attention, exit cleanly with no output.
