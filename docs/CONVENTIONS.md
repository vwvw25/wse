# WSE — UI & Data Conventions

## Issue statuses

Used across issues, triage, and kanban views. Always in this order:

| Status | Meaning |
|--------|---------|
| `triage` | Newly created from email, needs CEO/Victoria review |
| `backlog` | Real issue, not yet prioritised |
| `todo` | Prioritised, ready to work |
| `next_up` | Up next — starting soon |
| `in_progress` | Actively being worked |
| `waiting` | Blocked on someone external |
| `done` | Resolved |
| `cancelled` | Not an issue (noise, spam, duplicate, resolved externally) |

## Issue priorities

`urgent` → `high` → `medium` → `low`

## Issue labels

### Philosophy

Labels are not categories — they are dimensions. An issue can (and often should) have multiple labels. Think of it like tagging a recipe: you might label it Italian, beef, easy, and main course all at once. Labels exist to make an issue instantly recognisable at a glance and to enable meaningful filtering.

When deciding what labels to apply, think across multiple axes:
- **What type of communication is this?** (quote_request, confirmation_email, contract, etc.)
- **What is being requested or sent?** (client_invoice, musician_invoice, repertoire_request, etc.)
- **What stage of the relationship is this?** (marketing = early/outreach; booked_event_question = post-booking)
- **What information is being exchanged?** (loading_info, document_request, etc.)

The goal: filter by `quote_request` to see all open quotes, filter by `musician_invoice` to see all unpaid invoices, filter by `marketing` to see all responses to outreach — independently and in combination.

### Label reference

**Communication type**

| Label | Meaning |
|-------|---------|
| `quote_request` | Someone asking for a quote or enquiring about booking musicians |
| `confirmation_email` | An agent or client confirming a booking |
| `contract_chaser` | Chasing for a signed contract |
| `contract` | A signed contract has been sent or received |
| `booked_event_question` | A question about an already-booked event (logistics, timings, etc.) |
| `marketing` | A reply to WSE's own outreach or marketing — a potential client or venue responding to something WSE sent them |

**What's being sent / requested**

| Label | Meaning |
|-------|---------|
| `musician_invoice` | A musician sending their invoice to WSE for payment |
| `client_invoice` | WSE sending an invoice to a client |
| `document_request` | A request for a document (insurance, contract, rider, etc.) |
| `loading_info` | Load-in/load-out or venue logistics information being shared |
| `repertoire_request` | A client or venue asking about or requesting a setlist / repertoire |

> This list is not exhaustive. Add labels as new patterns emerge. When in doubt, add a new label rather than forcing something into `other`.

## Proposal (Needs You) types

| Type | Meaning |
|------|---------|
| `approval` | CEO has drafted an action — Victoria approves or declines |
| `question` | CEO needs Victoria to answer a question before proceeding |
| `manual_action` | Something Victoria needs to do herself (can't be automated) |

## Kanban column order

For issue boards: Backlog → To Do → Next Up → In Progress → Waiting → Done → Cancelled

For Needs You board: Approvals → Questions → Manual Actions

## Colours

Defined as CSS variables in the global stylesheet. Always use variables, never hardcoded hex for theme colours.

| Variable | Use |
|----------|-----|
| `var(--bg)` | Page background |
| `var(--bg-secondary)` | Card / panel background |
| `var(--text)` | Primary text |
| `var(--text-secondary)` | Secondary text |
| `var(--text-tertiary)` | Muted / metadata text |
| `var(--border)` | Standard border |
| `var(--border-hover)` | Hover state border |
| `var(--font)` | Font family |

## Priority colours (inline — not CSS variables)

| Priority | Color |
|----------|-------|
| `urgent` | `#ef4444` |
| `high` | `#f97316` |
| `medium` | `#eab308` |
| `low` | `#6b7280` |

## Label colours

| Label | Text | Background |
|-------|------|------------|
| `quote_request` | `#60a5fa` | `rgba(59,130,246,0.1)` |
| `confirmation_email` | `#34d399` | `rgba(52,211,153,0.1)` |
| `contract_chaser` | `#fb923c` | `rgba(249,115,22,0.1)` |
| `contract` | `#a78bfa` | `rgba(167,139,250,0.1)` |
| `booked_event_question` | `#2dd4bf` | `rgba(20,184,166,0.1)` |
| `musician_invoice` | `#fbbf24` | `rgba(234,179,8,0.1)` |

## Style conventions

- Inline styles only — no Tailwind, no CSS modules
- CSS variables for all theme colours
- Server components by default; `'use client'` only where needed
- All DB access via `createServiceClient()` in server components/actions
