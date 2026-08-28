-- Add user_settings to realtime publication to allow syncing study email changes in real-time
alter publication supabase_realtime add table public.user_settings;
