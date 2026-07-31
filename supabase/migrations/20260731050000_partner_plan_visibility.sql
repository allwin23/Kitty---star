-- Allow partners to see each other's current plans during editing (for live task sync).
-- PostgreSQL ORs multiple SELECT policies on the same table, so these work
-- alongside the existing "owners and reviewers read ..." policies.

CREATE POLICY "partners_read_current_plans"
  ON public.current_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = current_plans.user_id
      AND p.partner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "partners_read_current_tasks"
  ON public.current_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.current_plans cp
      JOIN public.profiles p ON p.id = cp.user_id
      WHERE cp.id = current_tasks.plan_id
      AND p.partner_id = (SELECT auth.uid())
    )
  );

-- Allow partners to see each other's initial plans (for the review screen
-- to fetch the submitter's initial plan, not the reviewer's).

CREATE POLICY "partners_read_initial_plans"
  ON public.initial_plans FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = initial_plans.user_id
      AND p.partner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "partners_read_initial_tasks"
  ON public.initial_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.initial_plans ip
      JOIN public.profiles p ON p.id = ip.user_id
      WHERE ip.id = initial_tasks.plan_id
      AND p.partner_id = (SELECT auth.uid())
    )
  );
