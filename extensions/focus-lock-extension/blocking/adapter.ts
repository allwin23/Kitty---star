export interface BrowserAdapter {
  setStorage(key: string, value: any): Promise<void>;
  getStorage(key: string): Promise<any>;
  setAlarm(name: string, triggerTimeMs: number): Promise<void>;
  clearAlarm(name: string): Promise<void>;
  onAlarm(callback: (name: string) => void): void;
  updateBlockingRules(domains: string[]): Promise<void>;
  clearBlockingRules(): Promise<void>;
  onMessage(callback: (message: any, sendResponse: (response: any) => void) => void): void;
  sendMessage(message: any): Promise<any>;
  getProfileEmail(): Promise<string>;
}

export class ChromiumAdapter implements BrowserAdapter {
  async setStorage(key: string, value: any): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ [key]: value });
    }
  }

  async getStorage(key: string): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const data = await chrome.storage.local.get(key);
      return data[key];
    }
    return null;
  }

  async setAlarm(name: string, triggerTimeMs: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await chrome.alarms.clear(name);
      chrome.alarms.create(name, { when: triggerTimeMs });
    }
  }

  async clearAlarm(name: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.alarms) {
      await chrome.alarms.clear(name);
    }
  }

  onAlarm(callback: (name: string) => void): void {
    if (typeof chrome !== 'undefined' && chrome.alarms && chrome.alarms.onAlarm) {
      chrome.alarms.onAlarm.addListener((alarm) => {
        callback(alarm.name);
      });
    }
  }

  async updateBlockingRules(domains: string[]): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map((r) => r.id);

      const addRules = domains.map((domain, index) => {
        const id = index + 1;
        return {
          id,
          priority: 1,
          action: {
            type: 'block' as chrome.declarativeNetRequest.RuleActionType,
          },
          condition: {
            urlFilter: `||${domain}`,
            resourceTypes: [
              'main_frame' as chrome.declarativeNetRequest.ResourceType,
              'sub_frame' as chrome.declarativeNetRequest.ResourceType,
            ],
          },
        };
      });

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules,
      });
    }
  }

  async clearBlockingRules(): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.declarativeNetRequest) {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeRuleIds = existingRules.map((r) => r.id);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds,
        addRules: [],
      });
    }
  }

  onMessage(callback: (message: any, sendResponse: (response: any) => void) => void): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        callback(message, sendResponse);
        return true; // Keep message channel open for async response
      });
    }
  }

  async sendMessage(message: any): Promise<any> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
    return null;
  }

  async getProfileEmail(): Promise<string> {
    if (typeof chrome !== 'undefined' && chrome.identity) {
      const identity = chrome.identity as any;
      if (identity.getProfileUserInfo) {
        try {
          const info = await identity.getProfileUserInfo({ accountStatus: 'ANY' });
          return info?.email || '';
        } catch (e) {
          console.warn('[Adapter] Failed to fetch profile identity email:', e);
        }
      }
    }
    return '';
  }
}
