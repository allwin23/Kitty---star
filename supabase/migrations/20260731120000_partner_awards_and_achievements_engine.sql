-- ============================================================================
-- Partner Awards Table, send_partner_award RPC, Realtime Subscriptions,
-- and Expanded Automatic Achievement Engine
-- ============================================================================

-- 1. Create Partner Awards Table
CREATE TABLE IF NOT EXISTS public.partner_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  message text CHECK (message IS NULL OR char_length(btrim(message)) <= 500),
  icon text NOT NULL DEFAULT '🌟',
  color text NOT NULL DEFAULT '#4F46E5',
  xp_bonus integer NOT NULL DEFAULT 50 CHECK (xp_bonus >= 0 AND xp_bonus <= 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for querying recipient & sender awards
CREATE INDEX IF NOT EXISTS partner_awards_recipient_idx ON public.partner_awards (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_awards_sender_idx ON public.partner_awards (sender_id, created_at DESC);

-- Enable RLS & set policies
ALTER TABLE public.partner_awards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users and partners read awards" ON public.partner_awards;
CREATE POLICY "users and partners read awards"
  ON public.partner_awards FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR
    recipient_id = auth.uid() OR
    public.is_partner_of(recipient_id) OR
    public.is_partner_of(sender_id)
  );

-- 2. Create send_partner_award RPC
CREATE OR REPLACE FUNCTION public.send_partner_award(
  p_recipient_id uuid,
  p_title text,
  p_message text DEFAULT NULL,
  p_icon text DEFAULT '🌟',
  p_color text DEFAULT '#4F46E5',
  p_xp_bonus integer DEFAULT 50
)
RETURNS public.partner_awards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_id uuid := auth.uid();
  v_award public.partner_awards;
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  -- Ensure sender and recipient are connected study partners
  IF NOT public.is_partner_of(p_recipient_id) THEN
    RAISE EXCEPTION 'You can only send awards to your connected study partner.';
  END IF;

  IF p_xp_bonus < 0 OR p_xp_bonus > 1000 THEN
    RAISE EXCEPTION 'XP bonus must be between 0 and 1000.';
  END IF;

  -- Create partner award
  INSERT INTO public.partner_awards (
    sender_id, recipient_id, title, message, icon, color, xp_bonus
  )
  VALUES (
    v_sender_id, p_recipient_id, btrim(p_title), btrim(p_message), COALESCE(p_icon, '🌟'), COALESCE(p_color, '#4F46E5'), p_xp_bonus
  )
  RETURNING * INTO v_award;

  -- Grant XP bonus to recipient if > 0
  IF p_xp_bonus > 0 THEN
    UPDATE public.user_stats
    SET xp = xp + p_xp_bonus,
        level = (xp + p_xp_bonus) / 100 + 1,
        updated_at = now()
    WHERE user_id = p_recipient_id;
  END IF;

  -- Send real-time notification to recipient
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    p_recipient_id,
    'achievement_unlocked',
    'Received a Partner Award! ' || COALESCE(p_icon, '🌟'),
    COALESCE(p_message, 'Your study partner awarded you: ' || p_title),
    jsonb_build_object('award_id', v_award.id, 'title', p_title, 'sender_id', v_sender_id, 'xp_bonus', p_xp_bonus)
  );

  RETURN v_award;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_partner_award TO authenticated;

-- Add partner_awards to realtime publication
ALTER TABLE public.partner_awards REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'partner_awards'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_awards;
  END IF;
END;
$$;

-- 3. Expand Master Achievements Catalog
INSERT INTO public.achievements (code, name, description) VALUES
  ('first_pomodoro', 'First Pomodoro', 'Complete your first focus session.'),
  ('ten_pomodoros', '10 Pomodoros', 'Complete 10 focus sessions.'),
  ('hundred_pomodoros', '100 Pomodoros', 'Complete 100 focus sessions.'),
  ('five_hundred_pomodoros', '500 Pomodoros', 'Complete 500 focus sessions.'),
  ('hundred_hours', '100 Hours Studied', 'Complete 100 hours of focused study.'),
  ('first_approved_day', 'First Approved Day', 'Earn approval for your first submitted study day.'),
  ('seven_day_streak', '7 Day Streak', 'Maintain a 7-day approved study streak.'),
  ('thirty_day_streak', '30 Day Streak', 'Maintain a 30-day approved study streak.'),
  ('first_pyq_test', 'First PYQ Test', 'Complete your first PYQ practice test.'),
  ('hundred_pyq_questions', '100 Questions Solved', 'Solve 100 PYQ questions.'),
  ('thousand_pyq_questions', '1,000 Questions Solved', 'Solve 1,000 PYQ questions.'),
  ('pyq_accuracy_master', 'Accuracy Master', 'Achieve 95%+ accuracy on PYQ practice.'),
  ('first_flashcard_review', 'First Flashcard Review', 'Complete your first flashcard review.'),
  ('hundred_flashcards_reviewed', '100 Cards Reviewed', 'Review 100 flashcards.'),
  ('five_hundred_flashcards_reviewed', '500 Cards Reviewed', 'Review 500 flashcards.'),
  ('hundred_words_learned', '100 Words Learned', 'Learn 100 vocabulary words.'),
  ('five_hundred_words_learned', '500 Words Learned', 'Learn 500 vocabulary words.'),
  ('first_grammar_quiz', 'Grammar Beginner', 'Complete your first grammar quiz.'),
  ('grammar_expert', 'Grammar Expert', 'Solve 50+ grammar quiz questions.'),
  ('seven_day_hydration', '7 Day Hydration', 'Maintain a 7-day water intake goal streak.'),
  ('thirty_day_hydration', '30 Day Hydration', 'Maintain a 30-day water intake goal streak.'),
  ('reach_level_five', 'Level 5 Scholar', 'Reach Level 5 in study experience.'),
  ('reach_level_ten', 'Level 10 Expert', 'Reach Level 10 in study experience.'),
  ('reach_level_twenty', 'Level 20 Legend', 'Reach Level 20 in study experience.')
