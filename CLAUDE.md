# WSE Project — Claude Code Instructions

## Service Plan Limits

Before implementing any feature that touches an external service, check the plan limits first. This project runs on free/hobby tiers.

**Vercel (Hobby plan)**
- Cron jobs: max 2 total, and each must run at most once per day (`0 X * * *` format — no hourly or sub-daily schedules)
- Always check `vercel.json` cron count before adding new jobs
- Serverless function execution: 10s max on Hobby

**Supabase (Free plan)**
- 500MB database storage
- 5GB bandwidth/month
- 2 projects max
- No scheduled jobs (pg_cron) on free plan

**General rule**: Before implementing any feature that generates ongoing usage or touches infrastructure, check the relevant plan limits first. This includes (but is not limited to): cron jobs, background tasks, webhooks, file/image storage, email sending, authentication features, realtime/websocket connections, analytics, and any new third-party API or service. If a limit would be exceeded or a feature requires a paid tier, flag it to the user before writing any code.

## Commit and Push

After completing any meaningful set of changes, propose a commit message and **wait for explicit confirmation** before doing anything. Do not run `git commit` or `git push` until the user says yes.

Once confirmed, commit and push to `main` in the same step.

Never commit or push speculatively, mid-task, or "to trigger a deploy" without confirmation. Changes pushed to `main` go live immediately on the production site.

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres + Auth)
- Vercel (hosting + crons)
- TypeScript throughout

## CEO Agent Architecture

The CEO agent is a Claude Code instance running on Victoria's Mac — not on Vercel. It is autonomous: it reads its own instruction files, decides what to do, and acts by curling tools hosted on the Vercel app and the Supabase REST API directly.

### How it works

1. The CEO wakes up (see triggers below)
2. It reads its instruction files from `agents/ceo/` — SOUL.md, HEARTBEAT.md, AGENTS.md, TOOLS.md
3. It uses Bash to make HTTP requests to Vercel and Supabase to read data and take actions
4. It exits when done

### Triggers

Two mechanisms run on Victoria's Mac via launchd:

**Heartbeat** (`agents/ceo/com.wse.ceo.plist`) — runs `agents/ceo/run.sh` every 30 minutes on a schedule.

**Watcher** (`agents/ceo/com.wse.ceo-watcher.plist`) — a persistent process (`agents/ceo/watcher.ts`) that subscribes to Supabase realtime. Triggers `run.sh` immediately when:
- A new email arrives in `gmail_inbox`
- A proposal in `agent_proposals` is approved or declined by Victoria

Both plist files are loaded into `~/Library/LaunchAgents/` and activate on login. To check they are running:
```bash
launchctl list | grep wse
```

Logs are written to `agents/ceo/logs/`.

### Tools the CEO can call

The CEO curls these endpoints from Vercel (authenticated with `CRON_SECRET`):

- `POST /api/agents/ceo/tools/process-inbox` — classifies pending emails and creates triage issues

It also writes directly to Supabase REST API:

- `issues` — update status, label, priority
- `agent_proposals` — create proposals for Victoria's review (visible in Needs You queue)
- `issue_messages` — post messages in issue chat

Full curl examples are in `agents/ceo/TOOLS.md`.

### Agent instruction files

Live in `agents/ceo/`. These are the files Claude Code reads when the CEO runs:
- `SOUL.md` — persona, role, constraints
- `HEARTBEAT.md` — what to do on each run
- `AGENTS.md` — org chart, future agents
- `TOOLS.md` — how to call Supabase and Vercel tools

Note: copies of these files are also stored in the `agents` table in Supabase (`instruction_files` column) for display in the admin UI. Keep both in sync when making changes.

### What is NOT the CEO agent

- `app/api/agents/ceo/route.ts` — a fallback Next.js route that can run a simpler version of the CEO via HTTP (used by the admin UI "Run" button). This does not use Claude Code — it calls the Anthropic API directly with a tool loop.
- `app/api/cron/process-inbox` — this route no longer exists. Email processing is now a tool at `app/api/agents/ceo/tools/process-inbox/route.ts`, called by the CEO agent.

## Flow documentation

Before making a non-trivial change to the quote, event, invoicing, musician-booking, or email/agent pipelines, read the relevant doc in `docs/flows/` first — each traces the flow's entry points, files touched in order, and tables written, so you don't have to re-derive it by reading every file cold. See `docs/flows/README.md` for the index. `docs/decisions/` holds the *why* (ADRs) behind the data model; flow docs link out to these rather than repeating them.

**After** making a change that alters a flow's core logic — a new status, a new table or column a flow writes to, a new entry point, a step added/removed/reordered — update the relevant `docs/flows/*.md` file as part of that same change, not as a follow-up. Treat an out-of-date flow doc as an incomplete change, the same way you'd treat a missing `logEventActivity` call.

## Key conventions

- Inline styles only (no Tailwind, no CSS modules)
- CSS variables for all colours (`var(--text)`, `var(--bg)`, `var(--accent)`, etc.)
- Server components by default; `'use client'` only where needed
- All DB access via `createServiceClient()` in server components/actions
