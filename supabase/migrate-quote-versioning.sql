alter table quotes add column if not exists version int not null default 1;
alter table quotes add column if not exists status text not null default 'sent';
alter table quotes add column if not exists accepted_option text;

-- Back-fill: any existing quote linked to an event is already 'sent'
-- Standalone quotes (no event_id) stay as 'sent' too — safe default
