-- Allow authenticated users to delete their own notifications
-- (Required for "Clear All" and individual delete functionality)

drop policy if exists "owners delete notifications" on public.notifications;
create policy "owners delete notifications"
  on public.notifications
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
