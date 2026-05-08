-- Run this entire script in the Supabase SQL editor to apply all pending migrations.
-- It is safe to run multiple times (all statements use IF NOT EXISTS or ON CONFLICT DO NOTHING).

-- 1. Add html column to email_logs (needed for email log to work)
alter table email_logs add column if not exists html text;

-- 2. Add invite/reminder status + log ID columns to event_musicians (needed for Invite/Reminder columns)
alter table event_musicians
  add column if not exists invite_status   text not null default '—',
  add column if not exists reminder_status text not null default '—',
  add column if not exists invite_email_log_id   uuid references email_logs(id) on delete set null,
  add column if not exists reminder_email_log_id uuid references email_logs(id) on delete set null;

-- 3. Add link_clicked_at to event_musicians (tracks when musician clicked accept/decline)
alter table event_musicians
  add column if not exists link_clicked_at timestamptz;

-- 4. Add reply_to_email to monitoring_settings (configurable reply-to address)
alter table monitoring_settings add column if not exists reply_to_email text;
