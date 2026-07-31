-- ============================================================================
-- XP Journey Feature — Duolingo-inspired Milestone & Surprise Reward System
-- ============================================================================

-- 1. Create journeys table
CREATE TABLE IF NOT EXISTS public.journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  partner_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  milestone_interval integer NOT NULL DEFAULT 500 CHECK (milestone_interval > 0),
  current_max_milestone integer NOT NULL DEFAULT 5000 CHECK (current_max_milestone >= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS journeys_user_idx ON public.journeys (user_id);
CREATE INDEX IF NOT EXISTS journeys_partner_idx ON public.journeys (partner_id);

-- 2. Create journey_milestones table
CREATE TABLE IF NOT EXISTS public.journey_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys (id) ON DELETE CASCADE,
  required_xp integer NOT NULL CHECK (required_xp > 0),
  reward_title text NOT NULL DEFAULT 'Mystery Reward',
  reward_description text NOT NULL DEFAULT 'Keep studying to unlock this surprise reward!',
  reward_image text,
  reward_emoji text NOT NULL DEFAULT '🎁',
  reward_color text NOT NULL DEFAULT '#4F46E5',
  is_hidden boolean NOT NULL DEFAULT true,
  is_unlocked boolean NOT NULL DEFAULT false,
  unlocked_at timestamptz,
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (journey_id, required_xp)
);

CREATE INDEX IF NOT EXISTS journey_milestones_journey_xp_idx ON public.journey_milestones (journey_id, required_xp ASC);
CREATE INDEX IF NOT EXISTS journey_milestones_unlocked_idx ON public.journey_milestones (journey_id, is_unlocked);

-- 3. Create journey_challenges table
CREATE TABLE IF NOT EXISTS public.journey_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.journey_milestones (id) ON DELETE CASCADE,
  deadline timestamptz NOT NULL,
  success_reward_message text NOT NULL,
  failure_message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (milestone_id)
);

-- 4. Create journey_events table
CREATE TABLE IF NOT EXISTS public.journey_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.journeys (id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('milestone_created', 'milestone_unlocked', 'reward_claimed', 'challenge_completed', 'challenge_failed')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journey_events_journey_created_idx ON public.journey_events (journey_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "owners and partners read journeys" ON public.journeys;
CREATE POLICY "owners and partners read journeys"
  ON public.journeys FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

DROP POLICY IF EXISTS "owners create journeys" ON public.journeys;
CREATE POLICY "owners create journeys"
  ON public.journeys FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners and partners update journeys" ON public.journeys;
CREATE POLICY "owners and partners update journeys"
  ON public.journeys FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_partner_of(user_id));

DROP POLICY IF EXISTS "owners and partners read milestones" ON public.journey_milestones;
CREATE POLICY "owners and partners read milestones"
  ON public.journey_milestones FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = journey_id AND (j.user_id = auth.uid() OR public.is_partner_of(j.user_id))
    )
  );

DROP POLICY IF EXISTS "partners manage milestones" ON public.journey_milestones;
CREATE POLICY "partners manage milestones"
  ON public.journey_milestones FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = journey_id AND (j.user_id = auth.uid() OR public.is_partner_of(j.user_id))
    )
  );

DROP POLICY IF EXISTS "owners and partners read challenges" ON public.journey_challenges;
CREATE POLICY "owners and partners read challenges"
  ON public.journey_challenges FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journey_milestones m
      JOIN public.journeys j ON j.id = m.journey_id
      WHERE m.id = milestone_id AND (j.user_id = auth.uid() OR public.is_partner_of(j.user_id))
    )
  );

DROP POLICY IF EXISTS "partners manage challenges" ON public.journey_challenges;
CREATE POLICY "partners manage challenges"
  ON public.journey_challenges FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journey_milestones m
      JOIN public.journeys j ON j.id = m.journey_id
      WHERE m.id = milestone_id AND (j.user_id = auth.uid() OR public.is_partner_of(j.user_id))
    )
  );

