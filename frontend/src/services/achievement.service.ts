/**
 * achievement.service.ts
 *
 * Backend service wrapper for reading achievements, user unlocked achievements,
 * badge gallery, and partner achievements.
 *
 * All unlocking logic resides strictly on the backend via PostgreSQL triggers & RPCs.
 */

import { supabase } from '@/lib/supabase';
import { throwIfError, throwIfErrorOrNull } from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

export type AchievementRow = TableRow<'achievements'>;
export type UserAchievementRow = TableRow<'user_achievements'>;

export interface UserAchievementWithDetails extends UserAchievementRow {
  achievements: AchievementRow | null;
}

export type AchievementCategory = 'system' | 'milestone' | 'partner_award';

/** Categorize an achievement badge by its code or attributes. */
export function getAchievementCategory(code: string): AchievementCategory {
  if (code.startsWith('partner_') || code.includes('award')) {
    return 'partner_award';
  }
  if (
    code.includes('hundred') ||
    code.includes('thousand') ||
    code.includes('master') ||
    code.includes('best') ||
    code.includes('longest') ||
    code.includes('perfect') ||
    code.includes('record')
  ) {
    return 'milestone';
  }
  return 'system';
}

/** Get badge emoji icon based on code or category. */
export function getBadgeIcon(code: string): string {
  if (code === 'first_pomodoro') return '🍅';
  if (code === 'first_approved_day') return '✅';
  if (code === 'seven_day_streak') return '🔥';
  if (code === 'hundred_pomodoros') return '🎯';
  if (code === 'hundred_hours') return '⏱️';
  if (code.includes('water') || code.includes('hydration')) return '💧';
  if (code.includes('pyq') || code.includes('test')) return '📚';
  if (code.includes('vocab') || code.includes('word')) return '📖';
  if (code.includes('grammar') || code.includes('quiz')) return '✍️';
  if (code.includes('flashcard')) return '⚡';
  if (code.includes('level') || code.includes('xp')) return '⭐';
  if (code.includes('partner') || code.includes('award')) return '💝';
  return '🏆';
}

/** Get XP reward estimation for an achievement by code. */
export function getAchievementXPReward(code: string): number {
  if (code === 'first_pomodoro') return 25;
  if (code === 'first_approved_day') return 50;
  if (code === 'seven_day_streak') return 100;
  if (code === 'hundred_pomodoros') return 250;
  if (code === 'hundred_hours') return 500;
  return 50;
}

export type PartnerAwardRow = TableRow<'partner_awards'>;

export interface PartnerAwardInput {
  recipient_id: string;
  title: string;
  message?: string;
  icon?: string;
  color?: string;
  xp_bonus?: number;
}

export const achievementService = {
  /** Fetch all master achievements defined in the database (Badge Gallery). */
  async getAllAchievements(): Promise<AchievementRow[]> {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('created_at', { ascending: true });
    return throwIfError(data ?? [], error);
  },

  /** Fetch unlocked achievements for a specific user (defaults to current user). */
  async getUserAchievements(userId?: string): Promise<UserAchievementWithDetails[]> {
    let q = supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .order('unlocked_at', { ascending: false });

    if (userId) {
      q = q.eq('user_id', userId);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];
      q = q.eq('user_id', user.id);
    }

    const { data, error } = await q;
    return throwIfError(data ?? [], error) as UserAchievementWithDetails[];
  },

  /** Fetch achievement history timeline (newest unlocked first). */
  async getHistory(userId?: string): Promise<UserAchievementWithDetails[]> {
    return this.getUserAchievements(userId);
  },

  /** Send a custom partner award badge to connected partner via backend RPC. */
  async sendPartnerAward(input: PartnerAwardInput): Promise<PartnerAwardRow> {
    const { data, error } = await supabase.rpc('send_partner_award', {
      p_recipient_id: input.recipient_id,
      p_title: input.title,
      p_message: input.message ?? null,
      p_icon: input.icon ?? '🌟',
      p_color: input.color ?? '#4F46E5',
      p_xp_bonus: input.xp_bonus ?? 50,
    });
    return throwIfErrorOrNull(data, error, 'Failed to send partner award.');
  },

  /** Fetch partner awards received by a specific user (recipient_id = userId). */
  async getReceivedPartnerAwards(userId: string): Promise<PartnerAwardRow[]> {
    const { data, error } = await supabase
      .from('partner_awards')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false });
    return throwIfError(data ?? [], error);
  },

  /** Fetch partner awards sent by a specific user (sender_id = userId). */
  async getSentPartnerAwards(userId: string): Promise<PartnerAwardRow[]> {
    const { data, error } = await supabase
      .from('partner_awards')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });
    return throwIfError(data ?? [], error);
  },

  /** Check if backend schema supports custom partner-designed awards table or RPC. */
  async supportsCustomPartnerAwards(): Promise<boolean> {
    return true;
  },
};
