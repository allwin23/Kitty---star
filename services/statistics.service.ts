/**
 * statistics.service.ts
 *
 * Read-only aggregation layer for the Statistics dashboard.
 * Every value comes directly from the backend — no frontend math.
 *
 * Partner statistics are fetched by querying tables with the partner's
 * user_id.  Supabase RLS already grants a connected partner read access
 * to these rows (see migrations for policy details).
 */

import { supabase } from '@/lib/supabase';
import { daysAgoIso, throwIfError, todayIso } from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

// ─── Type aliases ─────────────────────────────────────────────────────────────

export type UserStatsRow = TableRow<'user_stats'>;
export type DailyActivityRow = TableRow<'daily_user_activity'>;
export type DailyReportRow = TableRow<'daily_reports'> & {
  report_tasks: TableRow<'report_tasks'>[];
};
export type UserAchievementRow = TableRow<'user_achievements'> & {
  achievements: TableRow<'achievements'> | null;
};
export type PYQStatsRow = TableRow<'pyq_stats'>;
export type PYQAttemptRow = TableRow<'pyq_attempts'>;
export type VocabularyStatsRow = TableRow<'vocabulary_stats'>;
export type GrammarStatsRow = TableRow<'grammar_stats'>;
export type GrammarAttemptRow = TableRow<'grammar_attempts'>;
export type WaterDailyStatsRow = TableRow<'water_daily_stats'>;
export type FlashcardScheduleRow = TableRow<'flashcard_schedule'>;
export type FlashcardReviewRow = TableRow<'flashcard_reviews'>;

// ─── Time filter ───────────────────────────────────────────────────────────────

export type TimeFilter = 'day' | 'week' | 'month' | 'all';

/** Returns the ISO date string for the start boundary of the given filter. */
export function filterStartDate(filter: TimeFilter): string | null {
  if (filter === 'day') {
    return todayIso();
  }
  if (filter === 'week') {
    return daysAgoIso(6);
  }
  if (filter === 'month') {
    return daysAgoIso(29);
  }
  return null; // 'all'
}

// ─── Helper to get the current user's partner_id ──────────────────────────────

export async function getPartnerIdForCurrentUser(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single();

  if (error || !data?.partner_id) return null;
  return data.partner_id;
}

// ─── Overview / User Stats ─────────────────────────────────────────────────────

/** Fetch aggregated user_stats for a specific user_id (or current user). */
export async function getUserStats(userId?: string): Promise<UserStatsRow | null> {
  let q = supabase.from('user_stats').select('*');
  if (userId) q = (q as any).eq('user_id', userId);
  const { data, error } = await (q as any).maybeSingle();
  return throwIfError(data, error);
}

/** Fetch user_achievements for a specific user_id (or current user). */
export async function getAchievements(userId?: string): Promise<UserAchievementRow[]> {
  let q = supabase
    .from('user_achievements')
    .select('*, achievements(*)')
    .order('unlocked_at', { ascending: false });
  if (userId) q = (q as any).eq('user_id', userId);
  const { data, error } = await q;
  return throwIfError(data ?? [], error) as UserAchievementRow[];
}

// ─── Daily Activity ────────────────────────────────────────────────────────────

/** Fetch daily_user_activity rows filtered by time range for a given user. */
export async function getDailyActivity(
  userId: string,
  filter: TimeFilter,
): Promise<DailyActivityRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('daily_user_activity')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (start) q = q.gte('date', start);
  const { data, error } = await q;
  return throwIfError(data ?? [], error);
}

// ─── Reports ───────────────────────────────────────────────────────────────────

/** Fetch daily_reports for a given user, newest first. */
export async function getReports(
  userId: string,
  filter: TimeFilter,
): Promise<DailyReportRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('daily_reports')
    .select('*, report_tasks(*)')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (start) q = q.gte('date', start);
  const { data, error } = await q;
  return throwIfError(data ?? [], error) as unknown as DailyReportRow[];
}

// ─── PYQ Statistics ────────────────────────────────────────────────────────────

/** Fetch pyq_stats for a given user. */
export async function getPYQStats(userId: string): Promise<PYQStatsRow | null> {
  const { data, error } = await supabase
    .from('pyq_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Fetch pyq_attempts for a given user filtered by time range. */
export async function getPYQAttempts(
  userId: string,
  filter: TimeFilter,
): Promise<PYQAttemptRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('pyq_attempts')
    .select('*')
    .eq('user_id', userId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false });

  if (start) q = q.gte('submitted_at', `${start}T00:00:00Z`);
  const { data, error } = await q;
  return throwIfError(data ?? [], error);
}

// ─── Vocabulary Statistics ─────────────────────────────────────────────────────

