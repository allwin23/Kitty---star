import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Json, TableInsert, TableRow, TableUpdate } from '@/types/database';
import {
  flashcardCollectionSchema,
  flashcardIdSchema,
  flashcardReviewSchema,
  flashcardSchema,
  flashcardUpdateSchema,
  grammarQuizSchema,
  pyqFinishSchema,
  pyqStartSchema,
  waterLogSchema,
  wordLearnedSchema,
  type FlashcardCollectionInput,
  type FlashcardIdInput,
  type FlashcardInput,
  type FlashcardReviewInput,
  type FlashcardUpdateInput,
  type GrammarQuizInput,
  type PyqFinishInput,
  type PyqStartInput,
  type WaterLogInput,
  type WordLearnedInput,
} from '@/features/activity';

export type DraftTaskInput = Pick<TableInsert<'draft_tasks'>, 'title' | 'estimated_minutes'>;
export type CurrentTaskInput = Pick<
  TableInsert<'current_tasks'>,
  'plan_id' | 'title' | 'estimated_minutes' | 'order'
>;
export type PomodoroInput = {
  planId: string;
  taskId?: string;
  duration: number;
  sessionType?: 'focus' | 'short_break' | 'long_break';
  startedAt?: string;
  endedAt?: string;
};

const throwIfError = <T>(data: T, error: { message: string } | null): T => {
  if (error) throw new Error(error.message);
  return data;
};

export const plannerService = {
  async createDraft(date: string, tasks: DraftTaskInput[]) {
    const { data, error } = await supabase.rpc('create_draft', {
      p_date: date,
      p_tasks: tasks as unknown as Json,
    });
    return throwIfError(data, error);
  },

  async createDailyPlans(date: string) {
    const { data, error } = await supabase.rpc('duplicate_draft_into_daily_plans', {
      p_date: date,
    });
    return throwIfError(data, error);
  },

  async getCurrentPlan(date: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('current_plans')
      .select('*, current_tasks(*)')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle();
    return throwIfError(data, error);
  },

  async updateTask(taskId: string, update: TableUpdate<'current_tasks'>) {
    const { data, error } = await supabase
      .from('current_tasks')
      .update(update)
      .eq('id', taskId)
      .select()
      .single();
    return throwIfError(data, error);
  },

  async toggleTask(taskId: string, completed: boolean) {
    const { data, error } = await supabase.rpc('toggle_task_completion' as any, {
      p_task_id: taskId,
      p_completed: completed,
    });
    return throwIfError(data, error);
  },

  async addTask(task: CurrentTaskInput) {
    const { data, error } = await supabase.from('current_tasks').insert(task).select().single();
    return throwIfError(data, error);
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase.from('current_tasks').delete().eq('id', taskId);
    throwIfError(undefined, error);
  },

  subscribeToPlan(planId: string, onChange: () => void): RealtimeChannel {
    const channelId = `current-plan:${planId}-${Math.random().toString(36).substring(2)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'current_plans', filter: `id=eq.${planId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'current_tasks', filter: `plan_id=eq.${planId}` },
        onChange,
      )
      .subscribe();
  },

  /** Subscribe to ALL plan changes for a user (catches plan creation + task changes). */
  subscribeToPartnerChanges(partnerUserId: string, onChange: () => void): RealtimeChannel {
    const channelId = `partner-changes:${partnerUserId}-${Math.random().toString(36).substring(2)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'current_plans', filter: `user_id=eq.${partnerUserId}` },
        onChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'current_tasks' },
        (payload) => {
          // Filter client-side: only fire for tasks belonging to the partner's plan
          // We accept all events here because server-side filter by plan_id may miss
          // INSERT events when we don't yet know the plan ID
          onChange();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_submissions', filter: `user_id=eq.${partnerUserId}` },
        onChange,
      )
      .subscribe();
  },

  unsubscribe(channel: RealtimeChannel) {
    void supabase.removeChannel(channel);
  },
};

export const pomodoroService = {
  async complete(input: PomodoroInput) {
    const { data, error } = await supabase.rpc('complete_pomodoro', {
      p_plan_id: input.planId,
      p_task_id: input.taskId ?? null,
      p_duration: input.duration,
      p_session_type: input.sessionType ?? 'focus',
      p_started_at: input.startedAt,
      p_ended_at: input.endedAt,
    });
    return throwIfError(data, error);
  },
};

export const submissionService = {
  async submit(planId: string, remark?: string) {
    const { data, error } = await supabase.rpc('submit_day', {
      p_plan_id: planId,
      p_remark: remark ?? null,
    });
    return throwIfError(data, error);
  },

  async uploadProof(
    submissionId: string,
    userId: string,
    file: Blob | ArrayBuffer,
    extension: 'jpg' | 'png' | 'webp',
    caption?: string,
    taskId?: string,
  ) {
    const path = `${userId}/${submissionId}/${crypto.randomUUID()}.${extension}`;
    const contentType = extension === 'jpg' ? 'image/jpeg' : `image/${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('proof-images')
      .upload(path, file, { contentType, upsert: false });
    throwIfError(undefined, uploadError);
    const { data, error } = await supabase.rpc('create_submission_proof', {
      p_submission_id: submissionId,
      p_image_url: path,
      p_caption: caption ?? null,
      p_task_id: taskId ?? null,
    });
    if (error) {
      await supabase.storage.from('proof-images').remove([path]);
      throw new Error(error.message);
    }
    return data;
  },

  async review(submissionId: string, decision: 'approved' | 'rejected', comment?: string) {
    const rpc = decision === 'approved' ? 'approve_day' : 'reject_day';
    const { data, error } = await supabase.rpc(rpc, {
      p_submission_id: submissionId,
      p_comment: comment ?? null,
    });
    return throwIfError(data, error);
  },

  async getPendingForReview() {
    const { data, error } = await supabase
      .from('daily_submissions')
      .select('*, submission_proofs(*), current_plans(*, current_tasks(*))')
      .eq('status', 'pending')
      .order('submitted_at', { ascending: false });
    return throwIfError(data, error);
  },
};

