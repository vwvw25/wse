-- Migration: split musician name into first_name/last_name, add secondary_instrument
-- Run this in the Supabase SQL editor after migrate-musicians.sql

alter table musicians
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists secondary_instrument text;

-- Migrate any existing name values into first_name
update musicians set first_name = name where first_name = '' and name is not null;

alter table musicians drop column if exists name;
