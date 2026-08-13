-- AV feature: riders, set ups, and the AV fields on events

create table if not exists av_riders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text,
  file_name text,
  file_size integer,
  link_url text,
  created_at timestamptz not null default now()
);
alter table av_riders enable row level security;
drop policy if exists "service role all" on av_riders;
create policy "service role all" on av_riders using (true) with check (true);

create table if not exists av_setups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);
alter table av_setups enable row level security;
drop policy if exists "service role all" on av_setups;
create policy "service role all" on av_setups using (true) with check (true);

alter table events
  add column if not exists av_provided_by text check (av_provided_by in ('us','client','venue')),
  add column if not exists av_rider_id uuid references av_riders(id) on delete set null,
  add column if not exists rider_status text check (rider_status in ('sent','unsent')),
  add column if not exists av_setup_id uuid references av_setups(id) on delete set null;
