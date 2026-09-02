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
  flashcardCollectionSchema,
  flashcardIdSchema,
  flashcardReviewSchema,
  flashcardSchema,
  flashcardUpdateSchema,
  type FlashcardCollectionInput,
  type FlashcardIdInput,
  type FlashcardInput,
  type FlashcardReviewInput,
  type FlashcardUpdateInput,
} from '@/features/activity';
import type { TableRow } from '@/types/database';

export type FlashcardCollectionRow = TableRow<'flashcard_collections'>;
export type FlashcardRow = TableRow<'flashcards'>;
export type FlashcardReviewRow = TableRow<'flashcard_reviews'>;
export type FlashcardScheduleRow = TableRow<'flashcard_schedule'>;

/** A flashcard row augmented with its schedule entry (may be null for new cards). */
export interface FlashcardWithSchedule extends FlashcardRow {
  schedule: FlashcardScheduleRow | null;
}

export interface CollectionWithCards extends FlashcardCollectionRow {
  flashcards: FlashcardRow[];
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/** Create a new flashcard collection owned by the current user. */
export async function createCollection(
  input: FlashcardCollectionInput,
): Promise<FlashcardCollectionRow> {
  const values = flashcardCollectionSchema.parse(input);
  const { data, error } = await supabase.rpc('create_flashcard_collection', {
    p_title: values.title,
    p_description: values.description ?? null,
  });
  return throwIfErrorOrNull(data, error, 'Failed to create flashcard collection.');
}

/** List all collections owned by the current user, newest first. */
export async function getCollections(
  opts: PageOptions = {},
): Promise<PageResult<FlashcardCollectionRow>> {
  const { from, to } = paginationRange(opts);
  const { data, error } = await supabase
    .from('flashcard_collections')
    .select('*')
    .order('created_at', { ascending: false })
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Get a single collection with all its cards. */
export async function getCollectionWithCards(
  collectionId: string,
): Promise<CollectionWithCards | null> {
  const { data, error } = await supabase
    .from('flashcard_collections')
    .select('*, flashcards(*)')
    .eq('id', collectionId)
    .maybeSingle();
  return throwIfError(data as CollectionWithCards | null, error);
}

/** Update a collection's title or description. */
export async function updateCollection(
  collectionId: string,
  patch: { title?: string; description?: string | null },
): Promise<FlashcardCollectionRow> {
  const { data, error } = await supabase
    .from('flashcard_collections')
    .update(patch)
    .eq('id', collectionId)
    .select()
    .single();
  return throwIfErrorOrNull(data, error, 'Flashcard collection not found.');
}

/** Delete a collection (only if it contains no cards with review history). */
export async function deleteCollection(collectionId: string): Promise<void> {
  const { error } = await supabase.from('flashcard_collections').delete().eq('id', collectionId);
  throwIfError(undefined, error);
}

// ---------------------------------------------------------------------------
// Flashcards – CRUD
// ---------------------------------------------------------------------------

/** Create a new user flashcard inside the given collection. */
export async function createFlashcard(input: FlashcardInput): Promise<FlashcardRow> {
  const values = flashcardSchema.parse(input);
  const { data, error } = await supabase.rpc('create_flashcard', {
    p_collection_id: values.collection_id,
    p_question: values.question,
    p_answer: values.answer,
  });
  return throwIfErrorOrNull(data, error, 'Failed to create flashcard.');
}

/** Update an existing user flashcard. */
export async function updateFlashcard(input: FlashcardUpdateInput): Promise<FlashcardRow> {
  const values = flashcardUpdateSchema.parse(input);
  const { data, error } = await supabase.rpc('update_flashcard', {
    p_card_id: values.card_id,
    p_question: values.question,
    p_answer: values.answer,
    p_collection_id: values.collection_id,
  });
  return throwIfErrorOrNull(data, error, 'Flashcard not found.');
}

/** Delete a user flashcard (blocked if it has review history). */
export async function deleteFlashcard(input: FlashcardIdInput): Promise<void> {
  const values = flashcardIdSchema.parse(input);
  const { error } = await supabase.rpc('delete_flashcard', { p_card_id: values.card_id });
  throwIfError(undefined, error);
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

/** Submit a spaced-repetition review rating for a user flashcard. */
export async function reviewFlashcard(input: FlashcardReviewInput): Promise<FlashcardReviewRow> {
  const values = flashcardReviewSchema.parse(input);
  const { data, error } = await supabase.rpc('review_flashcard', {
    p_card_id: values.card_id,
    p_rating: values.rating,
  });
  return throwIfErrorOrNull(data, error, 'Failed to record flashcard review.');
}

/**
 * Get cards from a collection that are due for review (or all cards for a
 * study-mode session), paginated and ordered by schedule urgency.
 */
export async function getDueCards(
  collectionId: string,
  opts: PageOptions = {},
): Promise<PageResult<FlashcardRow>> {
  const { from, to } = paginationRange(opts);
  const now = new Date().toISOString();

  // Fetch card IDs scheduled for review in this collection
  const { data: scheduleRows, error: scheduleErr } = await supabase
    .from('flashcard_schedule')
    .select('card_id')
    .lte('next_review', now);
  throwIfError(scheduleRows, scheduleErr);

  const dueCardIds = (scheduleRows ?? []).map((r) => r.card_id);

  if (dueCardIds.length === 0) {
    return buildPageResult([], opts);
  }

  const { data, error } = await supabase
    .from('flashcards')
    .select('*')
    .eq('collection_id', collectionId)
    .eq('type', 'user')
    .in('id', dueCardIds)
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Get new cards (never reviewed) from a collection, ordered by creation. */
export async function getNewCards(
  collectionId: string,
  opts: PageOptions = {},
): Promise<PageResult<FlashcardRow>> {
  const { from, to } = paginationRange(opts);

  // Fetch all scheduled card IDs
  const { data: scheduled, error: schedErr } = await supabase
    .from('flashcard_schedule')
    .select('card_id');
  throwIfError(scheduled, schedErr);
  const scheduledIds = (scheduled ?? []).map((r) => r.card_id);

  let q = supabase
    .from('flashcards')
    .select('*')
    .eq('collection_id', collectionId)
    .eq('type', 'user')
    .order('created_at', { ascending: true })
    .range(from, to);

  if (scheduledIds.length > 0) {
    q = q.not('id', 'in', `(${scheduledIds.map((id) => `'${id}'`).join(',')})`);
  }

  const { data, error } = await q;
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Paginated review history for a specific card, newest first. */
export async function getCardReviewHistory(
  cardId: string,
  opts: PageOptions = {},
): Promise<PageResult<FlashcardReviewRow>> {
  const { from, to } = paginationRange(opts);
  const { data, error } = await supabase
    .from('flashcard_reviews')
    .select('*')
    .eq('card_id', cardId)
    .order('reviewed_at', { ascending: false })
    .range(from, to);
  return buildPageResult(throwIfError(data ?? [], error), opts);
}

/** Get the schedule entry for a specific card. */
export async function getCardSchedule(cardId: string): Promise<FlashcardScheduleRow | null> {
  const { data, error } = await supabase
    .from('flashcard_schedule')
    .select('*')
    .eq('card_id', cardId)
    .maybeSingle();
  return throwIfError(data, error);
}
