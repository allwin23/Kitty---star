-- Migration: 20260801100000_intelligent_notification_system.sql
-- Description: Comprehensive database support for the Intelligent Event-Driven Notification Engine & AI Brain

-- 1. Upgrade public.notifications table to support rich event-driven notifications
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  ADD COLUMN IF NOT EXISTS category text DEFAULT 'study' CHECK (category IN ('study', 'partner', 'water', 'achievements', 'ai_coach', 'reports', 'social')),
  ADD COLUMN IF NOT EXISTS channel text DEFAULT 'both' CHECK (channel IN ('push', 'in_app', 'both')),
  ADD COLUMN IF NOT EXISTS relevance_score numeric DEFAULT 0.8 CHECK (relevance_score BETWEEN 0 AND 1),
  ADD COLUMN IF NOT EXISTS action_url text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;

-- Indexes for performance & grouping
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON public.notifications (user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_category_idx ON public.notifications (user_id, category, created_at DESC);

-- 2. Create notification_preferences table for storing user notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  partner_enabled boolean NOT NULL DEFAULT true,
  water_reminders_enabled boolean NOT NULL DEFAULT true,
  study_reminders_enabled boolean NOT NULL DEFAULT true,
  ai_coaching_enabled boolean NOT NULL DEFAULT true,
  daily_reports_enabled boolean NOT NULL DEFAULT true,
  weekly_reports_enabled boolean NOT NULL DEFAULT true,
  achievement_enabled boolean NOT NULL DEFAULT true,
  social_activity_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start text NOT NULL DEFAULT '22:00',
  quiet_hours_end text NOT NULL DEFAULT '07:00',
  relevance_threshold numeric NOT NULL DEFAULT 0.6 CHECK (relevance_threshold BETWEEN 0 AND 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own notification preferences" ON public.notification_preferences
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "users insert own notification preferences" ON public.notification_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users update own notification preferences" ON public.notification_preferences
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- RPC to get or create notification preferences
CREATE OR REPLACE FUNCTION public.get_or_create_notification_preferences(p_user_id uuid)
RETURNS public.notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs public.notification_preferences;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO NOTHING
    RETURNING * INTO v_prefs;
    
    IF v_prefs IS NULL THEN
      SELECT * INTO v_prefs FROM public.notification_preferences WHERE user_id = p_user_id;
    END IF;
  END IF;
  
  RETURN v_prefs;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_notification_preferences(uuid) TO authenticated;
