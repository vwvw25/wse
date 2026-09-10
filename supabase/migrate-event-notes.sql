-- Event notes: a running, date-ordered log of notes added to an event.
-- Each note records what was communicated / agreed (e.g. from an email chain),
-- so the platform keeps a paper trail rather than a single stale free-text field.

create table if not exists event_notes (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references events(id) on delete cascade,
  body       text not null,
  note_date  date not null default current_date,
  actor      text not null default 'admin',
  created_at timestamptz not null default now()
);

-- if the table already existed without note_date:
alter table event_notes add column if not exists note_date date not null default current_date;

alter table event_notes enable row level security;

create index if not exists event_notes_event_id_idx
  on event_notes (event_id, note_date, created_at);

-- Adding a note also writes an `event_activity_log` row (type = 'note') so it
-- shows on the Activity tab. The type CHECK constraint has to allow it.
alter table event_activity_log drop constraint if exists event_activity_log_type_check;
alter table event_activity_log add constraint event_activity_log_type_check check (
  type in (
    'field_change', 'status_change', 'musician_change', 'quote_change',
    'invoice_change', 'request_change', 'set_list_change', 'contract_change',
    'ai_agent_action', 'comment', 'note'
  )
);
