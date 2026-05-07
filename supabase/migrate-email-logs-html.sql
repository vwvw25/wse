-- Add html column to email_logs for viewing sent emails
alter table email_logs add column if not exists html text;
