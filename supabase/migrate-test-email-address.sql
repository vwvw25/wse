-- Add test email address to monitoring settings
alter table monitoring_settings add column if not exists test_email_address text;
