-- Migration: separate invite tracking from slot assignment
-- Each invite is now tied to a specific musician+slot, not just the slot.
-- Run in Supabase SQL editor.

-- 1. Add deadline_hours to event_musicians (slot-level default)
ALTER TABLE event_musicians
  ADD COLUMN IF NOT EXISTS deadline_hours int NOT NULL DEFAULT 24;

-- 2. Fix availability constraint — slot is just yes/no/tbc, invite tracking moves to musician_invites
ALTER TABLE event_musicians DROP CONSTRAINT IF EXISTS event_musicians_availability_check;
ALTER TABLE event_musicians ADD CONSTRAINT event_musicians_availability_check
  CHECK (availability IN ('yes', 'no', 'tbc'));

-- Reset any email_sent/reminder_sent states back to tbc (they weren't tracked properly anyway)
UPDATE event_musicians SET availability = 'tbc'
  WHERE availability IN ('email_sent', 'reminder_sent');

-- 3. Add html column to email_logs if missing
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS html text;

-- 4. Create musician_invites table
CREATE TABLE IF NOT EXISTS musician_invites (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id               uuid NOT NULL REFERENCES event_musicians(id) ON DELETE CASCADE,
  musician_id           uuid NOT NULL REFERENCES musicians(id) ON DELETE CASCADE,
  token                 uuid NOT NULL DEFAULT gen_random_uuid(),
  availability          text NOT NULL DEFAULT 'tbc'
    CHECK (availability IN ('tbc', 'email_sent', 'reminder_sent', 'yes', 'no')),
  invite_status         text NOT NULL DEFAULT '—',
  reminder_status       text NOT NULL DEFAULT '—',
  invite_email_log_id   uuid REFERENCES email_logs(id) ON DELETE SET NULL,
  reminder_email_log_id uuid REFERENCES email_logs(id) ON DELETE SET NULL,
  deadline_hours        int NOT NULL DEFAULT 24,
  email_sent_at         timestamptz,
  reminder_sent_at      timestamptz,
  link_clicked_at       timestamptz,
  created_at            timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS musician_invites_token_idx ON musician_invites(token);

ALTER TABLE musician_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "musician_invites accessible by authenticated users" ON musician_invites;
CREATE POLICY "musician_invites accessible by authenticated users"
  ON musician_invites FOR ALL USING (auth.role() = 'authenticated');
