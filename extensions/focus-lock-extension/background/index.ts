import { ChromiumAdapter } from '../blocking/adapter';
import { CoreFocusEngine } from '../blocking/engine';
import { SyncManager } from '../supabase/sync-manager';

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
