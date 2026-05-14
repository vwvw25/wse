-- Email parse evals
-- Captures the original Claude parse alongside what was actually saved,
-- so corrections made during the review step are visible.

create table if not exists email_parse_evals (
  id                      uuid primary key default gen_random_uuid(),
  event_id                uuid references events(id) on delete cascade,
  parsed_auto_fill        jsonb not null,
  parsed_request_details  jsonb not null,
  saved_auto_fill         jsonb not null,
  saved_request_details   jsonb not null,
  notes                   text,
  is_edge_case            boolean not null default false,
  created_at              timestamptz not null default now()
);

alter table email_parse_evals enable row level security;
-- No policies needed: all access is via the service role (server-side only)
