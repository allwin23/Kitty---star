import { ChromiumAdapter } from '../blocking/adapter';
import { supabase } from '../supabase/client';

document.addEventListener("DOMContentLoaded", () => {
  const adapter = new ChromiumAdapter();

  const loginView = document.getElementById("login-view")!;
  const idleView = document.getElementById("idle-view")!;
  const activeView = document.getElementById("active-view")!;
  const completedView = document.getElementById("completed-view")!;
  const authFooter = document.getElementById("auth-footer")!;

  const loginBtn = document.getElementById("login-btn")!;
  const startBtn = document.getElementById("start-btn")!;
  const stopBtn = document.getElementById("stop-btn")!;
  const restartBtn = document.getElementById("restart-btn")!;
  const signoutLink = document.getElementById("signout-link")!;

  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const durationInput = document.getElementById("duration") as HTMLInputElement;
  const customDomainsInput = document.getElementById("custom-domains") as HTMLInputElement;
  const timerDisplay = document.getElementById("timer-display")!;
  const blockedListDesc = document.getElementById("blocked-list-desc")!;
  const userDisplay = document.getElementById("user-display")!;

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

  startBtn.addEventListener("click", () => {
    const durationMinutes = parseInt(durationInput.value, 10);
    
    // Read selected category checkboxes
    const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked') as NodeListOf<HTMLInputElement>;
    const blockedCategories: string[] = Array.from(categoryCheckboxes).map(cb => cb.value);

    // Read custom domains
    const customDomains = customDomainsInput.value
      .split(",")
      .map(d => d.trim().toLowerCase())
      .filter(d => d.length > 0);

    if (isNaN(durationMinutes) || durationMinutes < 1) {
      alert("Please enter a valid duration.");
      return;
    }

    if (blockedCategories.length === 0 && customDomains.length === 0) {
      alert("Please select at least one category or add a custom domain to block.");
      return;
    }

    adapter.sendMessage({ type: "START_SESSION", durationMinutes, blockedCategories, customDomains })
      .then((response) => {
        if (response && response.success) {
          updateUI();
        } else {
          alert("Error starting session: " + (response?.error || "unknown"));
        }
      })
      .catch((err) => alert("Communication error: " + err.message));
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
      userDisplay.textContent = `Signed in as: ${session.user.email}`;
      updateUI();
    } else {
      // User is not authenticated
      loginView.style.display = "block";
      idleView.style.display = "none";
      activeView.style.display = "none";
      completedView.style.display = "none";
      authFooter.style.display = "none";
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }

  function updateUI() {
    adapter.sendMessage({ type: "GET_SESSION" })
      .then((response) => {
        if (response && response.success && response.session) {
          const { active, endsAt, blockedCategories, customDomains, isCompleted, strictMode } = response.session;
          
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
