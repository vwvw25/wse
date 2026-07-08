alter table events add column if not exists round_trip_miles numeric;
alter table events add column if not exists travel_method text;
alter table events add column if not exists congestion_charge_required text;
alter table events add column if not exists parking_type text;

create table if not exists event_travel_expenses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  description text not null,
  amount numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table event_travel_expenses enable row level security;
drop policy if exists "service role all" on event_travel_expenses;
create policy "service role all" on event_travel_expenses using (true) with check (true);
