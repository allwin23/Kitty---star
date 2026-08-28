-- =====================================================================
-- Migration: Make XP rewards much more stingy
-- File: 20260828151500_stingy_rewards.sql
-- =====================================================================

-- 1. Update public.xp_rules with stingy XP rewards
UPDATE public.xp_rules SET xp_amount = 2 WHERE code = 'complete_pomodoro';
UPDATE public.xp_rules SET xp_amount = 1 WHERE code = 'water_logged';
UPDATE public.xp_rules SET xp_amount = 2 WHERE code = 'water_goal_completed';
UPDATE public.xp_rules SET xp_amount = 1 WHERE code = 'vocabulary_learned';
UPDATE public.xp_rules SET xp_amount = 2 WHERE code = 'grammar_completed';
UPDATE public.xp_rules SET xp_amount = 1 WHERE code = 'flashcard_reviewed';
UPDATE public.xp_rules SET xp_amount = 1 WHERE code = 'flashcard_created';
UPDATE public.xp_rules SET xp_amount = 3 WHERE code = 'pyq_completed';
UPDATE public.xp_rules SET xp_amount = 2 WHERE code = 'submission_sent';
UPDATE public.xp_rules SET xp_amount = 3 WHERE code = 'submission_approved';
UPDATE public.xp_rules SET xp_amount = 4 WHERE code = 'approved_day';
UPDATE public.xp_rules SET xp_amount = 2 WHERE code = 'task_completed';
UPDATE public.xp_rules SET xp_amount = 10 WHERE code = 'seven_day_streak';

