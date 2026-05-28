alter table event_musicians
  add column if not exists musician_invoice_status text,
  add column if not exists musician_invoice_path text,
  add column if not exists musician_invoice_filename text,
  add column if not exists musician_payment_date date;
