import { CoreFocusEngine } from '../blocking/engine';
import { BlockingRuleManager } from '../blocking/rules-manager';
import { BrowserAdapter } from '../blocking/adapter';
import { PREDEFINED_CATEGORIES } from '../shared/constants';

class MockBrowserAdapter implements BrowserAdapter {
  storage: Record<string, any> = {};
  alarms: Record<string, number> = {};
  alarmCallback: ((name: string) => void) | null = null;
  blockedDomains: string[] = [];

  async setStorage(key: string, value: any): Promise<void> {
    this.storage[key] = value;
  }

  async getStorage(key: string): Promise<any> {
    return this.storage[key];
  }

  async setAlarm(name: string, triggerTimeMs: number): Promise<void> {
    this.alarms[name] = triggerTimeMs;
  }

  async clearAlarm(name: string): Promise<void> {
    delete this.alarms[name];
  }

  onAlarm(callback: (name: string) => void): void {
    this.alarmCallback = callback;
  }

  async updateBlockingRules(domains: string[]): Promise<void> {
    this.blockedDomains = domains;
  }

  async clearBlockingRules(): Promise<void> {
    this.blockedDomains = [];
  }

  onMessage(callback: (message: any, sendResponse: (response: any) => void) => void): void {
    // Not needed for engine tests
  }

  async sendMessage(message: any): Promise<any> {
    return null;
  }

  profileEmail = '';
  async getProfileEmail(): Promise<string> {
    return this.profileEmail;
  }

  // Trigger test alarms manually
  triggerAlarm(name: string) {
    if (this.alarmCallback) {
      this.alarmCallback(name);
    }
  }
}

describe('BlockingRuleManager Unit Tests', () => {
  let adapter: MockBrowserAdapter;
  let manager: BlockingRuleManager;

  beforeEach(() => {
    adapter = new MockBrowserAdapter();
    manager = new BlockingRuleManager(adapter);
  });

  test('resolveDomains resolves categories correctly', () => {
    const domains = manager.resolveDomains(['social'], []);
    const expected = PREDEFINED_CATEGORIES.find(c => c.id === 'social')?.defaultDomains || [];
    expect(domains).toEqual(expected);
  });

  test('resolveDomains merges multiple categories and custom domains without duplicates', () => {
    const domains = manager.resolveDomains(['social', 'video'], ['custom-test.com', '  YOUTUBE.COM  ']);
    
    expect(domains).toContain('facebook.com'); // social
    expect(domains).toContain('youtube.com');  // video / custom casing
    expect(domains).toContain('custom-test.com'); // custom domain
    
    // Check uniqueness
    const duplicates = domains.filter((item, index) => domains.indexOf(item) !== index);
    expect(duplicates.length).toBe(0);
  });

  test('enableRules resolves and triggers adapter updateDynamicRules', async () => {
    await manager.enableRules(['social'], ['custom.com']);
    expect(adapter.blockedDomains).toContain('facebook.com');
    expect(adapter.blockedDomains).toContain('custom.com');
  });

  test('disableRules clears blocking list', async () => {
    await manager.enableRules(['social'], []);
    expect(adapter.blockedDomains.length).toBeGreaterThan(0);

    await manager.disableRules();
    expect(adapter.blockedDomains).toEqual([]);
  });
});

