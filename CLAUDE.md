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

After completing any meaningful set of changes, always offer to commit and push without waiting to be asked. Propose a commit message and ask for confirmation, then commit and push to `main` in the same step. Commit at natural checkpoints mid-session — don't wait until the end.

## Stack

- Next.js 14 (App Router)
- Supabase (Postgres + Auth)
- Vercel (hosting + crons)
- TypeScript throughout

## Key conventions

- Inline styles only (no Tailwind, no CSS modules)
- CSS variables for all colours (`var(--text)`, `var(--bg)`, `var(--accent)`, etc.)
- Server components by default; `'use client'` only where needed
- All DB access via `createServiceClient()` in server components/actions
