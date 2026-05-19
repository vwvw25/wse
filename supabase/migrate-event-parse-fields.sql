-- Add fields that email-to-quote parse saves to events.
-- These may be missing if the DB predates the agent name / event type additions.
-- Safe to run multiple times (IF NOT EXISTS).

alter table events add column if not exists agent_first_name text;
alter table events add column if not exists agent_surname text;
alter table events add column if not exists event_type text;
