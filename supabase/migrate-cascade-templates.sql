-- Migration: cascade templates for musician booking
-- Replaces preference_orders with named, instrument-specific cascade templates.
-- Run in Supabase SQL editor.

-- 1. Cascade templates (named, per instrument)
CREATE TABLE IF NOT EXISTS cascade_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  instrument  text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE cascade_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cascade_templates accessible by authenticated users" ON cascade_templates;
CREATE POLICY "cascade_templates accessible by authenticated users"
  ON cascade_templates FOR ALL USING (auth.role() = 'authenticated');

-- 2. Musicians within a cascade template (ordered)
CREATE TABLE IF NOT EXISTS cascade_template_musicians (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES cascade_templates(id) ON DELETE CASCADE,
  musician_id uuid NOT NULL REFERENCES musicians(id) ON DELETE CASCADE,
  rank        int NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (template_id, musician_id),
  UNIQUE (template_id, rank)
);

ALTER TABLE cascade_template_musicians ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cascade_template_musicians accessible by authenticated users" ON cascade_template_musicians;
CREATE POLICY "cascade_template_musicians accessible by authenticated users"
  ON cascade_template_musicians FOR ALL USING (auth.role() = 'authenticated');

-- 3. Add cascade control columns to event_musicians slots
ALTER TABLE event_musicians
  ADD COLUMN IF NOT EXISTS cascade_template_id uuid REFERENCES cascade_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cascade_enabled boolean NOT NULL DEFAULT true;

-- 4. Add deadline_expired as a valid invite availability state
ALTER TABLE musician_invites DROP CONSTRAINT IF EXISTS musician_invites_availability_check;
ALTER TABLE musician_invites ADD CONSTRAINT musician_invites_availability_check
  CHECK (availability IN ('tbc', 'email_sent', 'reminder_sent', 'yes', 'no', 'deadline_expired'));
