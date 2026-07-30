import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { Json, TableInsert, TableRow, TableUpdate } from '@/types/database';

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
    const { data, error } = await supabase
      .from('current_plans')
      .select('*, current_tasks(*)')
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

  async addTask(task: CurrentTaskInput) {
    const { data, error } = await supabase.from('current_tasks').insert(task).select().single();
    return throwIfError(data, error);
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase.from('current_tasks').delete().eq('id', taskId);
    throwIfError(undefined, error);
  },

  subscribeToPlan(planId: string, onChange: () => void): RealtimeChannel {
    return supabase
      .channel(`current-plan:${planId}`)
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
    const { data, error } = await supabase.from('user_stats').select('*').single();
    return throwIfError(data, error);
  },

  async achievements() {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*, achievements(*)')
      .order('unlocked_at', { ascending: false });
    return throwIfError(data, error);
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
    return supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => onInsert(payload.new as TableRow<'notifications'>),
      )
      .subscribe();
  },
};
