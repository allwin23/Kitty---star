import { ChromiumAdapter } from '../blocking/adapter';
import { CoreFocusEngine } from '../blocking/engine';
import { SyncManager } from '../supabase/sync-manager';
import { supabase } from '../supabase/client';

const adapter = new ChromiumAdapter();
const engine = new CoreFocusEngine(adapter);
const syncManager = new SyncManager(engine);

// Initialize engine (restores local session first)
engine.init()
  .then(() => {
    // Then synchronize with Supabase
    syncManager.init();
  })
  .catch((err) => {
    console.error("[Background] Core engine initialization failed:", err);
  });

// Setup startup listeners (idempotent, as engine already calls checkAndRestoreSession)
chrome.runtime.onStartup.addListener(() => {
  void engine.checkAndRestoreSession();
});

chrome.runtime.onInstalled.addListener(() => {
  void engine.checkAndRestoreSession();
});

// Setup message routing
adapter.onMessage((message, sendResponse) => {
  if (message.type === "START_SESSION") {
    engine.startFocusSession(
      message.durationMinutes,
      message.blockedCategories || [],
      message.customDomains || [],
      message.strictMode || false,
      message.sessionId || null
    )
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === "STOP_SESSION") {
    engine.cancelFocusSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === "RESET_SESSION") {
    engine.resetFocusSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === "GET_SESSION") {
    engine.getSessionState()
      .then((session) => sendResponse({ success: true, session }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  }
});

// Listen to storage changes to sync session from popup to background worker in real-time
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      const authKey = Object.keys(changes).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      if (authKey) {
        const change = changes[authKey];
        if (change.newValue) {
          console.log("[Background] Auth token updated in storage. Re-establishing session...");
          try {
            const session = typeof change.newValue === 'string' ? JSON.parse(change.newValue) : change.newValue;
            void supabase.auth.setSession(session);
          } catch (e) {
            console.error("[Background] Failed to parse new auth token session:", e);
          }
        } else {
          console.log("[Background] Auth token removed from storage. Signing out...");
          void supabase.auth.signOut();
        }
      }
    }
  });
}
