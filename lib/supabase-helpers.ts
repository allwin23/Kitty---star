import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

export class ServiceError extends Error {
  readonly code: string;
  constructor(message: string, code = 'UNKNOWN') {
    super(message);
    this.name = 'ServiceError';
    this.code = code;
  }
}

export function throwIfError<T>(data: T, error: { message: string; code?: string } | null): T {
  if (error) throw new ServiceError(error.message, error.code ?? 'SUPABASE_ERROR');
  return data;
}

/**
 * Like throwIfError but also asserts that data is not null/undefined.
 * Use this when the query must return a row (e.g. `.single()` or RPC).
 */
export function throwIfErrorOrNull<T>(
  data: T | null | undefined,
  error: { message: string; code?: string } | null,
  notFoundMessage = 'Record not found.',
): T {
  if (error) throw new ServiceError(error.message, error.code ?? 'SUPABASE_ERROR');
  if (data == null) throw new ServiceError(notFoundMessage, 'NOT_FOUND');
  return data;
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PageOptions {
  page?: number;
  pageSize?: number;
}

export interface PageResult<T> {
  data: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** Returns { from, to } range for Supabase's `.range(from, to)` call. */
export function paginationRange(opts: PageOptions): { from: number; to: number } {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}

export function buildPageResult<T>(
  rows: T[],
  { page = 1, pageSize = 20 }: PageOptions,
): PageResult<T> {
  return {
    data: rows,
    page,
    pageSize,
    hasMore: rows.length === pageSize,
  };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Returns a local YYYY-MM-DD string for today (UTC). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns a YYYY-MM-DD string for a date N days ago from today (UTC). */
export function daysAgoIso(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Realtime channel factory
// ---------------------------------------------------------------------------

export type PostgresEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface RealtimeTableOptions {
  table: string;
  event?: PostgresEvent;
  filter?: string;
}

export function subscribeToTable(
  channelName: string,
  options: RealtimeTableOptions[],
  onChange: (payload: unknown) => void,
): RealtimeChannel {
  let channel = supabase.channel(channelName);
  for (const opt of options) {
    channel = channel.on(
      'postgres_changes',
      {
        event: opt.event ?? '*',
        schema: 'public',
        table: opt.table,
        ...(opt.filter ? { filter: opt.filter } : {}),
      },
      onChange,
    ) as RealtimeChannel;
  }
  return channel.subscribe();
}