/** Fetch vocabulary_stats for a given user. */
export async function getVocabularyStats(userId: string): Promise<VocabularyStatsRow | null> {
  const { data, error } = await supabase
    .from('vocabulary_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return throwIfError(data, error);
}

// ─── Grammar Statistics ────────────────────────────────────────────────────────

/** Fetch grammar_stats for a given user. */
export async function getGrammarStats(userId: string): Promise<GrammarStatsRow | null> {
  const { data, error } = await supabase
    .from('grammar_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Fetch grammar_attempts for a given user filtered by time range. */
export async function getGrammarAttempts(
  userId: string,
  filter: TimeFilter,
): Promise<GrammarAttemptRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('grammar_attempts')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (start) q = q.gte('completed_at', `${start}T00:00:00Z`);
  const { data, error } = await q;
  return throwIfError(data ?? [], error);
}

// ─── Water Statistics ──────────────────────────────────────────────────────────

/** Fetch water_daily_stats for a given user filtered by time range. */
export async function getWaterStats(
  userId: string,
  filter: TimeFilter,
): Promise<WaterDailyStatsRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('water_daily_stats')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (start) q = q.gte('date', start);
  const { data, error } = await q;
  return throwIfError(data ?? [], error);
}

// ─── Flashcard Statistics ──────────────────────────────────────────────────────

/** Fetch flashcard_schedule rows for a given user to derive aggregate stats. */
export async function getFlashcardScheduleStats(userId: string): Promise<{
  totalCards: number;
  dueCards: number;
  avgIntervalDays: number;
  longestIntervalDays: number;
  avgEaseFactor: number;
}> {
  // Fetch user-created cards count
  const { data: userCards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('created_by', userId);

  const totalUserCards = userCards?.length ?? 0;

  // Fetch built-in cards count
  const { data: builtinCards } = await supabase
    .from('flashcards')
    .select('id')
    .eq('type', 'builtin');

  const totalBuiltinCards = builtinCards?.length ?? 0;

  const { data, error } = await supabase
    .from('flashcard_schedule')
    .select('*')
    .eq('user_id', userId);
  const rows = throwIfError(data ?? [], error) as FlashcardScheduleRow[];

  const now = new Date().toISOString();
  const dueCards = rows.filter((r) => r.next_review !== null && r.next_review <= now).length;
  const avgIntervalDays =
    rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.interval_days, 0) / rows.length)
      : 0;
  const longestIntervalDays =
    rows.length > 0 ? Math.max(...rows.map((r) => r.interval_days), 0) : 0;
  const avgEaseFactor =
    rows.length > 0
      ? Math.round((rows.reduce((s, r) => s + r.ease_factor, 0) / rows.length) * 100) / 100
      : 0;

  const totalCards = Math.max(totalUserCards + totalBuiltinCards, rows.length);

  return {
    totalCards,
    dueCards,
    avgIntervalDays,
    longestIntervalDays,
    avgEaseFactor,
  };
}

/** Fetch flashcard_reviews within a time range for a given user. */
export async function getFlashcardReviews(
  userId: string,
  filter: TimeFilter,
): Promise<FlashcardReviewRow[]> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('flashcard_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false });

  if (start) q = q.gte('reviewed_at', `${start}T00:00:00Z`);
  const { data, error } = await q;
  return throwIfError(data ?? [], error);
}

// ─── Accountability Statistics (derived from daily_reports) ───────────────────

export interface AccountabilityStats {
  daysSubmitted: number;
  partnerApprovals: number;
  partnerRejections: number;
  avgCompletionPct: number;
  tasksPlanned: number;
  tasksCompleted: number;
  submissionRate: number;
}

/**
 * Derive accountability stats from daily_reports rows.
 * All values come from the backend — no recalculation of business logic.
 */
export function deriveAccountabilityStats(
  reports: DailyReportRow[],
): AccountabilityStats {
  const total = reports.length;
  const approvals = reports.filter((r) => r.approval_status === 'approved').length;
  const rejections = reports.filter((r) => r.approval_status === 'rejected').length;
  const tasksPlanned = reports.reduce((s, r) => s + r.planned_tasks, 0);
  const tasksCompleted = reports.reduce((s, r) => s + r.completed_tasks, 0);
  const avgCompletionPct =
    tasksPlanned > 0 ? Math.round((tasksCompleted / tasksPlanned) * 100) : 0;
  const submissionRate = total > 0 ? Math.round((approvals / total) * 100) : 0;

  return {
    daysSubmitted: total,
    partnerApprovals: approvals,
    partnerRejections: rejections,
    avgCompletionPct,
    tasksPlanned,
    tasksCompleted,
    submissionRate,
  };
}

// ─── Pomodoro Statistics (queried from pomodoro_sessions) ──────────────────────

export interface PomodoroStats {
  pomodorosCompleted: number;
  focusMinutes: number;
  avgSessionMinutes: number;
  mostProductiveDay: string | null;
}

/** Fetch pomodoro stats for a given user from pomodoro_sessions table. */
export async function getPomodoroStats(
  userId: string,
  filter: TimeFilter,
): Promise<PomodoroStats> {
  const start = filterStartDate(filter);
  let q = supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('session_type', 'focus');

  if (start) q = q.gte('ended_at', `${start}T00:00:00Z`);

  const { data, error } = await q;
  const sessions = throwIfError(data ?? [], error) as TableRow<'pomodoro_sessions'>[];

  const pomodorosCompleted = sessions.length;
  const focusMinutes = sessions.reduce((s, r) => s + r.duration, 0);
  const avgSessionMinutes =
    pomodorosCompleted > 0 ? Math.round(focusMinutes / pomodorosCompleted) : 0;

  const dayCounts = new Map<string, number>();
  sessions.forEach((s) => {
    const day = s.ended_at.slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  });

  let bestDay: string | null = null;
  let maxCount = 0;
  dayCounts.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      bestDay = day;
    }
  });

  return {
    pomodorosCompleted,
    focusMinutes,
    avgSessionMinutes,
    mostProductiveDay: bestDay,
  };
}

// ─── Realtime Subscription ───────────────────────────────────────────────────

/**
 * Subscribe to real-time changes across all statistics-related tables for a target user.
 * Works seamlessly for both the current user and their connected partner.
 */
export function subscribeToStatistics(
  userId: string,
  onChange: () => void,
) {
  const channelId = `stats-sync:${userId}-${Math.random().toString(36).substring(2)}`;
  return supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_user_activity', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_stats', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'daily_reports', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pyq_stats', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pyq_attempts', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'vocabulary_stats', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'grammar_stats', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'water_daily_stats', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'pomodoro_sessions', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flashcards', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flashcard_schedule', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'flashcard_reviews', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_achievements', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_events', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'current_plans', filter: `user_id=eq.${userId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'current_tasks' },
      onChange,
    )
    .subscribe();
}

