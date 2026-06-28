# WSE CEO — Tools

Your environment has these variables available:
- `WSE_URL` — the Vercel app URL (e.g. https://wse-gamma.vercel.app)
- `WSE_SECRET` — the secret for authenticating tool calls
- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_SERVICE_KEY` — Supabase service role key

---

## Reading data (Supabase REST API)

Query issues in triage:
```bash
curl "$SUPABASE_URL/rest/v1/issues?status=eq.triage&select=id,title,label,priority,created_at" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
```

Count pending emails:
```bash
curl "$SUPABASE_URL/rest/v1/gmail_inbox?status=eq.pending&select=id" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Prefer: count=exact" \
  -I
```

---

## Process inbox (classifies pending emails → creates triage issues)

```bash
curl -X POST "$WSE_URL/api/agents/ceo/tools/process-inbox" \
  -H "Authorization: Bearer $WSE_SECRET"
```

---

## Update an issue

```bash
curl -X PATCH "$SUPABASE_URL/rest/v1/issues?id=eq.ISSUE_ID" \
  -H "apikey: $SUPABASE_SERVICE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status": "todo", "priority": "high"}'
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
