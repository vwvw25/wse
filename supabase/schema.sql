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

-- Add-ons table (data-driven add-ons)
create table if not exists add_ons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  pricing_type text not null check (pricing_type in ('fixed', 'per_musician')),
  default_price numeric not null default 0,
  price_editable boolean not null default false,
  line_item_label text not null,
  inclusion_text text,
  requirement_text text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

-- Seed existing add-ons
insert into add_ons (name, description, pricing_type, default_price, price_editable, line_item_label, sort_order) values
  ('Mic hire', 'Handheld microphone for speeches', 'fixed', 50, false, 'Microphone hire', 10),
  ('Buyout', 'Food not provided by client', 'per_musician', 20, false, 'Buyout', 20),
  ('Roaming set', 'Acoustic roaming performance', 'fixed', 0, true, 'Roaming set', 30),
  ('Move between sets', 'Band relocates between sets', 'fixed', 0, true, 'Move between sets', 40),
  ('Second PA', 'Additional PA system', 'fixed', 0, true, 'Second PA', 50),
  ('Costume upgrade', 'Premium costume option', 'per_musician', 0, true, 'Costume upgrade', 60),
  ('Charity Jukebox', 'Charity Jukebox inclusion', 'fixed', 0, true, 'Charity Jukebox', 70),
  ('Prestige / Luxe', 'Premium service tier', 'fixed', 0, false, 'Prestige / Luxe', 80);

-- RLS
alter table add_ons enable row level security;
create policy "Add-ons are publicly readable" on add_ons for select using (true);
create policy "Add-ons can be managed by authenticated users" on add_ons for all using (auth.role() = 'authenticated');

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
