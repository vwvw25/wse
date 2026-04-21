-- New fields on musicians
alter table musicians add column if not exists home_city text;
alter table musicians add column if not exists dietary_requirements text[] default '{}';
alter table musicians add column if not exists car_registration text;
alter table musicians add column if not exists car_make text;
alter table musicians add column if not exists car_model text;
alter table musicians add column if not exists car_colour text;
alter table musicians add column if not exists date_of_birth date;
alter table musicians add column if not exists passport_number text;
alter table musicians add column if not exists covid_vaccinated boolean;
alter table musicians add column if not exists covid_booster boolean;

-- Onboarding tokens
create table if not exists musician_onboarding_tokens (
  id uuid primary key default gen_random_uuid(),
  musician_id uuid not null references musicians(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  type text not null, -- 'general' | 'info_request'
  fields_requested text[] not null default '{}',
  deadline_at timestamptz not null,
  reminder_1_sent_at timestamptz,
  reminder_2_sent_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);
alter table musician_onboarding_tokens enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'musician_onboarding_tokens' and policyname = 'service role all') then
    create policy "service role all" on musician_onboarding_tokens using (true) with check (true);
  end if;
end $$;
