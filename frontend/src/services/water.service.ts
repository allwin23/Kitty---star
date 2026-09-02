import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  throwIfErrorOrNull,
  todayIso,
  daysAgoIso,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import { waterLogSchema, type WaterLogInput } from '@/features/activity';
import type { TableRow } from '@/types/database';

export type WaterLogRow = TableRow<'water_logs'>;
export type WaterDailyStatsRow = TableRow<'water_daily_stats'>;

/** Log a water intake amount (in ml). */
export async function logWater(input: WaterLogInput): Promise<WaterLogRow> {
  const parsed = waterLogSchema.parse(input);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Authentication required.');

  const { data, error } = await supabase.rpc('log_water', {
    p_amount_ml: parsed.amount_ml,
  });

  return throwIfErrorOrNull(data, error, 'Failed to log water.');
}

/** Get today's aggregated water stats for the current user. */
export async function getTodayStats(): Promise<WaterDailyStatsRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('water_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayIso())
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get daily history for a given date (default today). */
export async function getDailyHistory(date = todayIso()): Promise<WaterLogRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', user.id)
    .gte('logged_at', `${date}T00:00:00Z`)
    .lt('logged_at', `${date}T23:59:59.999Z`)
    .order('logged_at', { ascending: false });
  return throwIfError(data ?? [], error);
}

/** Get daily stats for the most recent N days (default 7). */
export async function getWeeklyStats(days = 7): Promise<WaterDailyStatsRow[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const sinceIso = daysAgoIso(days - 1);

  const { data, error } = await supabase
    .from('water_daily_stats')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', sinceIso)
    .order('date', { ascending: true });
  return throwIfError(data ?? [], error);
}

/** Paginated water log history, newest first. */
export async function getLogs(opts: PageOptions = {}): Promise<PageResult<WaterLogRow>> {
  const { from, to } = paginationRange(opts);
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .order('logged_at', { ascending: false })
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Subscribe to realtime inserts on water_logs for a user. */
export function subscribeToLogs(
  userId: string,
  onInsert: (log: WaterLogRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`water-logs:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'water_logs',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as WaterLogRow),
    )
    .subscribe();
}

/** Subscribe to realtime updates on water_daily_stats for a user. */
export function subscribeToDailyStats(
  userId: string,
  onChange: (stats: WaterDailyStatsRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`water-daily-stats:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'water_daily_stats',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onChange(payload.new as WaterDailyStatsRow),
    )
    .subscribe();
}
