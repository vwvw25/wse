-- Add client_phone to events table for direct booking telephone numbers
alter table events add column if not exists client_phone text;
