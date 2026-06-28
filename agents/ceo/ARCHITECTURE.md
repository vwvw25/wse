# WSE CEO Agent — Architecture

## Overview

The CEO agent is a Claude Code instance running on Victoria's Mac. It wakes up on a schedule or when triggered by database events, reads its instruction files, takes actions via curl, and logs everything to the WSE database so Victoria can see what happened in the issue chat.

---

## How a run works

1. Something triggers `run.sh` (see Triggers below)
2. `run.sh` starts Claude Code with:
   - `SOUL.md` as the system prompt
   - `HEARTBEAT.md` as the user message (what to do this run)
   - `--output-format stream-json` so output is structured
3. Claude reads `AGENTS.md` and `TOOLS.md` from the same folder
4. Claude works — making curl calls to Supabase and Vercel to read data and take actions
5. Claude's output (text + tool calls) is piped through `process-output.ts`
6. `process-output.ts` parses the stream, extracts tool calls grouped by issue_id, and writes to `issue_messages` in Supabase
7. Victoria sees the CEO's actions in the issue chat

---

## Triggers

**Heartbeat** (`com.wse.ceo.plist`) — launchd runs `run.sh` every 30 minutes.

**Watcher** (`com.wse.ceo-watcher.plist`) — `watcher.ts` runs persistently, subscribing to Supabase realtime. Triggers `run.sh` immediately when:
- A new email arrives in `gmail_inbox`
- A proposal in `agent_proposals` is approved or declined

Both are loaded into `~/Library/LaunchAgents/` and start on login.

---

## What the CEO can do

All actions are curl calls — no special permissions needed beyond the Supabase service key and Vercel cron secret.

| Action | How |
|--------|-----|
| Read issues, events, emails | Supabase REST API GET |
| Update issue status/label/priority | Supabase REST API PATCH |
| Create a proposal (Needs You queue) | Supabase REST API POST to `agent_proposals` |
| Post a message on an issue | Supabase REST API POST to `issue_messages` |
| Process pending emails | POST to Vercel `/api/agents/ceo/tools/process-inbox` |

Full curl examples are in `TOOLS.md`.

---

## Issue chat (issue_messages table)

Every action the CEO takes on a specific issue is logged as a message in `issue_messages`. This is what Victoria sees in the issue detail chat thread.

Schema:
```
issue_messages
  id            uuid
  issue_id      uuid → issues.id
  role          text ('agent' | 'user')
  content       text — the CEO's narration, or Victoria's comment
  tool_calls    jsonb — array of {name, input, output, success}
  agent_run_id  uuid → agent_runs.id
  created_at    timestamptz
```

Tool calls are rendered as expandable blocks in the UI — click to see the exact curl command and its response.

---

## Files

```
agents/ceo/
  SOUL.md          — persona and role
  HEARTBEAT.md     — what to do on each run
  AGENTS.md        — org chart
  TOOLS.md         — how to call Supabase and Vercel tools
  ARCHITECTURE.md  — this file
  run.sh           — starts the CEO agent
  process-output.ts — parses Claude Code output → writes to issue_messages
  watcher.ts       — realtime DB watcher, triggers run.sh on events
  com.wse.ceo.plist          — launchd schedule (every 30 min)
  com.wse.ceo-watcher.plist  — launchd persistent watcher
  logs/            — output.log, error.log, watcher.log
```

---

## Deterministic tools (on Vercel)

Some tasks are too specific to leave to the agent's judgment. These live as TypeScript files on Vercel and the CEO calls them via curl:

```
app/api/agents/ceo/tools/
  process-inbox.ts          — the function
  process-inbox/route.ts    — the HTTP endpoint the CEO curls
```

---

## What is NOT the CEO agent

- `app/api/agents/ceo/route.ts` — a fallback Next.js route used by the admin UI "Run" button. Calls the Anthropic API directly without Claude Code. Does not write to issue_messages.
- The instruction files stored in Supabase (`agents.instruction_files`) — used by the admin UI to display the agent's configuration. Keep in sync with the local `agents/ceo/*.md` files when making changes.
