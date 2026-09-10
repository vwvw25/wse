-- Assets & bundles: one library for every band asset (photos, videos, audio,
-- bio, logos, riders, PLI/PAT). Assets are LINKS ONLY — nothing is hosted here.
--
-- The library mirrors a Google Drive folder: a service account walks an `Assets/`
-- folder, every file becomes a row, the top-level sub-folder name is the category,
-- the filename is the name, the Drive link is `drive_url`. `drive_file_id` is the
-- sync match key. Re-sync only refreshes `drive_url`/`category` — never a user's
-- edits to name/tags/description/video_url.
--
-- Bundles are named, reusable selections for pasting into emails.
-- Supersedes the earlier `documents` scaffolding.

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'other',   -- freeform = Drive top-level folder, lowercased
  tags text[] not null default '{}',
  drive_url text,                            -- canonical link (Drive view link, or a manual link)
  video_url text,                            -- hosted video platform link; shown only for video category
  drive_file_id text unique,                 -- set when sourced from Drive; the sync match key
  source text not null default 'manual' check (source in ('manual','drive')),
  missing_from_drive boolean not null default false,
  is_public boolean not null default false,  -- for a future public /media page; inert now
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table assets enable row level security;
drop policy if exists "service role all" on assets;
create policy "service role all" on assets using (true) with check (true);

create table if not exists asset_bundles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table asset_bundles enable row level security;
drop policy if exists "service role all" on asset_bundles;
create policy "service role all" on asset_bundles using (true) with check (true);

create table if not exists asset_bundle_items (
  bundle_id uuid not null references asset_bundles(id) on delete cascade,
  asset_id  uuid not null references assets(id) on delete cascade,
  position  integer not null default 0,
  primary key (bundle_id, asset_id)
);
alter table asset_bundle_items enable row level security;
drop policy if exists "service role all" on asset_bundle_items;
create policy "service role all" on asset_bundle_items using (true) with check (true);

create table if not exists asset_settings (
  id smallint primary key default 1 check (id = 1),
  drive_folder_id text,
  last_synced_at timestamptz
);
alter table asset_settings enable row level security;
drop policy if exists "service role all" on asset_settings;
create policy "service role all" on asset_settings using (true) with check (true);
insert into asset_settings (id) values (1) on conflict (id) do nothing;

-- Fold in any rows from the old `documents` table if it exists, then drop it.
do $$
begin
  if to_regclass('public.documents') is not null then
    insert into assets (name, drive_url, created_at)
    select name, link_url, created_at from documents;
    drop table documents;
  end if;
end $$;
