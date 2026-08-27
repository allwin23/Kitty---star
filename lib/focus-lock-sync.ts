import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { useChromeBlockerStore } from '@/stores/chrome-blocker-store';

const db = supabase as any;

export const focusLockSyncService = {
  async startFocusLockSession(
    durationMinutes: number,
    blockedCategories: string[],
    strictMode: boolean,
    customDomains: string[]
  ): Promise<string | null> {
    const user = useAuthStore.getState().user;
    if (!user) {
      console.warn('[FocusLockSync] User is not authenticated.');
      return null;
    }

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + durationMinutes * 60000);

    // 1. Insert session record
    const { data: session, error: sessionError } = await db
      .from('focus_sessions')
      .insert({
        user_id: user.id,
        started_at: startedAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'active',
        strict_mode: strictMode,
      })
      .select('id')
      .single();

    if (sessionError) {
      console.error('[FocusLockSync] Failed to insert focus session:', sessionError);
      throw sessionError;
    }

    const sessionId = session.id;

    // 2. Insert blocked categories
    if (blockedCategories.length > 0) {
      const categoryRows = blockedCategories.map((catId) => ({
        session_id: sessionId,
        category_id: catId,
      }));
      const { error: catError } = await db
        .from('focus_session_categories')
        .insert(categoryRows);

      if (catError) {
        console.error('[FocusLockSync] Failed to insert session categories:', catError);
        // Attempt clean up rollback
        await db.from('focus_sessions').delete().eq('id', sessionId);
        throw catError;
      }
    }

    // 3. Insert custom domains
    if (customDomains.length > 0) {
      const domainRows = customDomains.map((domain) => ({
        session_id: sessionId,
        domain: domain.trim().toLowerCase(),
      }));
      const { error: domainError } = await db
        .from('focus_session_custom_sites')
        .insert(domainRows);

      if (domainError) {
        console.error('[FocusLockSync] Failed to insert session custom sites:', domainError);
        // Attempt clean up rollback
        await db.from('focus_sessions').delete().eq('id', sessionId);
        throw domainError;
      }
    }

    useChromeBlockerStore.getState().setActiveSessionId(sessionId);
    console.log(`[FocusLockSync] Session synchronized successfully: ${sessionId}`);
    return sessionId;
  },

  async completeFocusLockSession(): Promise<void> {
    const sessionId = useChromeBlockerStore.getState().activeSessionId;
    if (!sessionId) return;

    const { error } = await db
      .from('focus_sessions')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('[FocusLockSync] Failed to complete focus session:', error);
    } else {
      useChromeBlockerStore.getState().setActiveSessionId(null);
      console.log(`[FocusLockSync] Session completed successfully: ${sessionId}`);
    }
  },

  async cancelFocusLockSession(): Promise<void> {
    const sessionId = useChromeBlockerStore.getState().activeSessionId;
    if (!sessionId) return;

    const { error } = await db
      .from('focus_sessions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('[FocusLockSync] Failed to cancel focus session:', error);
    } else {
      useChromeBlockerStore.getState().setActiveSessionId(null);
      console.log(`[FocusLockSync] Session cancelled successfully: ${sessionId}`);
    }
  },

  async updateStudyEmail(studyEmail: string): Promise<void> {
    const user = useAuthStore.getState().user;
    if (!user) return;

    if (studyEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(studyEmail.trim())) {
        throw new Error('Invalid email address format.');
      }
    }

    const cleanEmail = studyEmail.trim().toLowerCase();

    const { error } = await db
      .from('user_settings')
      .upsert({
        user_id: user.id,
        study_email: cleanEmail,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[FocusLockSync] Failed to update study email:', error);
      throw error;
    }

    useChromeBlockerStore.getState().setStudyEmail(cleanEmail);
    console.log(`[FocusLockSync] Study email synced successfully: ${cleanEmail}`);
  },
};
