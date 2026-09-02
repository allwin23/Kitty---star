import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import type { TableRow } from '@/types/database';

export type ActivityEventRow = TableRow<'activity_events'>;
export type ActivityEventType = ActivityEventRow['event_type'];
export type ActivityEventVisibility = ActivityEventRow['visibility'];

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface ActivityEventFilters {
  event_type?: ActivityEventType;
  visibility?: ActivityEventVisibility;
  since?: string; // ISO date-time string
  until?: string; // ISO date-time string
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------

/** Paginated activity event timeline for the current user, newest first. */
export async function getTimeline(
  opts: PageOptions & ActivityEventFilters = {},
): Promise<PageResult<ActivityEventRow>> {
  const { event_type, visibility, since, until, ...pageOpts } = opts;
  const { from, to } = paginationRange(pageOpts);

  let q = supabase
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (event_type) q = q.eq('event_type', event_type);
  if (visibility) q = q.eq('visibility', visibility);
  if (since) q = q.gte('created_at', since);
  if (until) q = q.lte('created_at', until);

  const { data, error } = await q;
  return buildPageResult(throwIfError(data ?? [], error), pageOpts);
}

/** Retrieve the N most recent events for a user (default 10). */
export async function getRecentEvents(limit = 10): Promise<ActivityEventRow[]> {
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  return throwIfError(data ?? [], error);
}

/** Get a single activity event by id. */
export async function getEvent(eventId: string): Promise<ActivityEventRow | null> {
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get all events linked to a specific reference record. */
export async function getEventsByReference(
  referenceTable: string,
  referenceId: string,
): Promise<ActivityEventRow[]> {
  const { data, error } = await supabase
    .from('activity_events')
    .select('*')
    .eq('reference_table', referenceTable)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false });
  return throwIfError(data ?? [], error);
}
