-- ============================================================================
-- Allow connected study partners to view each other's statistics
-- Uses security definer function is_partner_of(user_id) to bypass profile RLS
-- ============================================================================

-- profiles: allow reading partner's profile (for name/avatar display)
DROP POLICY IF EXISTS "partners_read_profiles" ON public.profiles;
CREATE POLICY "partners_read_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_partner_of(id));

-- user_stats
DROP POLICY IF EXISTS "owners read stats" ON public.user_stats;
DROP POLICY IF EXISTS "owners and partners read stats" ON public.user_stats;
CREATE POLICY "owners and partners read stats"
  ON public.user_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- daily_user_activity
DROP POLICY IF EXISTS "owners read daily activity" ON public.daily_user_activity;
DROP POLICY IF EXISTS "owners and partners read daily activity" ON public.daily_user_activity;
CREATE POLICY "owners and partners read daily activity"
  ON public.daily_user_activity FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- daily_reports
DROP POLICY IF EXISTS "owners read reports" ON public.daily_reports;
DROP POLICY IF EXISTS "owners and partners read reports" ON public.daily_reports;
CREATE POLICY "owners and partners read reports"
  ON public.daily_reports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- report_tasks
DROP POLICY IF EXISTS "owners read report tasks" ON public.report_tasks;
DROP POLICY IF EXISTS "owners and partners read report tasks" ON public.report_tasks;
CREATE POLICY "owners and partners read report tasks"
  ON public.report_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.daily_reports dr
      WHERE dr.id = report_id AND (dr.user_id = auth.uid() OR public.is_partner_of(dr.user_id))
    )
  );

-- user_achievements
DROP POLICY IF EXISTS "owners read earned achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "owners and partners read earned achievements" ON public.user_achievements;
CREATE POLICY "owners and partners read earned achievements"
  ON public.user_achievements FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- pyq_stats
DROP POLICY IF EXISTS "owners read pyq stats" ON public.pyq_stats;
DROP POLICY IF EXISTS "owners and partners read pyq stats" ON public.pyq_stats;
CREATE POLICY "owners and partners read pyq stats"
  ON public.pyq_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- pyq_attempts
DROP POLICY IF EXISTS "owners read pyq attempts" ON public.pyq_attempts;
DROP POLICY IF EXISTS "owners and partners read pyq attempts" ON public.pyq_attempts;
CREATE POLICY "owners and partners read pyq attempts"
  ON public.pyq_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- vocabulary_stats
DROP POLICY IF EXISTS "owners read vocabulary stats" ON public.vocabulary_stats;
DROP POLICY IF EXISTS "owners and partners read vocabulary stats" ON public.vocabulary_stats;
CREATE POLICY "owners and partners read vocabulary stats"
  ON public.vocabulary_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- grammar_stats
DROP POLICY IF EXISTS "owners read grammar stats" ON public.grammar_stats;
DROP POLICY IF EXISTS "owners and partners read grammar stats" ON public.grammar_stats;
CREATE POLICY "owners and partners read grammar stats"
  ON public.grammar_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- grammar_attempts
DROP POLICY IF EXISTS "owners read grammar attempts" ON public.grammar_attempts;
DROP POLICY IF EXISTS "owners and partners read grammar attempts" ON public.grammar_attempts;
CREATE POLICY "owners and partners read grammar attempts"
  ON public.grammar_attempts FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- water_daily_stats
DROP POLICY IF EXISTS "owners read water daily stats" ON public.water_daily_stats;
DROP POLICY IF EXISTS "owners and partners read water daily stats" ON public.water_daily_stats;
CREATE POLICY "owners and partners read water daily stats"
  ON public.water_daily_stats FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- flashcard_schedule
DROP POLICY IF EXISTS "owners read flashcard schedule" ON public.flashcard_schedule;
DROP POLICY IF EXISTS "owners and partners read flashcard schedule" ON public.flashcard_schedule;
CREATE POLICY "owners and partners read flashcard schedule"
  ON public.flashcard_schedule FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

-- flashcard_reviews
DROP POLICY IF EXISTS "owners read flashcard reviews" ON public.flashcard_reviews;
DROP POLICY IF EXISTS "owners and partners read flashcard reviews" ON public.flashcard_reviews;
CREATE POLICY "owners and partners read flashcard reviews"
  ON public.flashcard_reviews FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));
