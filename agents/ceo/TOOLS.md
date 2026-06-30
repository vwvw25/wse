# WSE CEO — Tools

Your environment has these variables available:
- `WSE_URL` — the Vercel app URL (e.g. https://wse-gamma.vercel.app)
- `WSE_SECRET` — the secret for authenticating tool calls
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key

---

## Reading data (Supabase REST API)

Query issues in triage (always include description — it contains the full email body):
```bash
curl "$SUPABASE_URL/rest/v1/issues?status=eq.triage&select=id,title,labels,priority,description,created_at,source" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Query open issues:
```bash
curl "$SUPABASE_URL/rest/v1/issues?status=in.(todo,in_progress,waiting)&select=id,title,labels,priority,status,updated_at,created_at" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

---

## Update an issue (status, title, labels, priority)

Use a single PATCH to set everything at once. For triage classification:
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/issues?id=eq.ISSUE_ID" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Chase contract from Marriott for June wedding", "labels": ["contract_chaser"], "priority": "high", "status": "todo"}'
```

To cancel a non-issue:
```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/issues?id=eq.ISSUE_ID" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "cancelled"}'
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
