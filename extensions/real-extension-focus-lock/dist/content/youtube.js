// content/youtube.ts
(function() {
  chrome.runtime.sendMessage({ type: "CHECK_YOUTUBE_SESSION" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[FocusLock] Communication with background worker failed:", chrome.runtime.lastError.message);
      return;
    }
    if (response && response.active) {
      const studyEmail = (response.studyEmail || "").trim().toLowerCase();
      if (!studyEmail) {
        showBlockedOverlay("Study account is not configured in settings.");
        return;
      }
      applyLoadingStyle();
      let verified = false;
      let detectedEmail = "";
      let attempts = 0;
      const maxAttempts = 15;
      const handleMessage = (event) => {
        if (event.source !== window || !event.data)
          return;
        if (event.data.type === "YT_EMAIL_EXTRACTED") {
          const ytEmail = (event.data.email || "").trim().toLowerCase();
          detectedEmail = ytEmail;
          if (ytEmail === studyEmail) {
            verified = true;
            unblockPage();
          }
        }
      };
      window.addEventListener("message", handleMessage);
      injectExtractor();
      const interval = setInterval(() => {
        attempts++;
        const pageHtml = document.documentElement.innerHTML || "";
        if (pageHtml.toLowerCase().includes(studyEmail)) {
          console.log("[FocusLock] Study email found in page HTML source.");
          verified = true;
          unblockPage();
          clearInterval(interval);
          window.removeEventListener("message", handleMessage);
          return;
        }
        if (verified) {
          clearInterval(interval);
          return;
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          window.removeEventListener("message", handleMessage);
          console.log("[FocusLock] Verification timed out. Locking YouTube.");
          showBlockedOverlay(`You must be logged in with your study email (${studyEmail}) to access YouTube.`, studyEmail, detectedEmail || "Logged Out");
        }
      }, 200);
    }
  });
  let overlayElement = null;
  function applyLoadingStyle() {
    if (document.getElementById("focus-lock-loading-style"))
      return;
    const style = document.createElement("style");
    style.id = "focus-lock-loading-style";
    style.textContent = `
      html, body { 
        opacity: 0.05 !important; 
        pointer-events: none !important; 
      }
    `;
    document.documentElement.appendChild(style);
  }
  function removeLoadingStyle() {
    const style = document.getElementById("focus-lock-loading-style");
    if (style)
      style.remove();
  }
  function unblockPage() {
    removeLoadingStyle();
    removeOverlay();
  }
  function showBlockedOverlay(reason, studyEmail = "", currentEmail = "") {
    removeLoadingStyle();
    if (!overlayElement) {
      overlayElement = document.createElement("div");
      overlayElement.id = "focus-lock-verification-overlay";
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
          <strong style="color: #C73A57; word-break: break-all;">${currentEmail || "Logged Out"}</strong>
        </div>
      </div>
    ` : "";
    overlayElement.innerHTML = `
      <div style="background: #FFFFFF; border: 2px solid rgba(232, 77, 114, 0.4); border-radius: 16px; padding: 32px; max-width: 400px; width: 100%; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 16px; align-items: center;">
        <div style="font-size: 48px;">\u{1F512}</div>
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
    const script = document.createElement("script");
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
          const email = findEmail(window.ytInitialData) || 
                        findEmail(window.ytcfg) || 
                        findEmail(window.yt) || 
                        findEmail(window.ytPlayer);
          if (email) {
            window.postMessage({ type: 'YT_EMAIL_EXTRACTED', email }, '*');
          } else if (attempts < 20) {
            setTimeout(check, 100);
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
