# ADR-001: Tech stack — Next.js App Router + Supabase

**Date:** 2026-04-14  
**Status:** Accepted

## Context

WSE needed an internal quoting tool: extract details from agency emails, build and price multi-option quotes, generate HTML suitable for copying into Gmail, and maintain a record of events and quotes. The tool would be used by one person (Victoria) with no external-facing requirements other than the shareable quote URL.

Options considered were a fully custom backend, a no-code tool like Airtable, or a lightweight full-stack framework.

## Decision

Next.js 15 (App Router) for the frontend and server logic, Supabase (Postgres + Auth) for storage and authentication.

## Reasoning

- App Router server components and server actions give a clean pattern for admin pages that need data without API boilerplate
- Supabase provides auth, a Postgres database, and a JS client — no separate backend needed for this scale
- Vercel deployment is trivial for Next.js, with zero-config previews
- The quoting logic (pure calculations, HTML generation) lives entirely in `lib/` and is framework-agnostic, so migrating later is straightforward

## Consequences

- All business logic must be testable independently of Next.js (achieved — `lib/calculations.ts`, `lib/quote-items.ts` have no framework dependencies)
- Supabase RLS policies are the security boundary; admin routes are additionally protected by a password cookie
- Schema changes require running SQL directly in the Supabase dashboard (no migration tooling in place yet)
