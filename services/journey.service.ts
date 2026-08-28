/**
 * journey.service.ts
 *
 * Backend service for the Duolingo-inspired XP Journey feature.
 * Connects to Supabase RPCs, database tables, and Realtime channels.
 */

import { supabase } from '@/lib/supabase';
import { throwIfError, throwIfErrorOrNull } from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

export type JourneyRow = TableRow<'journeys'>;
export type JourneyMilestoneRow = TableRow<'journey_milestones'>;
export type JourneyChallengeRow = TableRow<'journey_challenges'>;
export type JourneyEventRow = TableRow<'journey_events'>;

export interface EditMilestoneInput {
  milestone_id: string;
  reward_title: string;
  reward_description: string;
  reward_emoji?: string;
  reward_color?: string;
  reward_image?: string | null;
}

export interface AttachChallengeInput {
  milestone_id: string;
  deadline: string; // ISO timestamptz
  success_message: string;
  failure_message: string;
}

export interface MilestoneWithChallenge extends JourneyMilestoneRow {
  challenge?: JourneyChallengeRow | null;
}

export const journeyService = {
  /** Fetch or initialize an active XP Journey for a user. */
  async getOrCreateJourney(userId: string): Promise<JourneyRow> {
    const { data, error } = await supabase.rpc('get_or_create_journey', {
      p_user_id: userId,
    });
    return throwIfErrorOrNull(data, error, 'Failed to load journey.');
  },

  /** Fetch all milestones for a journey ordered by required_xp ASC. */
  async getMilestones(journeyId: string): Promise<MilestoneWithChallenge[]> {
    const { data: milestones, error: mError } = await supabase
      .from('journey_milestones')
      .select('*')
      .eq('journey_id', journeyId)
      .order('required_xp', { ascending: true });

    throwIfError(milestones, mError);

    if (!milestones || milestones.length === 0) return [];

    const milestoneIds = milestones.map((m) => m.id);

    const { data: challenges, error: cError } = await supabase
      .from('journey_challenges')
      .select('*')
      .in('milestone_id', milestoneIds);

    throwIfError(challenges, cError);

    const challengeMap = new Map<string, JourneyChallengeRow>();
    (challenges ?? []).forEach((c) => challengeMap.set(c.milestone_id, c));

    return milestones.map((m) => ({
      ...m,
      challenge: challengeMap.get(m.id) ?? null,
    }));
  },

  /** Fetch journey timeline history events (newest first). */
  async getEvents(journeyId: string): Promise<JourneyEventRow[]> {
    const { data, error } = await supabase
      .from('journey_events')
      .select('*')
      .eq('journey_id', journeyId)
      .order('created_at', { ascending: false });
    return throwIfError(data ?? [], error);
  },

  /** Partner edits milestone reward details. */
  async editMilestone(input: EditMilestoneInput): Promise<JourneyMilestoneRow> {
    const { data, error } = await supabase.rpc('edit_journey_milestone', {
      p_milestone_id: input.milestone_id,
      p_reward_title: input.reward_title,
      p_reward_description: input.reward_description,
      p_reward_emoji: input.reward_emoji ?? '🎁',
      p_reward_color: input.reward_color ?? '#4F46E5',
      p_reward_image: input.reward_image ?? null,
    });
    return throwIfErrorOrNull(data, error, 'Failed to edit milestone reward.');
  },

  /** Partner attaches a challenge to a milestone. */
  async attachChallenge(input: AttachChallengeInput): Promise<JourneyChallengeRow> {
    const { data, error } = await supabase.rpc('attach_journey_challenge', {
      p_milestone_id: input.milestone_id,
      p_deadline: input.deadline,
      p_success_message: input.success_message,
      p_failure_message: input.failure_message,
    });
    return throwIfErrorOrNull(data, error, 'Failed to attach challenge.');
  },

  /** Claim an unlocked milestone reward. */
  async claimReward(milestoneId: string): Promise<JourneyMilestoneRow> {
    const { data, error } = await supabase.rpc('claim_journey_reward', {
      p_milestone_id: milestoneId,
    });
    return throwIfErrorOrNull(data, error, 'Failed to claim reward.');
  },

  /** Expand journey with next N milestones. */
  async expandJourney(journeyId: string, steps = 5): Promise<void> {
    const { error } = await supabase.rpc('expand_journey_milestones', {
      p_journey_id: journeyId,
      p_num_steps: steps,
    });
    if (error) throw error;
  },

  /** Realtime subscription across all journey tables. */
  subscribeToJourney(journeyId: string, onChange: () => void) {
    const channelId = `journey-sync:${journeyId}-${Math.random().toString(36).substring(2)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journeys', filter: `id=eq.${journeyId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_milestones',
          filter: `journey_id=eq.${journeyId}`,
        },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journey_challenges' },
        onChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'journey_events',
          filter: `journey_id=eq.${journeyId}`,
        },
        onChange,
      )
      .subscribe();
  },
};
