import { supabase } from '@/lib/supabase';
import { throwIfError } from '@/lib/supabase-helpers';

/** Read the draft for a specific date (with tasks). Returns null if none. */
export async function getDraft(date: string) {
  const { data, error } = await supabase
    .from('planner_drafts')
    .select('*, draft_tasks(*)')
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Read the initial plan snapshot for a date (with tasks). Returns null if none. */
export async function getInitialPlan(date: string) {
  const { data, error } = await supabase
    .from('initial_plans')
    .select('*, initial_tasks(*)')
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get today's current plan with tasks. Returns null if not started. */
export async function getCurrentPlan(date: string) {
  const { data, error } = await supabase
    .from('current_plans')
    .select('*, current_tasks(*)')
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get my most recent pending submission for a date. */
export async function getMySubmission(date: string) {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*, submission_proofs(*), current_plans(*, current_tasks(*))')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  // Also check for approved/rejected on that date by joining to plan
  if (error) throw new Error(error.message);
  return data;
}

/** Get partner's latest pending submission (visible if we are their partner). */
export async function getPartnerSubmission() {
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*, submission_proofs(*), current_plans(*, current_tasks(*)), profiles!daily_submissions_user_id_fkey(full_name, avatar_url)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get pomodoro sessions for a plan. */
export async function getPomodoroSessions(planId: string) {
  const { data, error } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('plan_id', planId)
    .order('ended_at', { ascending: false });
  return throwIfError(data ?? [], error);
}

/** Get signed URL for a proof image. */
export async function getProofImageUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage
    .from('proof-images')
    .createSignedUrl(path, 60 * 60); // 1 hour
  return data?.signedUrl ?? null;
}
