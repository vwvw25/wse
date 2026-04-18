-- Add contract column to events
alter table events add column if not exists contract jsonb;
