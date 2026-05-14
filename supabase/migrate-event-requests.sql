-- Event song requests
-- Two types: songs already in the repertoire, or new songs to learn.
-- Confirmed to_learn requests automatically stub a song into the songs table.

create table if not exists event_requests (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  type       text not null check (type in ('from_repertoire', 'to_learn')),
  song_id    uuid references songs(id) on delete set null,
  title      text not null,
  artist     text,
  status     text not null default 'requested' check (status in ('requested', 'confirmed', 'declined')),
  notes      text,
  created_at timestamptz not null default now()
);

alter table event_requests enable row level security;
