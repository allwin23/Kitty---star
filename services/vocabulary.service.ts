import { supabase } from '@/lib/supabase';
import {
  buildPageResult,
  paginationRange,
  throwIfError,
  throwIfErrorOrNull,
  type PageOptions,
  type PageResult,
} from '@/lib/supabase-helpers';
import { wordLearnedSchema, type WordLearnedInput } from '@/features/activity';
import type { TableRow } from '@/types/database';

export type VocabularyProgressRow = TableRow<'vocabulary_progress'>;
export type VocabularyStatsRow = TableRow<'vocabulary_stats'>;

/** Mark a vocabulary word as learned (duplicate-safe – throws if already learned). */
export async function markLearned(input: WordLearnedInput): Promise<VocabularyProgressRow> {
  const values = wordLearnedSchema.parse(input);
  const { data, error } = await supabase.rpc('mark_word_learned', { p_word_id: values.word_id });
  return throwIfErrorOrNull(data, error, 'Failed to mark word as learned.');
}

/** Get current user's vocabulary statistics (refreshed for current_date). */
export async function getStats(): Promise<VocabularyStatsRow | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('refresh_vocabulary_stats' as any, {
    p_user_id: user.id,
  });
  return (throwIfError(data, error) ?? null) as VocabularyStatsRow | null;
}

/**
 * Check whether a specific word_id has already been learned by the current user.
 * Returns `true` if learned, `false` otherwise.
 */
export async function isWordLearned(wordId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase
    .from('vocabulary_progress')
    .select('id')
    .eq('user_id', user.id)
    .eq('word_id', wordId)
    .eq('learned', true)
    .maybeSingle();
  throwIfError(data, error);
  return data !== null;
}

/** Paginated list of all words the current user has learned, newest first. */
export async function getLearnedWords(
  opts: PageOptions = {},
): Promise<PageResult<VocabularyProgressRow>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return buildPageResult([], opts);
  const { from, to } = paginationRange(opts);
  const { data, error } = await supabase
    .from('vocabulary_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('learned', true)
    .order('learned_at', { ascending: false })
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Returns learned word_ids for a given list – useful for bulk "already learned?" checks. */
export async function filterLearned(wordIds: string[]): Promise<string[]> {
  if (wordIds.length === 0) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('vocabulary_progress')
    .select('word_id')
    .eq('user_id', user.id)
    .in('word_id', wordIds)
    .eq('learned', true);
  return throwIfError(data ?? [], error).map((r) => r.word_id);
}
