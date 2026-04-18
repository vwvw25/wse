-- Migration: musicians booking system
-- Run this once in the Supabase SQL editor

-- Musicians roster
create table if not exists musicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  primary_instrument text,
  default_fee numeric not null default 0,
  notes text,
  created_at timestamptz default now()
);

-- Band lineup templates
create table if not exists band_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- Instrument slots per template
create table if not exists band_template_slots (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references band_templates(id) on delete cascade,
  instrument text not null,
  sort_order int not null default 0
);

-- Musician assignments per event
create table if not exists event_musicians (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  musician_id uuid references musicians(id) on delete set null,
  instrument text not null,
  fee numeric not null default 0,
  additional_costs numeric not null default 0,
  availability text not null default 'tbc' check (availability in ('yes', 'no', 'tbc')),
  date_added timestamptz default now(),
  notes text
);

-- RLS: all tables require authentication
alter table musicians enable row level security;
drop policy if exists "Musicians accessible by authenticated users" on musicians;
create policy "Musicians accessible by authenticated users"
  on musicians for all using (auth.role() = 'authenticated');

alter table band_templates enable row level security;
drop policy if exists "Band templates accessible by authenticated users" on band_templates;
create policy "Band templates accessible by authenticated users"
  on band_templates for all using (auth.role() = 'authenticated');

alter table band_template_slots enable row level security;
drop policy if exists "Band template slots accessible by authenticated users" on band_template_slots;
create policy "Band template slots accessible by authenticated users"
  on band_template_slots for all using (auth.role() = 'authenticated');

alter table event_musicians enable row level security;
drop policy if exists "Event musicians accessible by authenticated users" on event_musicians;
create policy "Event musicians accessible by authenticated users"
  on event_musicians for all using (auth.role() = 'authenticated');
