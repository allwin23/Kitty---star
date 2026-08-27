import { SyncManager } from '../supabase/sync-manager';
import { CoreFocusEngine } from '../blocking/engine';
import { BrowserAdapter } from '../blocking/adapter';
import { supabase } from '../supabase/client';

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

  onMessage(callback: (message: any, sendResponse: (response: any) => void) => void): void { }
  async sendMessage(message: any): Promise<any> { return null; }
  profileEmail = '';
  async getProfileEmail(): Promise<string> { return this.profileEmail; }
}

// Jest mocks for Supabase client
jest.mock('../supabase/client', () => {
  const mockChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockImplementation((cb) => {
      if (cb) cb('SUBSCRIBED');
      return mockChannel;
    })
  };

  return {
    supabase: {
      auth: {
        onAuthStateChange: jest.fn(),
        getSession: jest.fn().mockResolvedValue({ data: { session: null } })
      },
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
      from: jest.fn()
    }
  };
});

describe('SyncManager Synchronization Unit Tests', () => {
  let adapter: MockBrowserAdapter;
  let engine: CoreFocusEngine;
  let syncManager: SyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new MockBrowserAdapter();
    engine = new CoreFocusEngine(adapter);
    syncManager = new SyncManager(engine);
  });

  test('applyRemoteSession processes active sessions and locks locally', async () => {
    const remoteSession = {
      id: 'session-123',
      status: 'active',
      ends_at: new Date(Date.now() + 600000).toISOString(), // 10m in future
      focus_session_categories: [{ category_id: 'social' }],
      focus_session_custom_sites: [{ domain: 'test.com' }]
    };

    // Access private method to test state reconciliation directly
    await (syncManager as any).applyRemoteSession(remoteSession);

    const localState = await engine.getSessionState();
    expect(localState.active).toBe(true);
    expect(localState.blockedCategories).toContain('social');
    expect(localState.customDomains).toContain('test.com');
  });

  test('applyRemoteSession ignores expired sessions', async () => {
    const remoteSession = {
      id: 'session-expired',
      status: 'active',
      ends_at: new Date(Date.now() - 5000).toISOString(), // 5s in past
      focus_session_categories: [{ category_id: 'social' }]
    };

    await (syncManager as any).applyRemoteSession(remoteSession);

    const localState = await engine.getSessionState();
    expect(localState.active).toBe(false);
  });

  test('applyRemoteSession stops session when status is cancelled', async () => {
    // Start session first
    await engine.startFocusSession(25, ['social'], []);
    expect((await engine.getSessionState()).active).toBe(true);

    const remoteSession = {
      id: 'session-123',
      status: 'cancelled',
      ends_at: new Date(Date.now() + 600000).toISOString(),
      focus_session_categories: []
    };

    await (syncManager as any).applyRemoteSession(remoteSession);

    const localState = await engine.getSessionState();
    expect(localState.active).toBe(false);
  });

  test('Idempotency checks: applyRemoteSession does not re-apply duplicate sessions', async () => {
    const endsAt = Date.now() + 600000;
    const remoteSession = {
      id: 'session-123',
      status: 'active',
      ends_at: new Date(endsAt).toISOString(),
      focus_session_categories: [{ category_id: 'social' }],
      focus_session_custom_sites: []
    };

    const spyStart = jest.spyOn(engine, 'startFocusSession');

    // Run first time
    await (syncManager as any).applyRemoteSession(remoteSession);
    // Run duplicate time
    await (syncManager as any).applyRemoteSession(remoteSession);

    // Should only be called once because the second call was a duplicate match
    expect(spyStart).toHaveBeenCalledTimes(1);
    spyStart.mockRestore();
  });

  test('Database sync error preserves local session lock (Offline Safety)', async () => {
    // Start focus locally
    await engine.startFocusSession(25, ['social'], []);
    expect((await engine.getSessionState()).active).toBe(true);

    // Mock query failure
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockRejectedValue(new Error("Network is down!"))
    });

    (syncManager as any).currentUserId = 'user-abc';
    await syncManager.syncLatestSession();

    // Verify: local session remains active (failsafe lock)
    const localState = await engine.getSessionState();
    expect(localState.active).toBe(true);
  });
});