describe('CoreFocusEngine Phase 3 Unit Tests', () => {
  let adapter: MockBrowserAdapter;
  let engine: CoreFocusEngine;

  beforeEach(() => {
    adapter = new MockBrowserAdapter();
    engine = new CoreFocusEngine(adapter);
  });

  test('Start Focus Session persists state and resolves domain compile rules', async () => {
    const duration = 25;
    const categories = ['social'];
    const custom = ['test.com'];

    await engine.startFocusSession(duration, categories, custom);

    const state = await engine.getSessionState();
    expect(state.active).toBe(true);
    expect(state.isCompleted).toBe(false);
    expect(state.blockedCategories).toEqual(categories);
    expect(state.customDomains).toEqual(custom);
    expect(adapter.blockedDomains).toContain('facebook.com');
    expect(adapter.blockedDomains).toContain('test.com');
  });

  test('Startup recovery restores rules correctly', async () => {
    const endsAt = Date.now() + 10000;
    await adapter.setStorage('active', true);
    await adapter.setStorage('endsAt', endsAt);
    await adapter.setStorage('blockedCategories', ['video']);
    await adapter.setStorage('customDomains', ['abc.com']);

    await engine.checkAndRestoreSession();

    const state = await engine.getSessionState();
    expect(state.active).toBe(true);
    expect(adapter.blockedDomains).toContain('youtube.com');
    expect(adapter.blockedDomains).toContain('abc.com');
  });

  test('Startup recovery completes focus session if expired', async () => {
    const endsAt = Date.now() - 5000;
    await adapter.setStorage('active', true);
    await adapter.setStorage('endsAt', endsAt);
    await adapter.setStorage('blockedCategories', ['video']);
    await adapter.setStorage('customDomains', ['abc.com']);

    await engine.checkAndRestoreSession();

    const state = await engine.getSessionState();
    expect(state.active).toBe(false);
    expect(state.isCompleted).toBe(true);
    expect(adapter.blockedDomains).toEqual([]);
  });

  test('Corrupted state resets to idle and disables blocks', async () => {
    // Set corrupted values in storage
    await adapter.setStorage('active', 'corrupted-string-type-instead-of-boolean');
    await adapter.setStorage('endsAt', 12345);
    await adapter.setStorage('blockedCategories', ['social']);
    await adapter.setStorage('customDomains', 'corrupted-string-instead-of-array');

    await engine.checkAndRestoreSession();

    const state = await engine.getSessionState();
    expect(state.active).toBe(false);
    expect(state.blockedCategories).toEqual([]);
    expect(adapter.blockedDomains).toEqual([]);
  });

  test('Duplicate recovery calls are skipped (idempotent)', async () => {
    const endsAt = Date.now() + 10000;
    await adapter.setStorage('active', true);
    await adapter.setStorage('endsAt', endsAt);
    await adapter.setStorage('blockedCategories', ['social']);
    await adapter.setStorage('customDomains', []);

    // Trigger multiple parallel restoration requests
    const p1 = engine.checkAndRestoreSession();
    const p2 = engine.checkAndRestoreSession();

    await Promise.all([p1, p2]);

    const state = await engine.getSessionState();
    expect(state.active).toBe(true);
    expect(adapter.blockedDomains.length).toBeGreaterThan(0);
  });

  test('Critical error in adapter triggers fail-safe and disables blocks', async () => {
    // Force adapter to throw error on storage retrieval
    adapter.getStorage = async () => {
      throw new Error("Disk read failure");
    };

    // Apply pre-existing dynamic rules
    await adapter.updateBlockingRules(['youtube.com']);
    expect(adapter.blockedDomains).toContain('youtube.com');

    await engine.checkAndRestoreSession();

    // Verify rules are cleared to avoid lockout
    expect(adapter.blockedDomains).toEqual([]);
  });

  test('YouTube Study Profile exemption allows YouTube in Study Profile but blocks it elsewhere', async () => {
    const rulesManager = new BlockingRuleManager(adapter);

    // Case 1: Personal profile context (emails do not match)
    adapter.profileEmail = 'personal@gmail.com';
    await adapter.setStorage('studyEmail', 'student@university.edu');

    let domains = rulesManager.resolveDomains(
      ['video'],
      [],
      adapter.profileEmail,
      'student@university.edu'
    );
    // YouTube should be blocked because the profile does not match the study email
    expect(domains).toContain('youtube.com');

    // Case 2: Study profile context (emails match)
    adapter.profileEmail = 'student@university.edu';
    domains = rulesManager.resolveDomains(
      ['video'],
      [],
      adapter.profileEmail,
      'student@university.edu'
    );
    // YouTube should be excluded from the blocked domains
    expect(domains).not.toContain('youtube.com');
    expect(domains).not.toContain('youtu.be');
  });

  describe('Strict Mode Anti-Bypass Enforcement', () => {
    test('startFocusSession with strictMode enables strict locking', async () => {
      await engine.startFocusSession(25, ['social'], [], true);
      const state = await engine.getSessionState();
      expect(state.active).toBe(true);
      expect(state.strictMode).toBe(true);
    });

    test('cancelFocusSession throws error and preserves rules if strict session is active', async () => {
      await engine.startFocusSession(25, ['social'], [], true);
      
      // Attempt cancel should reject
      await expect(engine.cancelFocusSession()).rejects.toThrow(
        "Strict Mode is active: Focus session cannot be cancelled."
      );

      // Verify session state and rule blocks are preserved
      const state = await engine.getSessionState();
      expect(state.active).toBe(true);
      expect(state.strictMode).toBe(true);
      expect(adapter.blockedDomains).toContain('instagram.com');
    });

    test('cancelFocusSession is allowed if strict session has expired', async () => {
      // Start short focus session
      await engine.startFocusSession(25, ['social'], [], true);
      
      // Mock expiration by setting endsAt to past
      await adapter.setStorage('endsAt', Date.now() - 1000);

      // Cancel should be allowed on expired session
      await engine.cancelFocusSession();

      const state = await engine.getSessionState();
      expect(state.active).toBe(false);
      expect(state.strictMode).toBe(false);
      expect(adapter.blockedDomains).toEqual([]);
    });

    test('completeFocusSession unlocks and clears strictMode upon normal timer expiry', async () => {
      await engine.startFocusSession(25, ['social'], [], true);
      await engine.completeFocusSession();

      const state = await engine.getSessionState();
      expect(state.active).toBe(false);
      expect(state.strictMode).toBe(false);
      expect(adapter.blockedDomains).toEqual([]);
    });
  });
});
