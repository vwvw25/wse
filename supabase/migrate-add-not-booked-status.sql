-- Migration: add 'not_booked' to allowed event statuses
-- Run this once in the Supabase SQL editor

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_status_check;

ALTER TABLE events
  ADD CONSTRAINT events_status_check
  CHECK (status IN (
    'enquiry',
    'quoted',
    'pencil_hold',
    'client_declined',
    'not_booked',
    'cancelled',
    'confirmed_stc',
    'contract_received',
    'contracted'
  ));
