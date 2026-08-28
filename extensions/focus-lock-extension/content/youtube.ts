// YouTube Account verification content script

(function() {
  // Send message to background to see if focus lock is active and what the study email is
  chrome.runtime.sendMessage({ type: "CHECK_YOUTUBE_SESSION" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[FocusLock] Communication with background worker failed:", chrome.runtime.lastError.message);
      return;
    }

    if (response && response.active) {
      const studyEmail = (response.studyEmail || "").trim().toLowerCase();
      
      // If no study email is configured, we must block YouTube by default during focus session
      if (!studyEmail) {
        showBlockedOverlay("Study account is not configured in settings.");
        return;
      }

      // Create and show verification overlay immediately to prevent content flashing
      showVerificationOverlay(studyEmail);

      // Listen for the extracted email from the injected script
      let resolved = false;
      const handleMessage = (event: MessageEvent) => {
        if (event.source !== window || !event.data) return;

        if (event.data.type === 'YT_EMAIL_EXTRACTED') {
          resolved = true;
          window.removeEventListener('message', handleMessage);
          
          const ytEmail = (event.data.email || "").trim().toLowerCase();
          console.log("[FocusLock] YouTube email detected:", ytEmail);

          if (ytEmail === studyEmail) {
            console.log("[FocusLock] YouTube email matches study email. Unblocking page.");
            removeOverlay();
          } else {
            console.log("[FocusLock] YouTube email does not match study email. Blocking.");
            showBlockedOverlay(`Current account (${ytEmail}) does not match study email (${studyEmail}).`, studyEmail, ytEmail);
          }
        } else if (event.data.type === 'YT_EMAIL_NOT_FOUND') {
          resolved = true;
          window.removeEventListener('message', handleMessage);
          console.log("[FocusLock] No logged in account detected on YouTube. Blocking.");
          showBlockedOverlay(`You must be logged in with your study email (${studyEmail}) to access YouTube.`, studyEmail, "Logged Out");
        }
      };

      window.addEventListener('message', handleMessage);

      // Inject the extractor script into the page context
      injectExtractor();

      // Safety timeout: if after 5 seconds the injected script hasn't responded, assume blocked
      setTimeout(() => {
        if (!resolved) {
          window.removeEventListener('message', handleMessage);
          showBlockedOverlay(`Verification timed out. You must be logged in with ${studyEmail}.`, studyEmail, "Unknown");
        }
      }, 5000);
    }
  });

  let overlayElement: HTMLDivElement | null = null;

  function showVerificationOverlay(studyEmail: string) {
    if (overlayElement) return;

    overlayElement = document.createElement('div');
    overlayElement.id = 'focus-lock-verification-overlay';
    overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #FFF7F8;
      color: #2A1D22;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      box-sizing: border-box;
      text-align: center;
    `;

    overlayElement.innerHTML = `
      <div style="background: #FFFFFF; border: 2px solid rgba(232, 77, 114, 0.25); border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 16px; align-items: center;">
        <div style="font-size: 48px;">🛡️</div>
        <h2 style="color: #C73A57; margin: 0; font-size: 20px; font-weight: 800;">Verifying YouTube Session</h2>
        <p style="color: #66545B; font-size: 13px; margin: 0; line-height: 1.6; font-weight: 500;">
          Checking if your active YouTube account matches your study email:<br>
          <strong style="color: #2A1D22; word-break: break-all;">${studyEmail}</strong>
        </p>
        <div style="width: 24px; height: 24px; border: 3px solid rgba(232, 77, 114, 0.2); border-top-color: #C73A57; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;

    document.documentElement.appendChild(overlayElement);
  }

  function showBlockedOverlay(reason: string, studyEmail: string = "", currentEmail: string = "") {
    if (!overlayElement) {
      overlayElement = document.createElement('div');
      overlayElement.id = 'focus-lock-verification-overlay';
      document.documentElement.appendChild(overlayElement);
    }

    overlayElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #FFF7F8;
      color: #2A1D22;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 24px;
      box-sizing: border-box;
      text-align: center;
    `;

    const accountDetailsHtml = studyEmail ? `
      <div style="margin-top: 8px; padding: 12px; background: rgba(232, 77, 114, 0.05); border-radius: 8px; text-align: left; font-size: 12px; display: flex; flex-direction: column; gap: 6px; width: 100%; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #66545B; font-weight: 600;">Required Email:</span>
          <strong style="color: #2A1D22; word-break: break-all;">${studyEmail}</strong>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #66545B; font-weight: 600;">Active Account:</span>
          <strong style="color: #C73A57; word-break: break-all;">${currentEmail || "Unknown"}</strong>
        </div>
      </div>
    ` : '';

    overlayElement.innerHTML = `
      <div style="background: #FFFFFF; border: 2px solid rgba(232, 77, 114, 0.4); border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 16px; align-items: center;">
        <div style="font-size: 48px;">🔒</div>
        <h2 style="color: #C73A57; margin: 0; font-size: 20px; font-weight: 800;">YouTube is Locked</h2>
        <p style="color: #66545B; font-size: 13px; margin: 0; line-height: 1.6; font-weight: 500;">
          Your focus session is active. YouTube access is restricted unless logged into your matching Study Account.
        </p>
        ${accountDetailsHtml}
        <p style="color: #9A8D93; font-size: 11px; margin-top: 4px; line-height: 1.4;">
          Please log out and sign back in using the correct study Google Account, or stop the focus session from your mobile app.
        </p>
      </div>
    `;
  }

  function removeOverlay() {
    if (overlayElement && overlayElement.parentNode) {
      overlayElement.parentNode.removeChild(overlayElement);
      overlayElement = null;
    }
  }

  function injectExtractor() {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        function findEmail(obj, visited = new Set()) {
          if (!obj || typeof obj !== 'object' || visited.has(obj)) return null;
          visited.add(obj);
          for (const key in obj) {
            try {
              const val = obj[key];
              if (typeof val === 'string') {
                if (val.includes('@') && /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/.test(val)) {
                  return val;
                }
              } else if (typeof val === 'object') {
                const found = findEmail(val, visited);
                if (found) return found;
              }
            } catch (e) {}
          }
          return null;
        }
        
        let attempts = 0;
        function check() {
          attempts++;
          const email = findEmail(window.ytInitialData) || findEmail(window.ytcfg);
          if (email) {
            window.postMessage({ type: 'YT_EMAIL_EXTRACTED', email }, '*');
          } else if (attempts < 20) {
            setTimeout(check, 100);
          } else {
            window.postMessage({ type: 'YT_EMAIL_NOT_FOUND' }, '*');
          }
        }
        
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          check();
        } else {
          window.addEventListener('DOMContentLoaded', check);
        }
      })();
    `;
    document.documentElement.appendChild(script);
    script.remove();
  }
})();
