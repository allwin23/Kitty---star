-- =====================================================================
-- Migration: Comprehensive Centralized XP Engine
-- File: 20260731140000_comprehensive_xp_rules_engine.sql
-- =====================================================================

-- 1. Ensure all XP Rules exist with generous rewards
INSERT INTO public.xp_rules (code, name, xp_amount, active) VALUES
  ('complete_pomodoro', 'Complete Focus Session', 25, true),
  ('water_logged', 'Log Hydration', 10, true),
  ('water_goal_completed', 'Hydration Goal Met', 30, true),
  ('vocabulary_learned', 'Learn Vocabulary Word', 15, true),
  ('grammar_completed', 'Complete Grammar Lesson', 20, true),
  ('flashcard_reviewed', 'Review Flashcard', 10, true),
  ('flashcard_created', 'Create Custom Flashcard', 15, true),
  ('pyq_completed', 'Complete PYQ Test Attempt', 40, true),
  ('submission_sent', 'Submit Daily Study Plan', 30, true),
  ('submission_approved', 'Partner Plan Approved', 60, true),
  ('approved_day', 'Approved Study Day', 60, true),
  ('task_completed', 'Complete Study Task', 15, true),
  ('seven_day_streak', '7 Day Study Streak', 100, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  xp_amount = EXCLUDED.xp_amount,
  active = true;

-- 2. Central XP Granting Function
CREATE OR REPLACE FUNCTION public.grant_user_xp(
  p_user_id UUID,
  p_xp INTEGER,
  p_rule_code TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_xp INTEGER := 0;
BEGIN
  IF p_user_id IS NULL OR p_xp IS NULL OR p_xp <= 0 THEN
    RETURN 0;
  END IF;

  -- 1. Safely add XP to user_stats.xp and update level
  INSERT INTO public.user_stats (user_id, xp, level)
  VALUES (p_user_id, p_xp, 1 + (p_xp / 100))
  ON CONFLICT (user_id) DO UPDATE SET
    xp = public.user_stats.xp + EXCLUDED.xp,
    level = 1 + ((public.user_stats.xp + EXCLUDED.xp) / 100),
    updated_at = now()
  RETURNING xp INTO v_new_xp;

  -- 2. Increment daily_user_activity.xp_earned for current_date
  BEGIN
    PERFORM public.increment_daily_user_activity(p_user_id, current_date, p_xp_earned => p_xp);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 3. Check and unlock system achievements for user
  BEGIN
    PERFORM public.unlock_user_achievements(p_user_id);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN v_new_xp;
END;
$$;

-- 3. Update award_module_xp to call grant_user_xp
CREATE OR REPLACE FUNCTION public.award_module_xp(
  p_rule_code     text,
  p_activity_date date default current_date
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_xp integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  SELECT xp_amount INTO v_xp
  FROM public.xp_rules
  WHERE code = p_rule_code AND active;

  v_xp := COALESCE(v_xp, 0);

  IF v_xp > 0 THEN
    PERFORM public.grant_user_xp(auth.uid(), v_xp, p_rule_code);
  END IF;

  RETURN v_xp;
END;
$$;

-- 4. Update apply_completed_pomodoro trigger to grant XP
CREATE OR REPLACE FUNCTION public.apply_completed_pomodoro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session_xp INTEGER := 25;
BEGIN
  IF NEW.completed AND NEW.session_type = 'focus' THEN
    PERFORM set_config('app.allow_task_progress', 'true', true);
    UPDATE public.current_tasks
    SET completed_minutes = completed_minutes + NEW.duration,
        completed_pomodoros = completed_pomodoros + 1
    WHERE id = NEW.task_id;

    -- Award focus session XP: 25 base + 1 XP per minute studied
    v_session_xp := 25 + GREATEST(1, NEW.duration);
    PERFORM public.grant_user_xp(NEW.user_id, v_session_xp, 'complete_pomodoro');
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Update log_water RPC to grant XP for water intake
CREATE OR REPLACE FUNCTION public.log_water(p_amount_ml integer)
RETURNS public.water_logs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_log               public.water_logs;
  v_streak            integer := 0;
  v_day               date    := current_date;
  v_was_goal_met      boolean := false;
  v_now_total         integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF p_amount_ml NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Water amount must be between 1 and 10 000 ml.';
  END IF;

  SELECT COALESCE(goal_completed, false) INTO v_was_goal_met
  FROM public.water_daily_stats
  WHERE user_id = auth.uid() AND date = current_date;

  INSERT INTO public.water_logs (user_id, amount_ml)
  VALUES (auth.uid(), p_amount_ml)
  RETURNING * INTO v_log;

  INSERT INTO public.water_daily_stats (user_id, date, total_ml, goal_completed)
  VALUES (auth.uid(), current_date, p_amount_ml, p_amount_ml >= 2000)
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_ml       = water_daily_stats.total_ml + EXCLUDED.total_ml,
    goal_completed = water_daily_stats.total_ml + EXCLUDED.total_ml >= water_daily_stats.goal_ml
  RETURNING total_ml INTO v_now_total;

  -- Recompute streak
  IF EXISTS (
    SELECT 1 FROM public.water_daily_stats
    WHERE user_id = auth.uid() AND date = current_date AND goal_completed
  ) THEN
    WHILE EXISTS (
      SELECT 1 FROM public.water_daily_stats
      WHERE user_id = auth.uid() AND date = v_day AND goal_completed
    ) LOOP
      v_streak := v_streak + 1;
      v_day := v_day - 1;
    END LOOP;
  END IF;

  UPDATE public.water_daily_stats
  SET current_streak = v_streak
  WHERE user_id = auth.uid() AND date = current_date;

  -- Grant XP for logging water
  PERFORM public.grant_user_xp(auth.uid(), 10, 'water_logged');

  -- Grant bonus XP if daily goal (2000ml) completed for the first time today
  IF (NOT v_was_goal_met) AND (v_now_total >= 2000) THEN
    PERFORM public.grant_user_xp(auth.uid(), 30, 'water_goal_completed');
  END IF;

  PERFORM public.record_activity_event(
    'water_logged', 'water_logs', v_log.id,
    jsonb_build_object('amount_ml', p_amount_ml),
    'private', 'water_logged', 'Water logged',
    'Logged ' || p_amount_ml || ' ml of water.', 'happy'
  );

  RETURN v_log;
END;
$$;

-- 6. Update submit_day RPC to grant XP for study plan submission
CREATE OR REPLACE FUNCTION public.submit_day(p_plan_id uuid, p_remark text default null)
RETURNS public.daily_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_submission public.daily_submissions;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND partner_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Connect a study partner before submitting a day.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.current_plans WHERE id = p_plan_id AND user_id = auth.uid() AND status = 'editing') THEN
    RAISE EXCEPTION 'Only your editing plan can be submitted.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.current_tasks WHERE plan_id = p_plan_id) THEN
    RAISE EXCEPTION 'A submitted plan requires at least one task.';
  END IF;

  PERFORM set_config('app.allow_plan_submission', 'true', true);
  UPDATE public.current_plans SET status = 'submitted', submitted_at = now() WHERE id = p_plan_id;

  INSERT INTO public.daily_submissions (user_id, plan_id, remark)
  VALUES (auth.uid(), p_plan_id, nullif(btrim(p_remark), ''))
  RETURNING * INTO v_submission;

  -- Grant XP for submitting study day to partner
  PERFORM public.grant_user_xp(auth.uid(), 30, 'submission_sent');

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT partner_id, 'submission_received', 'Study day ready for review', 'Your partner submitted a study day for review.', jsonb_build_object('submission_id', v_submission.id)
  FROM public.profiles WHERE id = auth.uid();

  RETURN v_submission;
END;
$$;

-- 7. Update recalculate_user_stats to preserve cumulative user_stats.xp
CREATE OR REPLACE FUNCTION public.recalculate_user_stats(p_user_id uuid)
RETURNS public.user_stats
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.user_stats;
  v_last_date date;
  v_cursor date;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_running_streak integer := 0;
  v_previous_date date;
  r record;
BEGIN
  INSERT INTO public.user_stats (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT max(date) INTO v_last_date FROM public.daily_reports WHERE user_id = p_user_id;
  v_cursor := v_last_date;
  WHILE v_cursor IS NOT NULL AND EXISTS (SELECT 1 FROM public.daily_reports WHERE user_id = p_user_id AND date = v_cursor AND approval_status = 'approved') LOOP
    v_current_streak := v_current_streak + 1;
    v_cursor := v_cursor - 1;
  END LOOP;
  FOR r IN SELECT date, approval_status FROM public.daily_reports WHERE user_id = p_user_id ORDER BY date LOOP
    IF r.approval_status = 'approved' THEN
      IF v_previous_date = r.date - 1 THEN
        v_running_streak := v_running_streak + 1;
      ELSE
        v_running_streak := 1;
      END IF;
      v_longest_streak := greatest(v_longest_streak, v_running_streak);
    ELSE
      v_running_streak := 0;
    END IF;
    v_previous_date := r.date;
  END LOOP;

  UPDATE public.user_stats SET
    total_minutes = COALESCE((SELECT sum(completed_minutes) FROM public.daily_reports WHERE user_id = p_user_id), 0),
    total_pomodoros = COALESCE((SELECT sum(total_pomodoros) FROM public.daily_reports WHERE user_id = p_user_id), 0),
    planned_tasks = COALESCE((SELECT sum(planned_tasks) FROM public.daily_reports WHERE user_id = p_user_id), 0),
    completed_tasks = COALESCE((SELECT sum(completed_tasks) FROM public.daily_reports WHERE user_id = p_user_id), 0),
    approved_days = (SELECT count(*) FROM public.daily_reports WHERE user_id = p_user_id AND approval_status = 'approved'),
    rejected_days = (SELECT count(*) FROM public.daily_reports WHERE user_id = p_user_id AND approval_status = 'rejected'),
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    xp = GREATEST(xp, COALESCE((SELECT sum(xp_earned) FROM public.daily_reports WHERE user_id = p_user_id), 0)),
    level = 1 + (GREATEST(xp, COALESCE((SELECT sum(xp_earned) FROM public.daily_reports WHERE user_id = p_user_id), 0)) / 100),
    updated_at = now()
  WHERE user_id = p_user_id;

  SELECT * INTO v_stats FROM public.user_stats WHERE user_id = p_user_id;
  RETURN v_stats;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_user_xp(uuid, integer, text) TO authenticated, service_role;
