-- Songs library
create table if not exists songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text,
  tags text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Set lists (is_template = true means no event, used as a starting template)
create table if not exists set_lists (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete set null,
  name text not null,
  is_template boolean not null default false,
  created_at timestamptz not null default now()
);

-- Junction: songs within a set list
create table if not exists set_list_songs (
  id uuid primary key default gen_random_uuid(),
  set_list_id uuid not null references set_lists(id) on delete cascade,
  song_id uuid not null references songs(id) on delete cascade,
  position integer not null default 0,
  set_number integer, -- 1, 2, 3 etc; null = unassigned
  created_at timestamptz not null default now()
);

create index if not exists set_list_songs_set_list_id_idx on set_list_songs(set_list_id);
create index if not exists set_list_songs_song_id_idx on set_list_songs(song_id);
create index if not exists set_lists_event_id_idx on set_lists(event_id);
