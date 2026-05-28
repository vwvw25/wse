alter table event_musicians
  add column if not exists musician_invoice_due_date date;
