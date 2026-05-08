alter table monitoring_settings
  add column if not exists reply_to_email text;
