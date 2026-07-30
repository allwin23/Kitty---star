import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  throwIfErrorOrNull,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

export type MascotFeedRow = TableRow<'mascot_feed'>;
export type MascotEmotion = MascotFeedRow['emotion'];
export type MascotPriority = MascotFeedRow['priority'];

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/** Get the most recent N mascot feed entries for the current user (default 20). */
export async function getLatestFeed(limit = 20): Promise<MascotFeedRow[]> {
  const { data, error } = await supabase
    .from('mascot_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return throwIfError(data ?? [], error);
}

/** Get all unread mascot feed entries, ordered by priority then recency. */
export async function getUnreadFeed(): Promise<MascotFeedRow[]> {
  const { data, error } = await supabase
    .from('mascot_feed')
    .select('*')
    .eq('is_read', false)
    .order('created_at', { ascending: false });
  return throwIfError(data ?? [], error);
}

/** Count of unread mascot feed entries. */
export async function getUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('mascot_feed')
    .select('id', { count: 'exact', head: true })
    .eq('is_read', false);
  throwIfError(count, error);
  return count ?? 0;
}

/** Mark a single feed entry as read. */
export async function markAsRead(feedId: string): Promise<MascotFeedRow> {
  const { data, error } = await supabase
    .from('mascot_feed')
    .update({ is_read: true })
    .eq('id', feedId)
    .select()
    .single();
  return throwIfErrorOrNull(data, error, 'Mascot feed entry not found.');
}

/** Mark all unread entries for the current user as read. */
export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from('mascot_feed')
    .update({ is_read: true })
    .eq('is_read', false);
  throwIfError(undefined, error);
}

/** Paginated mascot feed, newest first. */
export async function getPaginatedFeed(
  opts: PageOptions & { unread_only?: boolean } = {},
): Promise<PageResult<MascotFeedRow>> {
  const { unread_only, ...pageOpts } = opts;
  const { from, to } = paginationRange(pageOpts);

  let q = supabase
    .from('mascot_feed')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (unread_only) q = q.eq('is_read', false);

  const { data, error } = await q;
  return buildPageResult(throwIfError(data ?? [], error), pageOpts);
}

// ---------------------------------------------------------------------------
// Realtime
// ---------------------------------------------------------------------------

/** Subscribe to new mascot feed entries for a user (live notifications). */
export function subscribeToFeed(
  userId: string,
  onInsert: (entry: MascotFeedRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`mascot-feed:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'mascot_feed',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onInsert(payload.new as MascotFeedRow),
    )
    .subscribe();
}
