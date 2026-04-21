-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz default now()
);
alter table clients enable row level security;
create policy if not exists "service role all" on clients using (true) with check (true);

-- Link events to clients (for direct bookings)
alter table events add column if not exists client_id uuid references clients(id) on delete set null;

-- Invoice settings (separate from quote settings)
create table if not exists invoice_settings (
  id uuid primary key default gen_random_uuid(),
  vat_registered boolean not null default false,
  vat_number text,
  bank_name text,
  account_name text,
  sort_code text,
  account_number text,
  iban text,
  swift text,
  logo_url text,
  default_notes text,
  year_counters jsonb not null default '{"2026": 66}',
  created_at timestamptz default now()
);
alter table invoice_settings enable row level security;
create policy if not exists "service role all" on invoice_settings using (true) with check (true);
-- Seed one row
insert into invoice_settings (vat_registered, year_counters)
select false, '{"2026": 66}'::jsonb
where not exists (select 1 from invoice_settings);

-- Invoices
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  number text not null unique,        -- WSE-2026-067
  year int not null,
  sequence int not null,
  status text not null default 'outstanding', -- outstanding | paid
  sent_at timestamptz,
  auto_send_at timestamptz,           -- scheduled send time (null = manual only)
  auto_send_day_of_event boolean not null default false,
  issue_date date,
  due_date date,
  notes text,
  po_number text,
  created_at timestamptz default now()
);
alter table invoices enable row level security;
create policy if not exists "service role all" on invoices using (true) with check (true);

-- Invoice line items
create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  cost numeric(10,2) not null default 0,
  vat_rate numeric(5,2) not null default 0,  -- 0 or 20
  sort_order int not null default 0,
  created_at timestamptz default now()
);
alter table invoice_line_items enable row level security;
create policy if not exists "service role all" on invoice_line_items using (true) with check (true);
