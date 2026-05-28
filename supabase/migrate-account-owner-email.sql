alter table invoice_settings
  add column if not exists account_owner_email text;
