import { ChromiumAdapter } from '../blocking/adapter';
import { supabase } from '../supabase/client';

document.addEventListener("DOMContentLoaded", () => {
  const adapter = new ChromiumAdapter();

  const loginView = document.getElementById("login-view")!;
  const idleView = document.getElementById("idle-view")!;
  const activeView = document.getElementById("active-view")!;
  const completedView = document.getElementById("completed-view")!;
  const authFooter = document.getElementById("auth-footer")!;
  const syncInfoBlock = document.getElementById("sync-info-block")!;

  const loginBtn = document.getElementById("login-btn")!;
  const stopBtn = document.getElementById("stop-btn")!;
  const restartBtn = document.getElementById("restart-btn")!;
  const signoutLink = document.getElementById("signout-link")!;

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const timerDisplay = document.getElementById("timer-display")!;
  const blockedListDesc = document.getElementById("blocked-list-desc")!;
  const userDisplay = document.getElementById("user-display")!;

  const profileEmailDisplay = document.getElementById("profile-email-display")!;
  const studyEmailDisplay = document.getElementById("study-email-display")!;
  const exceptionStatusDisplay = document.getElementById("exception-status-display")!;

  // Debug Spans
  const debugActive = document.getElementById("debug-active")!;
  const debugEnds = document.getElementById("debug-ends")!;
  const debugTime = document.getElementById("debug-time")!;
  const debugDiff = document.getElementById("debug-diff")!;
  const debugErrorRow = document.getElementById("debug-error-row")!;
  const debugError = document.getElementById("debug-error")!;

  let timerInterval: any = null;

  // Observe auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[Popup] Auth observer triggered: ${event}`);
    handleAuthState(session);
  });

  // Check current session state immediately on open
  supabase.auth.getSession().then(({ data }) => {
    handleAuthState(data.session);
  });

  // Listen for storage updates (e.g. from background worker sync) to refresh info in real-time
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local') {
        updateUI();
      }
    });
  }

  loginBtn.addEventListener("click", () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      alert("Please enter both email and password.");
      return;
    }

    supabase.auth.signInWithPassword({ email, password })
      .then(({ error }) => {
        if (error) {
          alert("Login failed: " + error.message);
        } else {
          // Input fields reset
          emailInput.value = "";
          passwordInput.value = "";
        }
      })
      .catch((err) => alert("Authentication error: " + err.message));
  });

  signoutLink.addEventListener("click", (e) => {
    e.preventDefault();
    supabase.auth.signOut()
      .then(() => {
        if (timerInterval) {
          clearInterval(timerInterval);
          timerInterval = null;
        }
      })
      .catch((err) => alert("Error logging out: " + err.message));
  });

  stopBtn.addEventListener("click", () => {
    adapter.sendMessage({ type: "STOP_SESSION" })
      .then((response) => {
        if (response && response.success) {
          updateUI();
        } else {
          alert("Error stopping session: " + (response?.error || "unknown"));
        }
      })
      .catch((err) => alert("Communication error: " + err.message));
  });

  restartBtn.addEventListener("click", () => {
    adapter.sendMessage({ type: "RESET_SESSION" })
      .then((response) => {
        if (response && response.success) {
          updateUI();
        } else {
          alert("Error resetting session: " + (response?.error || "unknown"));
        }
      })
      .catch((err) => alert("Communication error: " + err.message));
  });

  function handleAuthState(session: any) {
    if (session?.user) {
      // User is authenticated
      loginView.style.display = "none";
      authFooter.style.display = "block";
      syncInfoBlock.style.display = "block";
      userDisplay.textContent = `Signed in as: ${session.user.email}`;
      updateUI();
    } else {
      // User is not authenticated
      loginView.style.display = "block";
      idleView.style.display = "none";
      activeView.style.display = "none";
      completedView.style.display = "none";
      authFooter.style.display = "none";
      syncInfoBlock.style.display = "none";
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }

  async function updateSyncInfo() {
    try {
      const profileEmail = await adapter.getProfileEmail();
      const studyEmail = (await adapter.getStorage("studyEmail")) || "";

      profileEmailDisplay.textContent = profileEmail || "Not logged into Chrome";
      studyEmailDisplay.textContent = studyEmail || "Not configured on mobile";

      if (profileEmail && studyEmail && profileEmail.trim().toLowerCase() === studyEmail.trim().toLowerCase()) {
        exceptionStatusDisplay.textContent = "🟢 ACTIVE (YouTube Allowed)";
        (exceptionStatusDisplay as HTMLElement).style.color = "#047857";
      } else {
        exceptionStatusDisplay.textContent = "🔴 INACTIVE (YouTube Blocked)";
        (exceptionStatusDisplay as HTMLElement).style.color = "#C73A57";
      }

      // Fetch and display any engine errors from background sync
      const syncError = await adapter.getStorage("lastSyncError");
      if (syncError) {
        debugError.textContent = syncError;
        debugErrorRow.style.display = "block";
      } else {
        debugErrorRow.style.display = "none";
      }
    } catch (e) {
      console.error("[Popup] Failed to load sync info:", e);
    }
  }

  function updateUI() {
    // Refresh sync info whenever UI updates
    void updateSyncInfo();

    adapter.sendMessage({ type: "GET_SESSION" })
      .then((response) => {
        if (response && response.success && response.session) {
          const { active, endsAt, blockedCategories, customDomains, isCompleted, strictMode } = response.session;
          
          // Update Debug Spans
          debugActive.textContent = active.toString();
          debugEnds.textContent = endsAt.toString();
          debugTime.textContent = Date.now().toString();
          debugDiff.textContent = (endsAt - Date.now()).toString();

          if (isCompleted) {
            idleView.style.display = "none";
            activeView.style.display = "none";
            completedView.style.display = "block";
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          } else if (active && endsAt) {
            idleView.style.display = "none";
            activeView.style.display = "block";
            completedView.style.display = "none";
            
            const activeList = [...blockedCategories.map((c: string) => c.toUpperCase()), ...customDomains];
            if (strictMode) {
              stopBtn.style.display = "none";
              blockedListDesc.textContent = `[STRICT MODE] Blocking: ${activeList.join(", ")}`;
            } else {
              stopBtn.style.display = "inline-block";
              blockedListDesc.textContent = `Blocking: ${activeList.join(", ")}`;
            }
            
            if (timerInterval) clearInterval(timerInterval);
            
            const tick = () => {
              const remaining = endsAt - Date.now();
              debugTime.textContent = Date.now().toString();
              debugDiff.textContent = remaining.toString();

              if (remaining <= 0) {
                clearInterval(timerInterval);
                timerInterval = null;
                updateUI();
              } else {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                const pad = (n: number) => String(n).padStart(2, "0");
                timerDisplay.textContent = `${pad(mins)}:${pad(secs)}`;
              }
            };
            
            tick();
            timerInterval = setInterval(tick, 1000);
          } else {
            idleView.style.display = "block";
            activeView.style.display = "none";
            completedView.style.display = "none";
            if (timerInterval) {
              clearInterval(timerInterval);
              timerInterval = null;
            }
          }
        }
      })
      .catch((err) => console.error("Error updating UI:", err));
  }
});
