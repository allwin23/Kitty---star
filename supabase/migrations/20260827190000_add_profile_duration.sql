-- Alter focus_profiles table to store default session duration
alter table public.focus_profiles add column duration_minutes integer default 25 not null;
