-- Alter user_settings table to store study email configuration
alter table public.user_settings add column study_email text default '' not null;
