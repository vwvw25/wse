-- Secondary bank account, selectable per-invoice
alter table invoice_settings
  add column if not exists bank_name_2 text,
  add column if not exists account_name_2 text,
  add column if not exists sort_code_2 text,
  add column if not exists account_number_2 text,
  add column if not exists iban_2 text,
  add column if not exists swift_2 text,
  add column if not exists bank_details_2_label text;

alter table invoices
  add column if not exists use_secondary_bank_details boolean not null default false;
