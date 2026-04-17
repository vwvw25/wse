create table if not exists tag_options (
  id uuid primary key default gen_random_uuid(),
  category text not null,   -- 'tempo' | 'era' | 'genre' | 'special' | 'occasion'
  value text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique(category, value)
);

insert into tag_options (category, value, sort_order) values
  -- Tempo
  ('tempo', 'Chilled', 0),
  ('tempo', 'Midbeat', 1),
  ('tempo', 'Upbeat', 2),
  -- Era
  ('era', '1920s', 0),
  ('era', '1930s', 1),
  ('era', '1940s', 2),
  ('era', '1950s', 3),
  ('era', '1960s', 4),
  ('era', '1970s', 5),
  ('era', '1980s', 6),
  ('era', '1990s', 7),
  ('era', '2000s', 8),
  ('era', '2010s', 9),
  ('era', '2020s', 10),
  -- Genre
  ('genre', 'Jazz', 0),
  ('genre', 'Soul', 1),
  ('genre', 'Funk', 2),
  ('genre', 'Pop', 3),
  ('genre', 'Classical', 4),
  ('genre', 'Folk', 5),
  ('genre', 'Rock', 6),
  ('genre', 'Motown', 7),
  ('genre', 'Americana', 8),
  -- Special category
  ('special', 'PMJ/Vintage Twist', 0),
  ('special', 'Christmas', 1),
  ('special', 'British', 2),
  ('special', 'American', 3),
  -- Occasion
  ('occasion', 'Wedding Ceremony', 0),
  ('occasion', 'Background Drinks', 1),
  ('occasion', 'Party Band', 2)
on conflict (category, value) do nothing;
