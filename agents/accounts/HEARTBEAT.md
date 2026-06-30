# Lucy — Accounts Agent Heartbeat

On each run, do the following in order.

---

## 1. Process new musician invoice issues

Query issues with `labels` containing `musician_invoice` and `assigned_agent_id` is null (not yet picked up):

```bash
curl "$SUPABASE_URL/rest/v1/issues?labels=cs.{musician_invoice}&assigned_agent_id=is.null&status=eq.triage&select=id,title,created_at" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

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
