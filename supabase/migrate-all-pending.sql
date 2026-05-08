-- ============================================================
-- CRITICAL: Run this entire script in the Supabase SQL editor.
-- Go to: Supabase dashboard → SQL Editor → New query → paste → Run
-- ============================================================

-- 1. FIX AVAILABILITY CHECK CONSTRAINT
--    The original constraint only allows 'yes', 'no', 'tbc'
--    but the code also uses 'email_sent' and 'reminder_sent'.
--    Without this fix, every status update silently fails.
ALTER TABLE event_musicians DROP CONSTRAINT IF EXISTS event_musicians_availability_check;
ALTER TABLE event_musicians
  ADD CONSTRAINT event_musicians_availability_check
  CHECK (availability IN ('yes', 'no', 'tbc', 'email_sent', 'reminder_sent'));

-- 2. ADD html COLUMN TO email_logs
--    Without this, every email log INSERT fails silently and nothing gets logged.
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS html text;

-- 3. ADD INVITE/REMINDER STATUS COLUMNS TO event_musicians
--    Without these, the Invite and Reminder columns always show '—'.
ALTER TABLE event_musicians
  ADD COLUMN IF NOT EXISTS invite_status   text NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS reminder_status text NOT NULL DEFAULT '—',
  ADD COLUMN IF NOT EXISTS invite_email_log_id   uuid REFERENCES email_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reminder_email_log_id uuid REFERENCES email_logs(id) ON DELETE SET NULL;

-- 4. ADD LINK-CLICK TRACKING
--    Records when a musician clicks accept/decline in their email.
ALTER TABLE event_musicians
  ADD COLUMN IF NOT EXISTS link_clicked_at timestamptz;

-- 5. ADD REPLY-TO ADDRESS SETTING
ALTER TABLE monitoring_settings ADD COLUMN IF NOT EXISTS reply_to_email text;
