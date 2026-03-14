-- WSE Quoting System — Supabase Schema

-- Settings table (single row, managed by admin)
create table if not exists settings (
  id int primary key default 1 check (id = 1),  -- only one row allowed
  business_margin numeric not null default 1.30,
  pa_sound_engineer_rate numeric not null default 1000,
  pa_deduction_rate numeric not null default -50,
  pa_rate_before_midnight numeric not null default 50,
  pa_rate_after_midnight numeric not null default 75,
  mic_hire_rate numeric not null default 50,
  buyout_rate numeric not null default 20,
  waiting_time_rate_before_midnight numeric not null default 40,
  waiting_time_rate_after_midnight numeric not null default 100,
  band_after_midnight_rate numeric not null default 100,
  additional_driving_rate numeric not null default 0,
  solo_rate_multiple numeric not null default 1,
  location_surcharge_boat numeric not null default 0,
  location_surcharge_city numeric not null default 0,
  location_surcharge_stadium numeric not null default 0,
  location_surcharge_house numeric not null default 0,
  location_surcharge_no_drive numeric not null default 0,
  set_multiplier_2x45 numeric not null default 1.00,
  set_multiplier_3x45 numeric not null default 1.30,
  set_multiplier_4x45 numeric not null default 1.60,
  set_multiplier_5x45 numeric not null default 2.00,
  updated_at timestamptz default now()
);

-- Insert default settings row
insert into settings (id) values (1) on conflict (id) do nothing;

-- Quotes table
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  inputs jsonb not null,
  calculated jsonb not null,
  settings_snapshot jsonb not null,
  status text not null default 'generated' -- 'draft' | 'generated'
);

-- Row Level Security: quotes are publicly readable (for shareable links)
alter table quotes enable row level security;

create policy "Quotes are publicly readable"
  on quotes for select
  using (true);

create policy "Quotes can be inserted by anyone"
  on quotes for insert
  with check (true);

-- Settings: only authenticated users (admins) can update
alter table settings enable row level security;

create policy "Settings are publicly readable"
  on settings for select
  using (true);

create policy "Settings can be updated by authenticated users only"
  on settings for update
  using (auth.role() = 'authenticated');
