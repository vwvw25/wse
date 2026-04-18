-- Migration: availability tokens, deadlines, reminders, and preference orders
-- Run in Supabase SQL editor after migrate-musicians-v2.sql

-- Add availability tracking fields to event_musicians
alter table event_musicians
  add column if not exists token uuid default gen_random_uuid(),
  add column if not exists deadline_hours int not null default 24,
  add column if not exists email_sent_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

-- Ensure tokens are unique and indexed for fast lookup
create unique index if not exists event_musicians_token_idx on event_musicians(token);

-- Backfill tokens for any existing rows
update event_musicians set token = gen_random_uuid() where token is null;

-- Preference orders: ranked musician list per instrument (global)
create table if not exists preference_orders (
  id uuid primary key default gen_random_uuid(),
  instrument text not null,
  musician_id uuid not null references musicians(id) on delete cascade,
  rank int not null,
  created_at timestamptz default now(),
  unique (instrument, rank),
  unique (instrument, musician_id)
);

alter table preference_orders enable row level security;
drop policy if exists "Preference orders accessible by authenticated users" on preference_orders;
create policy "Preference orders accessible by authenticated users"
  on preference_orders for all using (auth.role() = 'authenticated');
