-- ============================================================================
-- Fix 1: Partner RLS policies
-- The old policies queried public.profiles to check partnership, but the
-- profiles table's RLS only allows reading your OWN row (auth.uid() = id).
-- So the subquery silently returned 0 rows → policy evaluated to FALSE.
-- Fix: Use the SECURITY DEFINER function is_partner_of() which bypasses RLS.
-- ============================================================================

-- current_plans: drop broken policy, recreate using is_partner_of
DROP POLICY IF EXISTS "partners_read_current_plans" ON public.current_plans;
CREATE POLICY "partners_read_current_plans"
  ON public.current_plans FOR SELECT TO authenticated
  USING (public.is_partner_of(user_id));

-- current_tasks: drop broken policy, recreate using is_partner_of
DROP POLICY IF EXISTS "partners_read_current_tasks" ON public.current_tasks;
CREATE POLICY "partners_read_current_tasks"
  ON public.current_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.current_plans cp
      WHERE cp.id = current_tasks.plan_id
      AND public.is_partner_of(cp.user_id)
    )
  );

-- initial_plans: fix partner read policy too
DROP POLICY IF EXISTS "partners_read_initial_plans" ON public.initial_plans;
CREATE POLICY "partners_read_initial_plans"
  ON public.initial_plans FOR SELECT TO authenticated
  USING (public.is_partner_of(user_id));

-- initial_tasks: fix partner read policy too
DROP POLICY IF EXISTS "partners_read_initial_tasks" ON public.initial_tasks;
CREATE POLICY "partners_read_initial_tasks"
  ON public.initial_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.initial_plans ip
      WHERE ip.id = initial_tasks.plan_id
      AND public.is_partner_of(ip.user_id)
    )
  );

-- ============================================================================
-- Fix 2: REPLICA IDENTITY FULL for Supabase Realtime
-- Without REPLICA IDENTITY FULL, UPDATE and DELETE WAL events only include
-- primary key columns. Supabase Realtime filters (like plan_id=eq.xxx) fail
-- because plan_id isn't in the WAL payload → events are silently dropped.
-- ============================================================================

ALTER TABLE public.current_plans REPLICA IDENTITY FULL;
ALTER TABLE public.current_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.daily_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Also add daily_reports to realtime publication for live report updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'daily_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
  END IF;
END;
$$;

-- ============================================================================
-- Fix 3: finalize_day storage cleanup can fail and rollback the entire txn
-- Wrap the storage.objects DELETE in an exception handler so report creation
-- succeeds even if storage cleanup fails (cleanup can happen later).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.finalize_day(p_submission_id uuid)
RETURNS public.daily_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.daily_submissions;
  v_plan public.current_plans;
  v_approval public.approvals;
  v_report public.daily_reports;
  v_streak integer := 0;
  v_pomodoros integer;
  v_completed_minutes integer;
  v_completed_tasks integer;
  v_xp integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;

  SELECT * INTO v_submission FROM public.daily_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission was not found.'; END IF;
  IF v_submission.status NOT IN ('approved', 'rejected') THEN RAISE EXCEPTION 'A decision is required before finalization.'; END IF;
  IF NOT (auth.uid() = v_submission.user_id OR public.is_partner_of(v_submission.user_id)) THEN RAISE EXCEPTION 'You cannot finalize this submission.'; END IF;

  SELECT * INTO v_plan FROM public.current_plans WHERE id = v_submission.plan_id FOR UPDATE;
  SELECT * INTO v_approval FROM public.approvals WHERE submission_id = v_submission.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Approval record was not found.'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_reports WHERE user_id = v_submission.user_id AND date = v_plan.date) THEN RAISE EXCEPTION 'This day has already been finalized.'; END IF;

  -- Calculate streak
  IF v_submission.status = 'approved' THEN
    SELECT coalesce(streak_after_day, 0) + 1 INTO v_streak
    FROM public.daily_reports
    WHERE user_id = v_submission.user_id AND approval_status = 'approved' AND date = v_plan.date - 1;
    v_streak := coalesce(v_streak, 1);
  END IF;

  -- Aggregate stats
  SELECT count(*) INTO v_pomodoros FROM public.pomodoro_sessions WHERE plan_id = v_plan.id AND session_type = 'focus';
  SELECT coalesce(sum(completed_minutes), 0), count(*) FILTER (WHERE status = 'completed')
  INTO v_completed_minutes, v_completed_tasks
  FROM public.current_tasks WHERE plan_id = v_plan.id;

  v_xp := public.calculate_day_xp(v_submission.status, v_pomodoros, v_streak);

  -- Create daily report
  INSERT INTO public.daily_reports (user_id, date, planned_minutes, completed_minutes, planned_tasks, completed_tasks, total_pomodoros, approval_status, review_comment, xp_earned, streak_after_day)
  SELECT v_submission.user_id, v_plan.date, coalesce(sum(estimated_minutes), 0), v_completed_minutes, count(*), v_completed_tasks, v_pomodoros, v_submission.status, v_approval.comment, v_xp, v_streak
  FROM public.current_tasks WHERE plan_id = v_plan.id
  RETURNING * INTO v_report;

  -- Snapshot tasks into report
  INSERT INTO public.report_tasks (report_id, title, estimated_minutes, completed_minutes, completed, pomodoros, "order")
  SELECT v_report.id, ct.title, ct.estimated_minutes, ct.completed_minutes, ct.status = 'completed', ct.completed_pomodoros, ct."order"
  FROM public.current_tasks ct WHERE ct.plan_id = v_plan.id ORDER BY ct."order";

  -- Send notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_submission.user_id,
    CASE WHEN v_submission.status = 'approved' THEN 'submission_approved' ELSE 'submission_rejected' END,
    CASE WHEN v_submission.status = 'approved' THEN 'Study day approved' ELSE 'Study day needs another try' END,
    coalesce(v_approval.comment, CASE WHEN v_submission.status = 'approved' THEN 'Your partner approved your study day.' ELSE 'Your partner reviewed your study day.' END),
    jsonb_build_object('report_id', v_report.id, 'date', v_plan.date)
  );

  -- Attempt to clean up storage objects (non-critical — don't rollback report on failure)
  BEGIN
    DELETE FROM storage.objects WHERE bucket_id = 'proof-images' AND name IN (
      SELECT image_url FROM public.submission_proofs WHERE submission_id = v_submission.id
    );
  EXCEPTION WHEN OTHERS THEN
    -- Storage cleanup failed; log but don't block report creation
    RAISE WARNING 'Storage cleanup failed for submission %: %', v_submission.id, SQLERRM;
  END;

  -- Clean up temporary records
  DELETE FROM public.initial_plans WHERE user_id = v_submission.user_id AND date = v_plan.date;
  DELETE FROM public.daily_submissions WHERE id = v_submission.id;
  DELETE FROM public.current_plans WHERE id = v_plan.id;

  -- Recalculate user stats (XP, streak, etc.)
  PERFORM public.recalculate_user_stats(v_submission.user_id);

  RETURN v_report;
END;
$$;
