# Lucy — Tools

Your environment has these variables available:
- `WSE_URL` — the Vercel app URL (e.g. https://wse-gamma.vercel.app)
- `WSE_SECRET` — the secret for authenticating tool calls
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key

---

## Process a musician invoice issue

Handles the full flow: match musician, download attachment, store PDF, parse invoice, verify fee, update bank details, create proposals.

```bash
curl -X POST "$WSE_URL/api/agents/accounts/tools/process-musician-invoice" \
  -H "Authorization: Bearer $WSE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"issue_id": "ISSUE_ID"}'
```

---

## Query issues

```bash
curl "$SUPABASE_URL/rest/v1/issues?labels=cs.{musician_invoice}&select=id,title,status,assigned_agent_id,created_at" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

---

## Create a proposal (Needs You queue)

```bash
curl -X POST "$SUPABASE_URL/rest/v1/agent_proposals" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "issue_id": "ISSUE_ID",
    "action_type": "approval",
    "action_summary": "one sentence describing what is needed",
    "draft_content": "full draft if applicable",
    "status": "pending"
  }'
```

action_type options: `approval` | `question` | `manual_action`

---

## Post a message on an issue

```bash
curl -X POST "$SUPABASE_URL/rest/v1/issue_messages" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"issue_id": "ISSUE_ID", "content": "your message here", "role": "agent"}'
```
