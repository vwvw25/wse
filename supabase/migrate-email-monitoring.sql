-- Email monitoring logs
create table if not exists email_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  type text not null,
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  status text not null default 'pending',
  error_message text,
  resend_id text,
  alerted_at timestamptz
);
alter table email_logs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'email_logs' and policyname = 'service role all') then
    create policy "service role all" on email_logs using (true) with check (true);
  end if;
end $$;
create index if not exists email_logs_status_idx on email_logs(status);
create index if not exists email_logs_resend_id_idx on email_logs(resend_id);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  read_at timestamptz,
  type text not null,
  message text not null,
  link text
);
alter table notifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'service role all') then
    create policy "service role all" on notifications using (true) with check (true);
  end if;
end $$;

-- Monitoring settings (singleton row)
create table if not exists monitoring_settings (
  id int primary key default 1,
  alert_email text,
  delivery_threshold_minutes int default 30,
  pending_threshold_minutes int default 5
);
insert into monitoring_settings (id) values (1) on conflict do nothing;
alter table monitoring_settings enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'monitoring_settings' and policyname = 'service role all') then
    create policy "service role all" on monitoring_settings using (true) with check (true);
  end if;
end $$;
