-- "Why we're suited to this booking" templates.
--
-- Named, reusable blurbs (e.g. "wardsmith") managed in Settings → Why we're suited.
-- Email templates reference one via the {{why_suited:<name>}} placeholder; the email
-- composer resolves it inline. The "Generate custom why we're suited" button on the
-- composer feeds the resolved blurb + the original enquiry email into a ChatGPT prompt
-- (the prompt wording lives in why_suited_settings.prompt, editable in Settings).

create table if not exists why_suited_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table why_suited_templates enable row level security;
drop policy if exists "service role all" on why_suited_templates;
create policy "service role all" on why_suited_templates using (true) with check (true);

create table if not exists why_suited_settings (
  id smallint primary key default 1 check (id = 1),
  prompt text not null default ''
);
alter table why_suited_settings enable row level security;
drop policy if exists "service role all" on why_suited_settings;
create policy "service role all" on why_suited_settings using (true) with check (true);
insert into why_suited_settings (id) values (1) on conflict (id) do nothing;