export const reportService = {
  async list() {
    const { data, error } = await supabase
      .from('daily_reports')
      .select('*, report_tasks(*)')
      .order('date', { ascending: false });
    return throwIfError(data, error);
  },

  async stats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    return throwIfError(data, error);
  },

  async achievements() {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .order('unlocked_at', { ascending: false });
    return throwIfError(data, error);
  },

  subscribeToReports(userId: string, onChange: () => void): RealtimeChannel {
    const channelId = `reports:${userId}-${Math.random().toString(36).substring(2)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_reports', filter: `user_id=eq.${userId}` },
        onChange,
      )
      .subscribe();
  },
};

export const notificationService = {
  async listUnread() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .is('read_at', null)
      .order('created_at', { ascending: false });
    return throwIfError(data, error);
  },

  async markRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .select()
      .single();
    return throwIfError(data, error);
  },

  subscribe(onInsert: (notification: TableRow<'notifications'>) => void): RealtimeChannel {
    const channelId = `notifications-${Math.random().toString(36).substring(2)}`;
    return supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => onInsert(payload.new as TableRow<'notifications'>),
      )
      .subscribe();
  },
};

export const pyqService = {
  async start(input: PyqStartInput) {
    const values = pyqStartSchema.parse(input);
    const { data, error } = await supabase.rpc('start_pyq_attempt', {
      p_set_name: values.set_name,
      p_subject: values.subject,
      p_year: values.year,
      p_mode: values.mode,
    });
    return throwIfError(data, error);
  },

  async finish(input: PyqFinishInput) {
    const values = pyqFinishSchema.parse(input);
    const { data, error } = await supabase.rpc('finish_pyq_attempt', {
      p_attempt_id: values.attempt_id,
      p_answers: values.answers as unknown as Json,
    });
    return throwIfError(data, error);
  },
};

import { todayIso, daysAgoIso } from '@/lib/supabase-helpers';

export const waterService = {
  async log(input: WaterLogInput) {
    return this.logWater(input);
  },

  async logWater(input: WaterLogInput) {

    const parsed = waterLogSchema.parse(input);
    const { data, error } = await supabase.rpc('log_water', {
      p_amount_ml: parsed.amount_ml,
    });
    return throwIfError(data, error);
  },

  async getTodayStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const today = todayIso();
    const { data, error } = await supabase
      .from('water_daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();
    return throwIfError(data, error);
  },

  async getTodayLogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const todayStr = todayIso();
    const startOfToday = `${todayStr}T00:00:00.000Z`;
    const endOfToday = `${todayStr}T23:59:59.999Z`;
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', startOfToday)
      .lte('logged_at', endOfToday)
      .order('logged_at', { ascending: false });
    return throwIfError(data ?? [], error);
  },

  async getWeeklyStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const sevenDaysAgoStr = daysAgoIso(6);
    const { data, error } = await supabase
      .from('water_daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: true });
    return throwIfError(data ?? [], error);
  },

  async getStatsHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('water_daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
    return throwIfError(data ?? [], error);
  },
};

export const vocabularyService = {
  async markLearned(input: WordLearnedInput) {
    const values = wordLearnedSchema.parse(input);
    const { data, error } = await supabase.rpc('mark_word_learned', { p_word_id: values.word_id });
    return throwIfError(data, error);
  },
};

export const grammarService = {
  async finishQuiz(input: GrammarQuizInput) {
    const values = grammarQuizSchema.parse(input);
    const { data, error } = await supabase.rpc('finish_grammar_quiz', {
      p_topic: values.topic,
      p_correct: values.correct,
      p_wrong: values.wrong,
      p_score: values.score,
      p_set_name: values.set_name,
    });
    return throwIfError(data, error);
  },
};

export const flashcardService = {
  async createCollection(input: FlashcardCollectionInput) {
    const values = flashcardCollectionSchema.parse(input);
    const { data, error } = await supabase.rpc('create_flashcard_collection', {
      p_title: values.title,
      p_description: values.description ?? null,
    });
    return throwIfError(data, error);
  },

  async create(input: FlashcardInput) {
    const values = flashcardSchema.parse(input);
    const { data, error } = await supabase.rpc('create_flashcard', {
      p_collection_id: values.collection_id,
      p_question: values.question,
      p_answer: values.answer,
    });
    return throwIfError(data, error);
  },

  async update(input: FlashcardUpdateInput) {
    const values = flashcardUpdateSchema.parse(input);
    const { data, error } = await supabase.rpc('update_flashcard', {
      p_card_id: values.card_id,
      p_question: values.question,
      p_answer: values.answer,
      p_collection_id: values.collection_id,
    });
    return throwIfError(data, error);
  },

  async delete(input: FlashcardIdInput) {
    const values = flashcardIdSchema.parse(input);
    const { data, error } = await supabase.rpc('delete_flashcard', { p_card_id: values.card_id });
    return throwIfError(data, error);
  },

  async getCollections() {
    const { data, error } = await supabase
      .from('flashcard_collections')
      .select('*')
      .order('title', { ascending: true });
    return throwIfError(data ?? [], error);
  },

  async getFlashcards() {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*, flashcard_schedule(*)')
      .eq('type', 'user');
    return throwIfError(data ?? [], error);
  },

  async updateCollection(collectionId: string, title: string) {
    const { data, error } = await supabase
      .from('flashcard_collections')
      .update({ title })
      .eq('id', collectionId)
      .select()
      .single();
    return throwIfError(data, error);
  },

  async deleteCollection(collectionId: string) {
    // Delete all flashcards in the collection first to satisfy ON DELETE RESTRICT constraint
    const { error: cardsError } = await supabase
      .from('flashcards')
      .delete()
      .eq('collection_id', collectionId);
    if (cardsError) throw cardsError;

    const { data, error } = await supabase
      .from('flashcard_collections')
      .delete()
      .eq('id', collectionId)
      .select()
      .single();
    return throwIfError(data, error);
  },

  async review(input: FlashcardReviewInput) {
    const values = flashcardReviewSchema.parse(input);
    const { data, error } = await supabase.rpc('review_flashcard', {
      p_card_id: values.card_id,
      p_rating: values.rating,
    });
    return throwIfError(data, error);
  },
};

export const testingService = {
  async resetAllData() {
    const { data, error } = await (supabase as any).rpc('reset_all_data');
    return throwIfError(data, error);
  },
};
