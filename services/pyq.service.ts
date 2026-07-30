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
import {
  pyqFinishSchema,
  pyqStartSchema,
  type PyqFinishInput,
  type PyqStartInput,
} from '@/features/activity';
import type { Json, TableRow } from '@/types/database';

export type PYQAttemptRow = TableRow<'pyq_attempts'>;
export type PYQAttemptAnswerRow = TableRow<'pyq_attempt_answers'>;
export type PYQStatsRow = TableRow<'pyq_stats'>;

export interface PYQAttemptWithAnswers extends PYQAttemptRow {
  pyq_attempt_answers: PYQAttemptAnswerRow[];
}

/** Start a new PYQ test attempt – calls the server-side RPC. */
export async function startAttempt(input: PyqStartInput): Promise<PYQAttemptRow> {
  const values = pyqStartSchema.parse(input);
  const { data, error } = await supabase.rpc('start_pyq_attempt', {
    p_set_name: values.set_name,
    p_subject: values.subject,
    p_year: values.year,
    p_mode: values.mode,
  });
  return throwIfErrorOrNull(data, error, 'Failed to start PYQ attempt.');
}

/** Submit answers for an in-progress attempt and close it. */
export async function finishAttempt(input: PyqFinishInput): Promise<PYQAttemptRow> {
  const values = pyqFinishSchema.parse(input);
  const { data, error } = await supabase.rpc('finish_pyq_attempt', {
    p_attempt_id: values.attempt_id,
    p_answers: values.answers as unknown as Json,
  });
  return throwIfErrorOrNull(data, error, 'Failed to finish PYQ attempt.');
}

/** Retrieve a single submitted attempt with its per-question answers. */
export async function getAttempt(attemptId: string): Promise<PYQAttemptWithAnswers> {
  const { data, error } = await supabase
    .from('pyq_attempts')
    .select('*, pyq_attempt_answers(*)')
    .eq('id', attemptId)
    .not('submitted_at', 'is', null)
    .single();
  return throwIfErrorOrNull(data as PYQAttemptWithAnswers | null, error, 'PYQ attempt not found.');
}

/** Paginated list of the current user's completed attempts, newest first. */
export async function getAttemptHistory(
  opts: PageOptions & { subject?: string } = {},
): Promise<PageResult<PYQAttemptRow>> {
  const { subject, ...pageOpts } = opts;
  const { from, to } = paginationRange(pageOpts);

  let q = supabase
    .from('pyq_attempts')
    .select('*')
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .range(from, to);

  if (subject) q = q.eq('subject', subject);
  const { data, error } = await q;
  return buildPageResult(throwIfError(data ?? [], error), pageOpts);
}

/** Retrieve the current user's aggregated PYQ statistics. */
export async function getStats(): Promise<PYQStatsRow | null> {
  const { data, error } = await supabase.from('pyq_stats').select('*').maybeSingle();
  return throwIfError(data, error);
}

/** Subscribe to real-time changes on the user's pyq_attempts. */
export function subscribeToAttempts(
  userId: string,
  onChange: (attempt: PYQAttemptRow) => void,
): RealtimeChannel {
  return supabase
    .channel(`pyq-attempts:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'pyq_attempts',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onChange(payload.new as PYQAttemptRow),
    )
    .subscribe();
}
