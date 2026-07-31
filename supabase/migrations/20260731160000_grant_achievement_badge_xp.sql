-- =====================================================================
-- Migration: Grant Bonus XP for Unlocked Achievement Badges
-- File: 20260731160000_grant_achievement_badge_xp.sql
-- =====================================================================

-- 1. Add xp_reward column to achievements table if not exists
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS xp_reward INTEGER NOT NULL DEFAULT 50;

-- 2. Populate XP rewards for all master achievement badges
UPDATE public.achievements SET xp_reward = CASE
  WHEN code = 'first_pomodoro' THEN 50
  WHEN code = 'ten_pomodoros' THEN 100
  WHEN code = 'hundred_pomodoros' THEN 250
  WHEN code = 'five_hundred_pomodoros' THEN 500
  WHEN code = 'hundred_hours' THEN 500
  WHEN code = 'first_approved_day' THEN 50
  WHEN code = 'seven_day_streak' THEN 150
  WHEN code = 'thirty_day_streak' THEN 500
  WHEN code = 'first_pyq_test' THEN 50
  WHEN code = 'hundred_pyq_questions' THEN 150
  WHEN code = 'thousand_pyq_questions' THEN 500
  WHEN code = 'pyq_accuracy_master' THEN 250
  WHEN code = 'first_flashcard_review' THEN 50
  WHEN code = 'hundred_flashcards_reviewed' THEN 150
  WHEN code = 'five_hundred_flashcards_reviewed' THEN 500
  WHEN code = 'hundred_words_learned' THEN 150
  WHEN code = 'five_hundred_words_learned' THEN 500
  WHEN code = 'first_grammar_quiz' THEN 50
  WHEN code = 'grammar_expert' THEN 200
  WHEN code = 'seven_day_hydration' THEN 100
  WHEN code = 'thirty_day_hydration' THEN 300
  WHEN code = 'reach_level_five' THEN 150
  WHEN code = 'reach_level_ten' THEN 300
  WHEN code = 'reach_level_twenty' THEN 1000
  ELSE 50
END;

-- 3. Upgrade unlock_user_achievements to credit achievement badge XP to user_stats
CREATE OR REPLACE FUNCTION public.unlock_user_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats public.user_stats;
  v_pyq public.pyq_stats;
  v_vocab public.vocabulary_stats;
  v_grammar public.grammar_stats;
  v_water public.water_daily_stats;
  v_fc_reviews integer := 0;
  v_total_unlocked_xp integer := 0;
  v_reward_amount integer := 0;
  r record;
BEGIN
  SELECT * INTO v_stats FROM public.user_stats WHERE user_id = p_user_id;
  SELECT * INTO v_pyq FROM public.pyq_stats WHERE user_id = p_user_id;
  SELECT * INTO v_vocab FROM public.vocabulary_stats WHERE user_id = p_user_id;
  SELECT * INTO v_grammar FROM public.grammar_stats WHERE user_id = p_user_id;
  SELECT * INTO v_water FROM public.water_daily_stats WHERE user_id = p_user_id ORDER BY date DESC LIMIT 1;
  SELECT count(*) INTO v_fc_reviews FROM public.flashcard_reviews WHERE user_id = p_user_id;

  -- Insert newly qualified achievements and sum up their bonus XP
  FOR r IN
    INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT p_user_id, a.id
    FROM public.achievements a
    WHERE (
         (a.code = 'first_pomodoro' AND COALESCE(v_stats.total_pomodoros, 0) >= 1)
      OR (a.code = 'ten_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 10)
      OR (a.code = 'hundred_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 100)
      OR (a.code = 'five_hundred_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 500)
      OR (a.code = 'hundred_hours' AND COALESCE(v_stats.total_minutes, 0) >= 6000)

      OR (a.code = 'first_approved_day' AND COALESCE(v_stats.approved_days, 0) >= 1)
      OR (a.code = 'seven_day_streak' AND COALESCE(v_stats.longest_streak, 0) >= 7)
      OR (a.code = 'thirty_day_streak' AND COALESCE(v_stats.longest_streak, 0) >= 30)

      OR (a.code = 'first_pyq_test' AND COALESCE(v_pyq.total_tests, 0) >= 1)
      OR (a.code = 'hundred_pyq_questions' AND COALESCE(v_pyq.total_questions, 0) >= 100)
      OR (a.code = 'thousand_pyq_questions' AND COALESCE(v_pyq.total_questions, 0) >= 1000)
      OR (a.code = 'pyq_accuracy_master' AND COALESCE(v_pyq.accuracy, 0) >= 95 AND COALESCE(v_pyq.total_questions, 0) >= 20)

      OR (a.code = 'first_flashcard_review' AND v_fc_reviews >= 1)
      OR (a.code = 'hundred_flashcards_reviewed' AND v_fc_reviews >= 100)
      OR (a.code = 'five_hundred_flashcards_reviewed' AND v_fc_reviews >= 500)

      OR (a.code = 'hundred_words_learned' AND COALESCE(v_vocab.total_words, 0) >= 100)
      OR (a.code = 'five_hundred_words_learned' AND COALESCE(v_vocab.total_words, 0) >= 500)

      OR (a.code = 'first_grammar_quiz' AND COALESCE(v_grammar.total_questions, 0) >= 1)
      OR (a.code = 'grammar_expert' AND COALESCE(v_grammar.total_questions, 0) >= 50)

      OR (a.code = 'seven_day_hydration' AND COALESCE(v_water.current_streak, 0) >= 7)
      OR (a.code = 'thirty_day_hydration' AND COALESCE(v_water.current_streak, 0) >= 30)

      OR (a.code = 'reach_level_five' AND COALESCE(v_stats.level, 1) >= 5)
      OR (a.code = 'reach_level_ten' AND COALESCE(v_stats.level, 1) >= 10)
      OR (a.code = 'reach_level_twenty' AND COALESCE(v_stats.level, 1) >= 20)
    )
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    RETURNING achievement_id
  LOOP
    SELECT COALESCE(xp_reward, 50) INTO v_reward_amount FROM public.achievements WHERE id = r.achievement_id;
    v_total_unlocked_xp := v_total_unlocked_xp + v_reward_amount;
  END LOOP;

  -- Add newly earned achievement badge XP to user_stats
  IF v_total_unlocked_xp > 0 THEN
    UPDATE public.user_stats
    SET xp = xp + v_total_unlocked_xp,
        level = 1 + ((xp + v_total_unlocked_xp) / 100),
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;
