-- Migration: update event statuses to new values
-- Run this once in the Supabase SQL editor

-- Map old values to new
UPDATE events SET status = 'enquiry'      WHERE status = 'pending';
UPDATE events SET status = 'confirmed_stc' WHERE status = 'confirmed';

-- Optional: add a check constraint to enforce valid values going forward
ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN (
    'enquiry',
    'quoted',
    'pencil_hold',
    'client_declined',
    'cancelled',
    'confirmed_stc',
    'contracted'
  ));