DROP POLICY IF EXISTS "owners and partners read events" ON public.journey_events;
CREATE POLICY "owners and partners read events"
  ON public.journey_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.journeys j
      WHERE j.id = journey_id AND (j.user_id = auth.uid() OR public.is_partner_of(j.user_id))
    )
  );

-- Realtime publication
ALTER TABLE public.journeys REPLICA IDENTITY FULL;
ALTER TABLE public.journey_milestones REPLICA IDENTITY FULL;
ALTER TABLE public.journey_challenges REPLICA IDENTITY FULL;
ALTER TABLE public.journey_events REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journeys') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journeys;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journey_milestones') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_milestones;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journey_challenges') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_challenges;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'journey_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.journey_events;
  END IF;
END;
$$;

-- 5. RPC: Expand milestones by N steps
CREATE OR REPLACE FUNCTION public.expand_journey_milestones(
  p_journey_id uuid,
  p_num_steps integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey public.journeys;
  v_next_xp integer;
  v_step integer;
BEGIN
  SELECT * INTO v_journey FROM public.journeys WHERE id = p_journey_id;
  IF NOT FOUND THEN RETURN; END IF;

  v_next_xp := v_journey.current_max_milestone;

  FOR v_step IN 1..p_num_steps LOOP
    v_next_xp := v_next_xp + v_journey.milestone_interval;
    INSERT INTO public.journey_milestones (
      journey_id, required_xp, reward_title, reward_description, reward_emoji, is_hidden
    )
    VALUES (
      v_journey.id,
      v_next_xp,
      'Mystery Reward (' || v_next_xp || ' XP)',
      'Keep studying to unlock this surprise reward!',
      '🎁',
      true
    )
    ON CONFLICT (journey_id, required_xp) DO NOTHING;
  END LOOP;

  UPDATE public.journeys
  SET current_max_milestone = v_next_xp,
      updated_at = now()
  WHERE id = p_journey_id;

  INSERT INTO public.journey_events (journey_id, event_type, data)
  VALUES (
    p_journey_id,
    'milestone_created',
    jsonb_build_object('new_max_xp', v_next_xp, 'added_steps', p_num_steps)
  );
END;
$$;

-- 6. RPC: Get or Create Journey
CREATE OR REPLACE FUNCTION public.get_or_create_journey(p_user_id uuid)
RETURNS public.journeys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey public.journeys;
  v_partner_id uuid;
  v_xp integer := 500;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT (auth.uid() = p_user_id OR public.is_partner_of(p_user_id)) THEN
    RAISE EXCEPTION 'Access denied.';
  END IF;

  SELECT * INTO v_journey FROM public.journeys WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    SELECT partner_id INTO v_partner_id FROM public.profiles WHERE id = p_user_id;

    INSERT INTO public.journeys (user_id, partner_id, milestone_interval, current_max_milestone)
    VALUES (p_user_id, v_partner_id, 500, 5000)
    RETURNING * INTO v_journey;

    -- Generate initial milestones from 500 to 5000
    WHILE v_xp <= 5000 LOOP
      INSERT INTO public.journey_milestones (
        journey_id, required_xp, reward_title, reward_description, reward_emoji, is_hidden
      )
      VALUES (
        v_journey.id,
        v_xp,
        'Mystery Reward (' || v_xp || ' XP)',
        'Keep studying to unlock this surprise reward!',
        '🎁',
        true
      )
      ON CONFLICT (journey_id, required_xp) DO NOTHING;

      v_xp := v_xp + 500;
    END LOOP;

    INSERT INTO public.journey_events (journey_id, event_type, data)
    VALUES (
      v_journey.id,
      'milestone_created',
      jsonb_build_object('initial_max_xp', 5000)
    );
  END IF;

  -- Ensure partner_id is up to date
  SELECT partner_id INTO v_partner_id FROM public.profiles WHERE id = p_user_id;
  IF v_partner_id IS DISTINCT FROM v_journey.partner_id THEN
    UPDATE public.journeys SET partner_id = v_partner_id WHERE id = v_journey.id RETURNING * INTO v_journey;
  END IF;

  -- Evaluate milestones against current XP
  PERFORM public.evaluate_journey_milestones(p_user_id);

  RETURN v_journey;
END;
$$;

-- 7. RPC: Evaluate Journey Milestones (Triggered on XP change)
CREATE OR REPLACE FUNCTION public.evaluate_journey_milestones(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey public.journeys;
  v_current_xp integer := 0;
  v_milestone record;
  v_challenge record;
  v_has_unlocked_max boolean := false;
BEGIN
  SELECT * INTO v_journey FROM public.journeys WHERE user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT coalesce(xp, 0) INTO v_current_xp FROM public.user_stats WHERE user_id = p_user_id;

  -- Check locked milestones against current XP
  FOR v_milestone IN
    SELECT * FROM public.journey_milestones
    WHERE journey_id = v_journey.id AND is_unlocked = false AND required_xp <= v_current_xp
    ORDER BY required_xp ASC
  LOOP
    -- Unlock milestone
    UPDATE public.journey_milestones
    SET is_unlocked = true,
        is_hidden = false,
        unlocked_at = now()
    WHERE id = v_milestone.id;

    -- Evaluate attached challenge if any
    SELECT * INTO v_challenge FROM public.journey_challenges WHERE milestone_id = v_milestone.id AND status = 'pending';
    IF FOUND THEN
      IF now() <= v_challenge.deadline THEN
        UPDATE public.journey_challenges
        SET status = 'success', completed_at = now()
        WHERE id = v_challenge.id;

        INSERT INTO public.journey_events (journey_id, event_type, data)
        VALUES (
          v_journey.id,
          'challenge_completed',
          jsonb_build_object('milestone_id', v_milestone.id, 'xp', v_milestone.required_xp, 'success_message', v_challenge.success_reward_message)
        );
      ELSE
        UPDATE public.journey_challenges
        SET status = 'failed', completed_at = now()
        WHERE id = v_challenge.id;

        INSERT INTO public.journey_events (journey_id, event_type, data)
        VALUES (
          v_journey.id,
          'challenge_failed',
          jsonb_build_object('milestone_id', v_milestone.id, 'xp', v_milestone.required_xp, 'failure_message', v_challenge.failure_message)
        );
      END IF;
    END IF;

    -- Create event log
    INSERT INTO public.journey_events (journey_id, event_type, data)
    VALUES (
      v_journey.id,
      'milestone_unlocked',
      jsonb_build_object('milestone_id', v_milestone.id, 'required_xp', v_milestone.required_xp, 'reward_title', v_milestone.reward_title)
    );

    -- Send notification to studying user
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      p_user_id,
      'achievement_unlocked',
      '🎉 Milestone Unlocked! (' || v_milestone.required_xp || ' XP)',
      'You unlocked your surprise reward: ' || v_milestone.reward_title,
      jsonb_build_object('milestone_id', v_milestone.id, 'required_xp', v_milestone.required_xp)
    );

    -- If highest milestone was unlocked, expand journey
    IF v_milestone.required_xp = v_journey.current_max_milestone THEN
      v_has_unlocked_max := true;
    END IF;
  END LOOP;

  -- Auto-expand if max milestone reached
  IF v_has_unlocked_max THEN
    PERFORM public.expand_journey_milestones(v_journey.id, 5);
  END IF;
END;
$$;

-- 8. RPC: Edit Journey Milestone Reward (Partner function)
CREATE OR REPLACE FUNCTION public.edit_journey_milestone(
  p_milestone_id uuid,
  p_reward_title text,
  p_reward_description text,
  p_reward_emoji text DEFAULT '🎁',
  p_reward_color text DEFAULT '#4F46E5',
  p_reward_image text DEFAULT NULL
)
RETURNS public.journey_milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone public.journey_milestones;
  v_journey public.journeys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT * INTO v_milestone FROM public.journey_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found.'; END IF;

  SELECT * INTO v_journey FROM public.journeys WHERE id = v_milestone.journey_id;
  IF NOT (auth.uid() = v_journey.user_id OR public.is_partner_of(v_journey.user_id)) THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  UPDATE public.journey_milestones
  SET reward_title = btrim(p_reward_title),
      reward_description = btrim(p_reward_description),
      reward_emoji = COALESCE(p_reward_emoji, '🎁'),
      reward_color = COALESCE(p_reward_color, '#4F46E5'),
      reward_image = p_reward_image,
      created_by = auth.uid()
  WHERE id = p_milestone_id
  RETURNING * INTO v_milestone;

  RETURN v_milestone;
END;
$$;

-- 9. RPC: Attach Challenge to Milestone
CREATE OR REPLACE FUNCTION public.attach_journey_challenge(
  p_milestone_id uuid,
  p_deadline timestamptz,
  p_success_message text,
  p_failure_message text
)
RETURNS public.journey_challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.journey_challenges;
  v_milestone public.journey_milestones;
  v_journey public.journeys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT * INTO v_milestone FROM public.journey_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found.'; END IF;

  SELECT * INTO v_journey FROM public.journeys WHERE id = v_milestone.journey_id;
  IF NOT (auth.uid() = v_journey.user_id OR public.is_partner_of(v_journey.user_id)) THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  INSERT INTO public.journey_challenges (
    milestone_id, deadline, success_reward_message, failure_message
  )
  VALUES (
    p_milestone_id, p_deadline, btrim(p_success_message), btrim(p_failure_message)
  )
  ON CONFLICT (milestone_id) DO UPDATE SET
    deadline = excluded.deadline,
    success_reward_message = excluded.success_reward_message,
    failure_message = excluded.failure_message,
    status = 'pending'
  RETURNING * INTO v_challenge;

  RETURN v_challenge;
END;
$$;

-- 10. RPC: Claim Journey Reward
CREATE OR REPLACE FUNCTION public.claim_journey_reward(p_milestone_id uuid)
RETURNS public.journey_milestones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_milestone public.journey_milestones;
  v_journey public.journeys;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required.'; END IF;

  SELECT * INTO v_milestone FROM public.journey_milestones WHERE id = p_milestone_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Milestone not found.'; END IF;

  SELECT * INTO v_journey FROM public.journeys WHERE id = v_milestone.journey_id;
  IF auth.uid() <> v_journey.user_id THEN
    RAISE EXCEPTION 'Only the journey owner can claim rewards.';
  END IF;

  IF NOT v_milestone.is_unlocked THEN
    RAISE EXCEPTION 'This milestone is not unlocked yet.';
  END IF;

  UPDATE public.journey_milestones
  SET is_claimed = true,
      claimed_at = now()
  WHERE id = p_milestone_id
  RETURNING * INTO v_milestone;

  INSERT INTO public.journey_events (journey_id, event_type, data)
  VALUES (
    v_journey.id,
    'reward_claimed',
    jsonb_build_object('milestone_id', v_milestone.id, 'reward_title', v_milestone.reward_title)
  );

  RETURN v_milestone;
END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_journey_milestones(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_journey(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_journey_milestones(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.edit_journey_milestone(uuid, text, text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_journey_challenge(uuid, timestamptz, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_journey_reward(uuid) TO authenticated;

-- 11. Trigger to auto-evaluate journey milestones when user_stats updates
CREATE OR REPLACE FUNCTION public.after_user_stats_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.xp IS DISTINCT FROM old.xp THEN
    PERFORM public.evaluate_journey_milestones(new.user_id);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS user_stats_evaluate_journey ON public.user_stats;
CREATE TRIGGER user_stats_evaluate_journey
  AFTER UPDATE ON public.user_stats
  FOR EACH ROW EXECUTE FUNCTION public.after_user_stats_updated();
