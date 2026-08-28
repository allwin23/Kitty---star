import { supabase } from './client';
import { CoreFocusEngine } from '../blocking/engine';

export class SyncManager {
  private engine: CoreFocusEngine;
  private activeChannel: any = null;
  private currentUserId: string | null = null;

  constructor(engine: CoreFocusEngine) {
    this.engine = engine;
  }

  init() {
    // Listen to authentication state changes
    supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[SyncManager] Auth state changed: ${event}`);
      const userId = session?.user?.id || null;
      if (userId !== this.currentUserId) {
        this.currentUserId = userId;
        if (userId) {
          this.subscribeToRealtime(userId);
          void this.syncLatestSession();
        } else {
          this.unsubscribeFromRealtime();
        }
      }
    });

    // Check active session immediately on startup if already authenticated
    void supabase.auth.getSession().then(({ data }) => {
      const userId = data.session?.user?.id || null;
      if (userId) {
        this.currentUserId = userId;
        this.subscribeToRealtime(userId);
        void this.syncLatestSession();
      }
    });
  }

  async syncLatestSession() {
    if (!this.currentUserId) return;
    try {
      // Sync study email setting first
      const { data: settings } = await supabase
        .from('user_settings')
        .select('study_email')
        .eq('user_id', this.currentUserId)
        .maybeSingle();

      if (settings && settings.study_email !== undefined) {
        await this.engine.setStorage('studyEmail', settings.study_email);
        console.log(`[SyncManager] Synced study email from DB: ${settings.study_email}`);
      }

      console.log("[SyncManager] Fetching latest active session...");
      const { data: session, error } = await supabase
        .from('focus_sessions')
        .select(`
          id,
          status,
          ends_at,
          strict_mode,
          updated_at,
          focus_session_categories (category_id),
          focus_session_custom_sites (domain)
        `)
        .eq('user_id', this.currentUserId)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (session) {
        await this.applyRemoteSession(session);
      } else {
        // If there is no active remote session, but we have an active local session:
        // DO NOT unlock locally! Maintain local lock as authoritative.
        console.log("[SyncManager] No remote active sessions found. Preserving local session state.");
      }
    } catch (err) {
      console.error("[SyncManager] Error syncing latest session from DB:", err);
      // Network/Database failure must NEVER automatically unlock an active local session.
    }
  }

  subscribeToRealtime(userId: string) {
    this.unsubscribeFromRealtime();

    console.log(`[SyncManager] Subscribing to realtime channels for user: ${userId}`);
    this.activeChannel = supabase
      .channel(`focus_sessions_sync_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'focus_sessions',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[SyncManager] Realtime payload received:', payload);
          const newRow = payload.new as any;

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            await this.fetchAndApplySession(newRow.id);
          } else if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as any;
            const localState = await this.engine.getSessionState();
            if (oldRow && oldRow.id === localState.sessionId) {
              console.log(`[SyncManager] Active session ${oldRow.id} deleted remotely. Cancelling locally.`);
              try {
                await this.engine.cancelFocusSession();
              } catch (err: any) {
                console.warn("[SyncManager] Remote cancellation via DELETE ignored due to Strict Mode lock:", err.message);
              }
            } else {
              console.log(`[SyncManager] Non-matching session ${oldRow?.id} deleted remotely. Ignoring.`);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`
        },
        async (payload) => {
          console.log('[SyncManager] User settings payload received:', payload);
          const newRow = payload.new as any;
          if (newRow && newRow.study_email !== undefined) {
            await this.engine.setStorage('studyEmail', newRow.study_email);
            console.log(`[SyncManager] Realtime updated study email from DB: ${newRow.study_email}`);
            // Re-apply rules with new study email if session is active
            const localState = await this.engine.getSessionState();
            if (localState.active) {
              await this.engine.startFocusSession(
                Math.round((localState.endsAt - Date.now()) / 60000),
                localState.blockedCategories,
                localState.customDomains,
                localState.strictMode,
                localState.sessionId
              );
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`[SyncManager] Realtime channel status: ${status}`);
        if (status === 'SUBSCRIBED') {
          // Re-sync on subscription establish/reconnect
          void this.syncLatestSession();
        }
      });
  }

  unsubscribeFromRealtime() {
    if (this.activeChannel) {
      void supabase.removeChannel(this.activeChannel);
      this.activeChannel = null;
      console.log("[SyncManager] Unsubscribed from realtime.");
    }
  }

  private async fetchAndApplySession(sessionId: string) {
    try {
      const { data: session, error } = await supabase
        .from('focus_sessions')
        .select(`
          id,
          status,
          ends_at,
          strict_mode,
          updated_at,
          focus_session_categories (category_id),
          focus_session_custom_sites (domain)
        `)
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      if (session) {
        await this.applyRemoteSession(session);
      }
    } catch (err) {
      console.error(`[SyncManager] Failed to fetch updated session data for ID ${sessionId}:`, err);
    }
  }

  private async applyRemoteSession(session: any) {
    const remoteUpdatedAt = session.updated_at || "";
    if (remoteUpdatedAt) {
      const lastSynced = await this.engine.getStorage("lastSyncedUpdatedAt") || "";
      if (lastSynced && new Date(remoteUpdatedAt).getTime() <= new Date(lastSynced).getTime()) {
        console.log(`[SyncManager] Received stale or out-of-order session event (Remote: ${remoteUpdatedAt}, Local Last: ${lastSynced}). Ignoring.`);
        return;
      }
      await this.engine.setStorage("lastSyncedUpdatedAt", remoteUpdatedAt);
    }

    const endsAtMs = new Date(session.ends_at).getTime();
    
    // Validation
    const isExpired = endsAtMs <= Date.now();
    const categories = session.focus_session_categories?.map((c: any) => c.category_id) || [];
    const customDomains = session.focus_session_custom_sites?.map((s: any) => s.domain) || [];

    if (session.status === 'active' && !isExpired) {
      // Reconcile and apply
      const localState = await this.engine.getSessionState();
      
      // Idempotency: skip if already active, endsAt matches, and categories/domains are equal
      const isAlreadyMatching = 
        localState.active &&
        localState.sessionId === session.id &&
        Math.abs(localState.endsAt - endsAtMs) < 2000 && // allow small round-trip millisecond difference
        JSON.stringify(localState.blockedCategories.sort()) === JSON.stringify(categories.sort()) &&
        JSON.stringify(localState.customDomains.sort()) === JSON.stringify(customDomains.sort());

      if (!isAlreadyMatching) {
        console.log(`[SyncManager] Applying remote session lock until: ${new Date(endsAtMs).toISOString()}`);
        const durationMinutes = Math.round((endsAtMs - Date.now()) / 60000);
        await this.engine.startFocusSession(
          durationMinutes > 0 ? durationMinutes : 1,
          categories,
          customDomains,
          session.strict_mode || false,
          session.id
        );
      }
    } else if (session.status === 'completed' || isExpired) {
      const localState = await this.engine.getSessionState();
      if (!localState.active || !localState.sessionId || localState.sessionId === session.id) {
        console.log("[SyncManager] Remote session completed/expired. Completing locally.");
        await this.engine.completeFocusSession();
      } else {
        console.log("[SyncManager] Completed session event does not match active session. Ignoring.");
      }
    } else if (session.status === 'cancelled') {
      const localState = await this.engine.getSessionState();
      if (!localState.active || !localState.sessionId || localState.sessionId === session.id) {
        console.log("[SyncManager] Remote session cancelled. Cancelling locally.");
        try {
          await this.engine.cancelFocusSession();
        } catch (err: any) {
          console.warn("[SyncManager] Remote cancellation ignored due to Strict Mode lock:", err.message);
        }
      } else {
        console.log("[SyncManager] Cancelled session event does not match active session. Ignoring.");
      }
    }
  }
}
