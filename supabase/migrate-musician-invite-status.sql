-- Migration: invite_status and reminder_status on event_musicians
-- Run in Supabase SQL editor

alter table event_musicians
  add column if not exists invite_status   text not null default '—',
  add column if not exists reminder_status text not null default '—',
  add column if not exists invite_email_log_id   uuid references email_logs(id) on delete set null,
  add column if not exists reminder_email_log_id uuid references email_logs(id) on delete set null;
