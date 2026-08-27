import { BrowserAdapter } from './adapter';
import { BlockingRuleManager } from './rules-manager';

export class CoreFocusEngine {
  private adapter: BrowserAdapter;
  private rulesManager: BlockingRuleManager;
  private readonly alarmName = "focus_lock_unlock";
  private isRestoring = false;

  constructor(adapter: BrowserAdapter) {
    this.adapter = adapter;
    this.rulesManager = new BlockingRuleManager(adapter);
  }

  async init() {
    this.adapter.onAlarm((name) => {
      if (name === this.alarmName) {
        console.log("Focus session expired. Unlocking...");
        void this.completeFocusSession();
      }
    });

    await this.checkAndRestoreSession();
  }

  async checkAndRestoreSession() {
    if (this.isRestoring) {
      console.log("[Engine] Restoration already in progress. Skipping duplicate call.");
      return;
    }
    
    this.isRestoring = true;
    try {
      const active = await this.adapter.getStorage("active");
      const endsAt = await this.adapter.getStorage("endsAt");
      const blockedCategories = await this.adapter.getStorage("blockedCategories");
      const customDomains = await this.adapter.getStorage("customDomains");
      const isCompleted = await this.adapter.getStorage("isCompleted");
      const rawStrict = await this.adapter.getStorage("strictMode");
      const strictMode = typeof rawStrict === 'boolean' ? rawStrict : false;

      // Validate storage values to check for corruption
      const isValidActive = typeof active === 'boolean';
      const isValidEndsAt = typeof endsAt === 'number' && !isNaN(endsAt);
      const isValidCategories = Array.isArray(blockedCategories);
      const isValidCustom = Array.isArray(customDomains);
      const isValidStrict = true;

      if (!isValidActive || !isValidEndsAt || !isValidCategories || !isValidCustom || !isValidStrict) {
        console.warn("[Engine] Focus Lock storage corrupted or incomplete. Resetting local session...");
        await this.resetFocusSession();
        return;
      }

      if (active) {
        const remaining = endsAt - Date.now();
        if (remaining > 0) {
          console.log(`[Engine] Restoring active focus session. Remaining: ${Math.round(remaining / 1000)}s`);
          await this.startBlocking(blockedCategories, customDomains, endsAt);
        } else {
          console.log("[Engine] Stored focus session already expired. Transitioning to complete...");
          await this.completeFocusSession();
        }
      } else {
        // If inactive, ensure browser rules are disabled
        if (isCompleted) {
          await this.rulesManager.disableRules();
          await this.adapter.clearAlarm(this.alarmName);
        } else {
          await this.resetFocusSession();
        }
      }
    } catch (err) {
      console.error("[Engine] Critical error during session check and restore:", err);
      // Fail-safe: clear all dynamic rules so the user is never locked out of the browser
      try {
        await this.rulesManager.disableRules();
      } catch (clearErr) {
        console.error("[Engine] Fail-safe rule disabling failed:", clearErr);
      }
    } finally {
      this.isRestoring = false;
    }
  }

  async startFocusSession(durationMinutes: number, blockedCategories: string[], customDomains: string[], strictMode = false) {
    const endsAt = Date.now() + durationMinutes * 60 * 1000;
    await this.adapter.setStorage("active", true);
    await this.adapter.setStorage("endsAt", endsAt);
    await this.adapter.setStorage("blockedCategories", blockedCategories);
    await this.adapter.setStorage("customDomains", customDomains);
    await this.adapter.setStorage("isCompleted", false);
    await this.adapter.setStorage("strictMode", strictMode);
    await this.startBlocking(blockedCategories, customDomains, endsAt);
  }

  async startBlocking(blockedCategories: string[], customDomains: string[], endsAt: number) {
    await this.rulesManager.enableRules(blockedCategories, customDomains);
    await this.adapter.setAlarm(this.alarmName, endsAt);
  }

  // Completing the session (called when alarm triggers)
  async completeFocusSession() {
    await this.adapter.setStorage("active", false);
    await this.adapter.setStorage("endsAt", 0);
    await this.adapter.setStorage("blockedCategories", []);
    await this.adapter.setStorage("customDomains", []);
    await this.adapter.setStorage("isCompleted", true);
    await this.adapter.setStorage("strictMode", false);

    await this.rulesManager.disableRules();
    await this.adapter.clearAlarm(this.alarmName);
  }

  // Cancelling the session (called when user presses Stop)
  async cancelFocusSession() {
    const active = await this.adapter.getStorage("active") || false;
    const endsAt = await this.adapter.getStorage("endsAt") || 0;
    const strictMode = await this.adapter.getStorage("strictMode") || false;

    if (strictMode && active && endsAt > Date.now()) {
      throw new Error("Strict Mode is active: Focus session cannot be cancelled.");
    }

    await this.adapter.setStorage("active", false);
    await this.adapter.setStorage("endsAt", 0);
    await this.adapter.setStorage("blockedCategories", []);
    await this.adapter.setStorage("customDomains", []);
    await this.adapter.setStorage("isCompleted", false);
    await this.adapter.setStorage("strictMode", false);

    await this.rulesManager.disableRules();
    await this.adapter.clearAlarm(this.alarmName);
  }

  // Resetting completed view back to Idle
  async resetFocusSession() {
    await this.adapter.setStorage("active", false);
    await this.adapter.setStorage("endsAt", 0);
    await this.adapter.setStorage("blockedCategories", []);
    await this.adapter.setStorage("customDomains", []);
    await this.adapter.setStorage("isCompleted", false);
    await this.adapter.setStorage("strictMode", false);
    
    await this.rulesManager.disableRules();
    await this.adapter.clearAlarm(this.alarmName);
  }

  async getSessionState() {
    const active = await this.adapter.getStorage("active") || false;
    const endsAt = await this.adapter.getStorage("endsAt") || 0;
    const blockedCategories = await this.adapter.getStorage("blockedCategories") || [];
    const customDomains = await this.adapter.getStorage("customDomains") || [];
    const isCompleted = await this.adapter.getStorage("isCompleted") || false;
    const strictMode = await this.adapter.getStorage("strictMode") || false;
    return { active, endsAt, blockedCategories, customDomains, isCompleted, strictMode };
  }
}
