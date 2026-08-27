import { supabase } from '@/lib/supabase';
import { throwIfError } from '@/lib/supabase-helpers';

/** Read the draft for a specific date (with tasks). Returns null if none. */
export async function getDraft(date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('planner_drafts')
    .select('*, draft_tasks(*)')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Read the initial plan snapshot for a date (with tasks). Returns null if none. */
export async function getInitialPlan(date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('initial_plans')
    .select('*, initial_tasks(*)')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get today's current plan with tasks. Returns null if not started. */
export async function getCurrentPlan(date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('current_plans')
    .select('*, current_tasks(*)')
    .eq('user_id', user.id)
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get my most recent pending submission. */
export async function getMySubmission(_date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*, submission_proofs(*), current_plans(*, current_tasks(*))')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Get partner's latest pending submission (visible if we are their partner). */
export async function getPartnerSubmission() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('daily_submissions')
    .select('*, submission_proofs(*), current_plans(*, current_tasks(*)), profiles!daily_submissions_user_id_fkey(full_name, avatar_url)')
    .eq('status', 'pending')
    .neq('user_id', user.id)
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

/** Get signed URL for a proof image with public URL fallback. */
export async function getProofImageUrl(path: string): Promise<string | null> {
  if (!path) return null;

  // If path is already a full HTTP(S) URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  try {
    const { data, error } = await supabase.storage
      .from('proof-images')
      .createSignedUrl(path, 60 * 60); // 1 hour

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (err) {
    // Fallthrough to public URL fallback
  }

  const { data: pubData } = supabase.storage.from('proof-images').getPublicUrl(path);
  return pubData?.publicUrl ?? null;
}

/** Get the partner's current plan for a date (read-only, for live visibility). */
export async function getPartnerCurrentPlan(date: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  // Get partner_id from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .single();
  if (!profile?.partner_id) return null;
  // Fetch partner's plan — RLS allows reading via new partners_read_current_plans policy
  const { data, error } = await supabase
    .from('current_plans')
    .select('*, current_tasks(*)')
    .eq('user_id', profile.partner_id)
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get the partner's initial plan for a specific date (for the review screen). */
export async function getPartnerInitialPlan(partnerId: string, date: string) {
  const { data, error } = await supabase
    .from('initial_plans')
    .select('*, initial_tasks(*)')
    .eq('user_id', partnerId)
    .eq('date', date)
    .maybeSingle();
  return throwIfError(data, error);
}

/** Get the connected partner's profile information. */
export async function getPartnerProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('partner_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile?.partner_id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', profile.partner_id)
    .maybeSingle();
  return throwIfError(data, error);
}

