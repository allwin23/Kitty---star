import { ChromiumAdapter } from '../blocking/adapter';
import { CoreFocusEngine } from '../blocking/engine';
import { SyncManager } from '../supabase/sync-manager';
import { supabase } from '../supabase/client';

const adapter = new ChromiumAdapter();
const engine = new CoreFocusEngine(adapter);
const syncManager = new SyncManager(engine);

// Initialize engine (restores local session first)
engine
  .init()
  .then(() => {
    // Then synchronize with Supabase
    syncManager.init();
  })
  .catch((err) => {
    console.error('[Background] Core engine initialization failed:', err);
  });

// Setup startup listeners (idempotent, as engine already calls checkAndRestoreSession)
chrome.runtime.onStartup.addListener(() => {
  void engine.checkAndRestoreSession();
  setupSyncAlarm();
});

chrome.runtime.onInstalled.addListener(() => {
  void engine.checkAndRestoreSession();
  setupSyncAlarm();
});

function setupSyncAlarm() {
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    chrome.alarms.create('focus_sync_poll', { periodInMinutes: 1 });
    console.log('[Background] Scheduled focus_sync_poll alarm (1 min period).');
  }
}

// Listen to alarms to run background database sync
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'focus_sync_poll') {
      console.log('[Background] Sync poll alarm fired. Fetching latest session...');
      void syncManager.syncLatestSession();
    }
  });
}

// Wake up and sync on page navigation to prevent bypasses when worker is asleep
if (typeof chrome !== 'undefined' && chrome.tabs) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && tab.url) {
      console.log('[Background] Tab load detected. Triggering database sync check...');
      void syncManager.syncLatestSession();
    }
  });
}

// Setup message routing
adapter.onMessage((message, sendResponse) => {
  if (message.type === 'START_SESSION') {
    engine
      .startFocusSession(
        message.durationMinutes,
        message.blockedCategories || [],
        message.customDomains || [],
        message.strictMode || false,
        message.sessionId || null,
      )
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === 'STOP_SESSION') {
    engine
      .cancelFocusSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === 'RESET_SESSION') {
    engine
      .resetFocusSession()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === 'GET_SESSION') {
    engine
      .getSessionState()
      .then((session) => sendResponse({ success: true, session }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
  } else if (message.type === 'CHECK_YOUTUBE_SESSION') {
    engine
      .getSessionState()
      .then(async (session) => {
        const studyEmail = (await engine.getStorage('studyEmail')) || '';
        sendResponse({ success: true, active: session.active, studyEmail });
      })
      .catch((err) => sendResponse({ success: false, error: err.message }));
  }
});

// Listen to storage changes to sync session from popup to background worker in real-time
if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      const authKey = Object.keys(changes).find(
        (key) => key.startsWith('sb-') && key.endsWith('-auth-token'),
      );
      if (authKey) {
        const change = changes[authKey];
        if (change.newValue) {
          try {
            const sessionObj =
              typeof change.newValue === 'string' ? JSON.parse(change.newValue) : change.newValue;

            // Check if current loaded session already matches to break infinite update loop
            supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
              if (currentSession?.access_token === sessionObj?.access_token) {
                return; // already synced
              }

              console.log('[Background] Auth token updated in storage. Re-establishing session...');
              supabase.auth
                .setSession(sessionObj)
                .then(({ error }) => {
                  if (error) {
                    console.error('[Background] Auth setSession failed:', error.message);
                    void engine.setStorage('lastSyncError', `Auth sync failed: ${error.message}`);
                  } else {
                    console.log('[Background] Auth setSession succeeded.');
                    void engine.setStorage('lastSyncError', null);
                  }
                })
                .catch((err: any) => {
                  console.error('[Background] Auth setSession error:', err);
                  void engine.setStorage(
                    'lastSyncError',
                    `Auth error: ${err.message || String(err)}`,
                  );
                });
            });
          } catch (e: any) {
            console.error('[Background] Failed to parse new auth token session:', e);
            void engine.setStorage('lastSyncError', `Parse auth error: ${e.message || String(e)}`);
          }
        } else {
          // Only sign out if current session is not already empty
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
              console.log('[Background] Auth token removed from storage. Signing out...');
              void supabase.auth.signOut();
            }
            void engine.setStorage('lastSyncError', null);
          });
        }
      }
    }
  });
}
