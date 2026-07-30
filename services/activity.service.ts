import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  todayIso,
  daysAgoIso,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

export type DailyActivityRow = TableRow<'daily_user_activity'>;

// ---------------------------------------------------------------------------
// Dashboard summary types
// ---------------------------------------------------------------------------

export interface WeekTotal {
  study_minutes: number;
  pomodoros_completed: number;
  water_ml: number;
  xp_earned: number;
  pyq_tests: number;
  vocabulary_words: number;
  flashcards_reviewed: number;
  grammar_questions: number;
}

export interface ActivityDashboardSummary {
  today: DailyActivityRow | null;
  weekTotal: WeekTotal;
  streak: number;
}

export interface CalendarSummary {
  date: string;
  has_activity: boolean;
  xp_earned: number;
  study_minutes: number;
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/** Get today's activity record for the current user. */
export async function getTodayActivity(): Promise<DailyActivityRow | null> {
  const { data, error } = await supabase
    .from('daily_user_activity')
    .select('*')
    .eq('date', todayIso())
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get activity records for the past N days (default 7), ordered ascending by date. */
export async function getWeeklyActivity(days = 7): Promise<DailyActivityRow[]> {
  const since = daysAgoIso(days - 1);
  const { data, error } = await supabase
    .from('daily_user_activity')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: true });
  return throwIfError(data ?? [], error);
}

/** Get activity records for the current calendar month, ordered ascending by date. */
export async function getMonthlyActivity(
  year?: number,
  month?: number,
): Promise<DailyActivityRow[]> {
  const now = new Date();
  const y = year ?? now.getUTCFullYear();
  const m = month ?? now.getUTCMonth() + 1; // 1-based
  const start = `${y}-${String(m).padStart(2, '0')}-01`;
  const endDate = new Date(Date.UTC(y, m, 1)); // first day of next month in UTC
  const end = endDate.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('daily_user_activity')
    .select('*')
    .gte('date', start)
    .lt('date', end)
    .order('date', { ascending: true });
  return throwIfError(data ?? [], error);
}

/** Calculate the current activity streak from the full activity history. */
async function computeStreak(today: DailyActivityRow | null): Promise<number> {
  const { data } = await supabase
    .from('daily_user_activity')
    .select('date')
    .order('date', { ascending: false })
    .limit(365);

  const allDates = new Set((data ?? []).map((r) => r.date));
  let streak = 0;
  const cursor = new Date();

  // If today has no activity yet, start counting from yesterday
  if (!today) cursor.setUTCDate(cursor.getUTCDate() - 1);

  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!allDates.has(iso)) break;
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

/** Aggregate dashboard summary: today's record + 7-day totals + streak. */
export async function getDashboardSummary(): Promise<ActivityDashboardSummary> {
  const [today, weekly] = await Promise.all([getTodayActivity(), getWeeklyActivity(7)]);

  const zero: WeekTotal = {
    study_minutes: 0,
    pomodoros_completed: 0,
    water_ml: 0,
    xp_earned: 0,
    pyq_tests: 0,
    vocabulary_words: 0,
    flashcards_reviewed: 0,
    grammar_questions: 0,
  };

  const weekTotal = weekly.reduce<WeekTotal>(
    (acc, row) => {
      acc.study_minutes += row.study_minutes;
      acc.pomodoros_completed += row.pomodoros_completed;
      acc.water_ml += row.water_ml;
      acc.xp_earned += row.xp_earned;
      acc.pyq_tests += row.pyq_tests;
      acc.vocabulary_words += row.vocabulary_words;
      acc.flashcards_reviewed += row.flashcards_reviewed;
      acc.grammar_questions += row.grammar_questions;
      return acc;
    },
    { ...zero },
  );

  const streak = await computeStreak(today);

  return { today, weekTotal, streak };
}

/** Calendar heat-map data for a given month. */
export async function getCalendarSummary(
  year?: number,
  month?: number,
): Promise<CalendarSummary[]> {
  const rows = await getMonthlyActivity(year, month);
  return rows.map((r) => ({
    date: r.date,
    has_activity:
      r.study_minutes > 0 ||
      r.pyq_tests > 0 ||
      r.vocabulary_words > 0 ||
      r.flashcards_reviewed > 0 ||
      r.grammar_questions > 0 ||
      r.water_ml > 0,
    xp_earned: r.xp_earned,
    study_minutes: r.study_minutes,
  }));
}

/** Paginated activity log, newest first. */
export async function getActivityLog(
  opts: PageOptions = {},
): Promise<PageResult<DailyActivityRow>> {
  const { from, to } = paginationRange(opts);
  const { data, error } = await supabase
    .from('daily_user_activity')
    .select('*')
    .order('date', { ascending: false })
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Subscribe to realtime changes on daily_user_activity for a user. */
export function subscribeToActivity(
  userId: string,
  onChange: (activity: DailyActivityRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`daily-activity:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'daily_user_activity',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onChange(payload.new as DailyActivityRow),
    )
    .subscribe();
}
