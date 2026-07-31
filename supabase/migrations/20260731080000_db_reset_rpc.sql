CREATE OR REPLACE FUNCTION public.reset_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete transaction data
  TRUNCATE TABLE public.user_achievements CASCADE;
  TRUNCATE TABLE public.approvals CASCADE;
  TRUNCATE TABLE public.submission_proofs CASCADE;
  TRUNCATE TABLE public.daily_submissions CASCADE;
  TRUNCATE TABLE public.pomodoro_sessions CASCADE;
  TRUNCATE TABLE public.current_tasks CASCADE;
  TRUNCATE TABLE public.current_plans CASCADE;
  TRUNCATE TABLE public.initial_tasks CASCADE;
  TRUNCATE TABLE public.initial_plans CASCADE;
  TRUNCATE TABLE public.draft_tasks CASCADE;
  TRUNCATE TABLE public.planner_drafts CASCADE;
  TRUNCATE TABLE public.report_tasks CASCADE;
  TRUNCATE TABLE public.daily_reports CASCADE;
  TRUNCATE TABLE public.notifications CASCADE;

  UPDATE public.user_stats
  SET 
    total_minutes = 0,
    total_pomodoros = 0,
    planned_tasks = 0,
    completed_tasks = 0,
    approved_days = 0,
    rejected_days = 0,
    current_streak = 0,
    longest_streak = 0,
    xp = 0,
    level = 1,
    updated_at = now()
  WHERE user_id IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_all_data() TO authenticated;
