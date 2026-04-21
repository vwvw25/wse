-- Celebration GIFs shown on the availability confirmation page
create table if not exists celebration_gifs (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  created_at timestamptz default now()
);
alter table celebration_gifs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'celebration_gifs' and policyname = 'service role all') then
    create policy "service role all" on celebration_gifs using (true) with check (true);
  end if;
end $$;
