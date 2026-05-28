-- Add job reference URL for Poptop / Encore bookings
alter table events add column if not exists source_job_url text;
