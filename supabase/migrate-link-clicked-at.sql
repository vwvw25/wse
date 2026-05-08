alter table event_musicians
  add column if not exists link_clicked_at timestamptz;
