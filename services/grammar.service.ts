import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  throwIfErrorOrNull,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import { grammarQuizSchema, type GrammarQuizInput } from '@/features/activity';
import type { TableRow } from '@/types/database';

export type GrammarAttemptRow = TableRow<'grammar_attempts'>;
export type GrammarStatsRow = TableRow<'grammar_stats'>;

/** Submit a completed grammar quiz and update statistics. */
export async function finishGrammarQuiz(input: GrammarQuizInput): Promise<GrammarAttemptRow> {
  const values = grammarQuizSchema.parse(input);
  const { data, error } = await supabase.rpc('finish_grammar_quiz', {
    p_topic: values.topic,
    p_correct: values.correct,
    p_wrong: values.wrong,
    p_score: values.score,
    p_set_name: values.set_name,
  });
  return throwIfErrorOrNull(data, error, 'Failed to record grammar quiz.');
}

/** Get current user's aggregated grammar statistics (refreshed for current_date). */
export async function getStats(): Promise<GrammarStatsRow | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('refresh_grammar_stats' as any, { p_user_id: user.id });
  return (throwIfError(data, error) ?? null) as GrammarStatsRow | null;
}

/** Paginated grammar attempt history for the current user, newest first. */
export async function getHistory(
  opts: PageOptions & { topic?: string } = {},
): Promise<PageResult<GrammarAttemptRow>> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return buildPageResult([], opts);
  const { topic, ...pageOpts } = opts;
  const { from, to } = paginationRange(pageOpts);

  let q = supabase
    .from('grammar_attempts')
    .select('*')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })
    .range(from, to);

  if (topic) q = q.eq('topic', topic);
  const { data, error } = await q;
  return buildPageResult(throwIfError(data ?? [], error), pageOpts);
}

/** Topic breakdown: distinct topics the user has attempted, with attempt counts. */
export async function getTopicBreakdown(): Promise<{ topic: string; attempts: number }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('grammar_attempts')
    .select('topic')
    .eq('user_id', user.id)
    .order('topic', { ascending: true });
  throwIfError(data, error);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.topic] = (counts[row.topic] ?? 0) + 1;
  }
  return Object.entries(counts).map(([topic, attempts]) => ({ topic, attempts }));
}