-- Insert urge_controlled rule
INSERT INTO public.xp_rules (code, name, xp_amount, active) VALUES
  ('urge_controlled', 'Control Urge Activity', 1, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  xp_amount = EXCLUDED.xp_amount,
  active = true;

-- 2. Update achievements table XP rewards
UPDATE public.achievements SET xp_reward = CASE
  WHEN code = 'first_pomodoro' THEN 5
  WHEN code = 'ten_pomodoros' THEN 10
  WHEN code = 'hundred_pomodoros' THEN 25
  WHEN code = 'five_hundred_pomodoros' THEN 50
  WHEN code = 'hundred_hours' THEN 50
  WHEN code = 'first_approved_day' THEN 5
  WHEN code = 'seven_day_streak' THEN 15
  WHEN code = 'thirty_day_streak' THEN 50
  WHEN code = 'first_pyq_test' THEN 5
  WHEN code = 'hundred_pyq_questions' THEN 15
  WHEN code = 'thousand_pyq_questions' THEN 50
  WHEN code = 'pyq_accuracy_master' THEN 25
  WHEN code = 'first_flashcard_review' THEN 5
  WHEN code = 'hundred_flashcards_reviewed' THEN 15
  WHEN code = 'five_hundred_flashcards_reviewed' THEN 50
  WHEN code = 'hundred_words_learned' THEN 15
  WHEN code = 'five_hundred_words_learned' THEN 50
  WHEN code = 'first_grammar_quiz' THEN 5
  WHEN code = 'grammar_expert' THEN 20
  WHEN code = 'seven_day_hydration' THEN 10
  WHEN code = 'thirty_day_hydration' THEN 30
  WHEN code = 'reach_level_five' THEN 15
  WHEN code = 'reach_level_ten' THEN 30
  WHEN code = 'reach_level_twenty' THEN 100
  ELSE 5
END;

-- 3. Override apply_completed_pomodoro trigger function to read from public.xp_rules
CREATE OR REPLACE FUNCTION public.apply_completed_pomodoro()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session_xp INTEGER := 2;
BEGIN
  IF NEW.completed AND NEW.session_type = 'focus' THEN
    PERFORM set_config('app.allow_task_progress', 'true', true);
    UPDATE public.current_tasks
    SET completed_minutes = completed_minutes + NEW.duration,
        completed_pomodoros = completed_pomodoros + 1
    WHERE id = NEW.task_id;

    -- Award focus session XP: read from xp_rules or default to 2
    SELECT COALESCE(xp_amount, 2) INTO v_session_xp
    FROM public.xp_rules
    WHERE code = 'complete_pomodoro' AND active;

    PERFORM public.grant_user_xp(NEW.user_id, v_session_xp, 'complete_pomodoro');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Override log_water function to read from public.xp_rules
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
  v_water_xp          integer := 1;
  v_water_goal_xp     integer := 2;
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
  SELECT COALESCE(xp_amount, 1) INTO v_water_xp FROM public.xp_rules WHERE code = 'water_logged' AND active;
  PERFORM public.grant_user_xp(auth.uid(), v_water_xp, 'water_logged');

  -- Grant bonus XP if daily goal (2000ml) completed for the first time today
  IF (NOT v_was_goal_met) AND (v_now_total >= 2000) THEN
    SELECT COALESCE(xp_amount, 2) INTO v_water_goal_xp FROM public.xp_rules WHERE code = 'water_goal_completed' AND active;
    PERFORM public.grant_user_xp(auth.uid(), v_water_goal_xp, 'water_goal_completed');
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

-- 5. Override submit_day function to read from public.xp_rules
CREATE OR REPLACE FUNCTION public.submit_day(p_plan_id uuid, p_remark text default null)
RETURNS public.daily_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission public.daily_submissions;
  v_submit_xp integer := 2;
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
  SELECT COALESCE(xp_amount, 2) INTO v_submit_xp FROM public.xp_rules WHERE code = 'submission_sent' AND active;
  PERFORM public.grant_user_xp(auth.uid(), v_submit_xp, 'submission_sent');

  INSERT INTO public.notifications (user_id, type, title, body, data)
  SELECT partner_id, 'submission_received', 'Study day ready for review', 'Your partner submitted a study day for review.', jsonb_build_object('submission_id', v_submission.id)
  FROM public.profiles WHERE id = auth.uid();

  RETURN v_submission;
END;
$$;

-- 6. Override review_flashcard function to read from public.xp_rules
CREATE OR REPLACE FUNCTION public.review_flashcard(
  p_card_id uuid,
  p_rating  public.flashcard_review_rating
)
RETURNS public.flashcard_reviews
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_review public.flashcard_reviews;
  v_ease numeric(4,2);
  v_interval integer;
  v_reps integer;
  v_next timestamptz;
  v_review_xp integer := 1;
BEGIN
  -- 1. Authenticated user check
  IF auth.uid() IS NULL THEN 
    RAISE EXCEPTION 'Authentication is required.'; 
  END IF;

  -- 2. Flexible access check (allows both user-created cards and built-in cards)
  IF NOT EXISTS (
    SELECT 1 FROM public.flashcards f
    LEFT JOIN public.flashcard_collections fc ON fc.id = f.collection_id
    WHERE f.id = p_card_id AND (f.type = 'builtin' OR fc.user_id = auth.uid() OR f.created_by = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Flashcard was not found or access denied.';
  END IF;

  -- 3. Record the review entry in flashcard_reviews
  INSERT INTO public.flashcard_reviews (card_id, user_id, rating)
  VALUES (p_card_id, auth.uid(), p_rating)
  RETURNING * INTO v_review;

  -- 4. Fetch current schedule or initialize defaults
  SELECT ease_factor, interval_days, repetitions
  INTO v_ease, v_interval, v_reps
  FROM public.flashcard_schedule
  WHERE card_id = p_card_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    v_ease := 2.50;
    v_interval := 0;
    v_reps := 0;
  END IF;

  -- 5. Calculate next spaced repetition schedule (SM-2 algorithm)
  IF p_rating = 'again' THEN
    v_ease := greatest(1.30, v_ease - 0.20);
    v_interval := 0;
    v_reps := 0;
  ELSIF p_rating = 'hard' THEN
    v_ease := greatest(1.30, v_ease - 0.15);
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 3;
    ELSE
      v_interval := ceil(v_interval * 1.20);
    END IF;
    v_reps := v_reps + 1;
  ELSIF p_rating = 'good' THEN
    IF v_reps = 0 THEN
      v_interval := 1;
    ELSIF v_reps = 1 THEN
      v_interval := 4;
    ELSE
      v_interval := ceil(v_interval * v_ease);
    END IF;
    v_reps := v_reps + 1;
  ELSIF p_rating = 'easy' THEN
    v_ease := least(3.00, v_ease + 0.15);
    IF v_reps = 0 THEN
      v_interval := 4;
    ELSIF v_reps = 1 THEN
      v_interval := 8;
    ELSE
      v_interval := ceil(v_interval * v_ease * 1.30);
    END IF;
    v_reps := v_reps + 1;
  END IF;

  IF v_interval = 0 THEN
    v_next := now() + interval '10 minutes';
  ELSE
    v_next := now() + (v_interval || ' days')::interval;
  END IF;

  -- 6. Upsert schedule
  INSERT INTO public.flashcard_schedule (
    card_id, user_id, next_review, last_review, ease_factor, interval_days, repetitions
  ) VALUES (
    p_card_id, auth.uid(), v_next, now(), v_ease, v_interval, v_reps
  )
  ON CONFLICT (card_id, user_id) DO UPDATE SET
    next_review   = v_next,
    last_review   = now(),
    ease_factor   = v_ease,
    interval_days = v_interval,
    repetitions   = v_reps;

  -- 7. Grant XP & record activity
  SELECT COALESCE(xp_amount, 1) INTO v_review_xp FROM public.xp_rules WHERE code = 'flashcard_reviewed' AND active;
  PERFORM public.grant_user_xp(auth.uid(), v_review_xp, 'flashcard_reviewed');

  PERFORM public.record_activity_event(
    'flashcard_reviewed', 'flashcard_reviews', v_review.id,
    jsonb_build_object('card_id', p_card_id, 'rating', p_rating),
    'private', 'flashcard_reviewed', 'Flashcard reviewed',
    'You reviewed a flashcard.', 'happy'
  );

  RETURN v_review;
END;
$$;