ON CONFLICT (code) DO UPDATE SET name = excluded.name, description = excluded.description;

-- 4. Expanded Automatic Achievement Engine Function
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
BEGIN
  SELECT * INTO v_stats FROM public.user_stats WHERE user_id = p_user_id;
  SELECT * INTO v_pyq FROM public.pyq_stats WHERE user_id = p_user_id;
  SELECT * INTO v_vocab FROM public.vocabulary_stats WHERE user_id = p_user_id;
  SELECT * INTO v_grammar FROM public.grammar_stats WHERE user_id = p_user_id;
  SELECT * INTO v_water FROM public.water_daily_stats WHERE user_id = p_user_id ORDER BY date DESC LIMIT 1;
  SELECT count(*) INTO v_fc_reviews FROM public.flashcard_reviews WHERE user_id = p_user_id;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT p_user_id, a.id
  from public.achievements a
  WHERE
     -- Pomodoro & Study Time
     (a.code = 'first_pomodoro' AND COALESCE(v_stats.total_pomodoros, 0) >= 1)
  OR (a.code = 'ten_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 10)
  OR (a.code = 'hundred_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 100)
  OR (a.code = 'five_hundred_pomodoros' AND COALESCE(v_stats.total_pomodoros, 0) >= 500)
  OR (a.code = 'hundred_hours' AND COALESCE(v_stats.total_minutes, 0) >= 6000)

     -- Accountability & Streaks
  OR (a.code = 'first_approved_day' AND COALESCE(v_stats.approved_days, 0) >= 1)
  OR (a.code = 'seven_day_streak' AND COALESCE(v_stats.longest_streak, 0) >= 7)
  OR (a.code = 'thirty_day_streak' AND COALESCE(v_stats.longest_streak, 0) >= 30)

     -- PYQ
  OR (a.code = 'first_pyq_test' AND COALESCE(v_pyq.total_tests, 0) >= 1)
  OR (a.code = 'hundred_pyq_questions' AND COALESCE(v_pyq.total_questions, 0) >= 100)
  OR (a.code = 'thousand_pyq_questions' AND COALESCE(v_pyq.total_questions, 0) >= 1000)
  OR (a.code = 'pyq_accuracy_master' AND COALESCE(v_pyq.accuracy, 0) >= 95 AND COALESCE(v_pyq.total_questions, 0) >= 20)

     -- Flashcards
  OR (a.code = 'first_flashcard_review' AND v_fc_reviews >= 1)
  OR (a.code = 'hundred_flashcards_reviewed' AND v_fc_reviews >= 100)
  OR (a.code = 'five_hundred_flashcards_reviewed' AND v_fc_reviews >= 500)

     -- Vocabulary
  OR (a.code = 'hundred_words_learned' AND COALESCE(v_vocab.total_words, 0) >= 100)
  OR (a.code = 'five_hundred_words_learned' AND COALESCE(v_vocab.total_words, 0) >= 500)

     -- Grammar
  OR (a.code = 'first_grammar_quiz' AND COALESCE(v_grammar.total_questions, 0) >= 1)
  OR (a.code = 'grammar_expert' AND COALESCE(v_grammar.total_questions, 0) >= 50)

     -- Water
  OR (a.code = 'seven_day_hydration' AND COALESCE(v_water.current_streak, 0) >= 7)
  OR (a.code = 'thirty_day_hydration' AND COALESCE(v_water.current_streak, 0) >= 30)

     -- Level & XP
  OR (a.code = 'reach_level_five' AND COALESCE(v_stats.level, 1) >= 5)
  OR (a.code = 'reach_level_ten' AND COALESCE(v_stats.level, 1) >= 10)
  OR (a.code = 'reach_level_twenty' AND COALESCE(v_stats.level, 1) >= 20)

  ON CONFLICT (user_id, achievement_id) DO NOTHING;
END;
$$;
