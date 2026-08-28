/// <reference path="../global.d.ts" />
import { focusLockSyncService } from '../../../lib/focus-lock-sync';
import { focusProfilesService } from '../../../lib/focus-profiles-service';
import { supabase } from '@/lib/supabase';
import { useChromeBlockerStore } from '@/stores/chrome-blocker-store';

// Mock React Native aliases virtually
jest.mock(
  '@/lib/supabase',
  () => {
    const mockFrom = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    return {
      supabase: {
        from: jest.fn(() => mockFrom),
      },
    };
  },
  { virtual: true },
);

jest.mock(
  '@/stores/auth-store',
  () => {
    return {
      useAuthStore: {
        getState: () => ({
          user: { id: 'user-mobile-456' },
        }),
      },
    };
  },
  { virtual: true },
);

jest.mock(
  '@/stores/chrome-blocker-store',
  () => {
    let activeSessionId: string | null = null;
    return {
      useChromeBlockerStore: {
        getState: () => ({
          get activeSessionId() {
            return activeSessionId;
          },
          setActiveSessionId: (id: string | null) => {
            activeSessionId = id;
          },
        }),
      },
    };
  },
  { virtual: true },
);

describe('Mobile Pomodoro Sync Service Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useChromeBlockerStore.getState().setActiveSessionId(null);
  });

  test('startFocusLockSession successfully inserts session, categories, and custom domains', async () => {
    const mockSessionInsert = jest.fn();
    const mockCatInsert = jest.fn().mockResolvedValue({ error: null });
    const mockDomainInsert = jest.fn().mockResolvedValue({ error: null });

    const fromMock = supabase.from as jest.Mock;
    fromMock.mockImplementation((table: string) => {
      if (table === 'focus_sessions') {
        return {
          insert: mockSessionInsert.mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'session-uuid-789' },
            error: null,
          }),
        };
      }
      if (table === 'focus_session_categories') {
        return { insert: mockCatInsert };
      }
      if (table === 'focus_session_custom_sites') {
        return { insert: mockDomainInsert };
      }
      return {};
    });

    const sessionId = await focusLockSyncService.startFocusLockSession(
      25,
      ['social', 'video'],
      false,
      ['custom-mobile.com'],
    );

    expect(sessionId).toBe('session-uuid-789');
    expect(mockSessionInsert).toHaveBeenCalled();
    expect(mockCatInsert).toHaveBeenCalledWith([
      { session_id: 'session-uuid-789', category_id: 'social' },
      { session_id: 'session-uuid-789', category_id: 'video' },
    ]);
    expect(mockDomainInsert).toHaveBeenCalledWith([
      { session_id: 'session-uuid-789', domain: 'custom-mobile.com' },
    ]);
    expect(useChromeBlockerStore.getState().activeSessionId).toBe('session-uuid-789');
  });

  test('startFocusLockSession throws error on network failure (no false starts)', async () => {
    const fromMock = supabase.from as jest.Mock;
    fromMock.mockImplementation(() => {
      return {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Network timeout'),
        }),
      };
    });

    await expect(
      focusLockSyncService.startFocusLockSession(25, ['social'], false, []),
    ).rejects.toThrow('Network timeout');

    expect(useChromeBlockerStore.getState().activeSessionId).toBeNull();
  });

  test('completeFocusLockSession updates status to completed', async () => {
    useChromeBlockerStore.getState().setActiveSessionId('active-session-123');

    const mockUpdate = jest.fn();
    const fromMock = supabase.from as jest.Mock;
    fromMock.mockImplementation(() => {
      return {
        update: mockUpdate.mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    await focusLockSyncService.completeFocusLockSession();

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(useChromeBlockerStore.getState().activeSessionId).toBeNull();
  });

  test('cancelFocusLockSession updates status to cancelled', async () => {
    useChromeBlockerStore.getState().setActiveSessionId('active-session-123');

    const mockUpdate = jest.fn();
    const fromMock = supabase.from as jest.Mock;
    fromMock.mockImplementation(() => {
      return {
        update: mockUpdate.mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
    });

    await focusLockSyncService.cancelFocusLockSession();

    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'cancelled' }));
    expect(useChromeBlockerStore.getState().activeSessionId).toBeNull();
  });

  describe('Focus Profiles Service CRUD & Validation Tests', () => {
    test('createProfile inserts data correctly and returns profile ID', async () => {
      const mockProfileInsert = jest.fn();
      const mockCatInsert = jest.fn().mockResolvedValue({ error: null });
      const mockDomainInsert = jest.fn().mockResolvedValue({ error: null });

      const fromMock = supabase.from as jest.Mock;
      fromMock.mockImplementation((table: string) => {
        if (table === 'focus_profiles') {
          return {
            insert: mockProfileInsert.mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { id: 'profile-uuid-111' },
              error: null,
            }),
          };
        }
        if (table === 'focus_profile_categories') {
          return { insert: mockCatInsert };
        }
        if (table === 'focus_profile_custom_sites') {
          return { insert: mockDomainInsert };
        }
        return {};
      });

      const profileId = await focusProfilesService.createProfile(
        'Study Profile',
        30,
        ['social'],
        true,
        ['test.org'],
      );

      expect(profileId).toBe('profile-uuid-111');
      expect(mockProfileInsert).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Study Profile', duration_minutes: 30, strict_mode: true }),
      );
      expect(mockCatInsert).toHaveBeenCalledWith([
        { profile_id: 'profile-uuid-111', category_id: 'social' },
      ]);
      expect(mockDomainInsert).toHaveBeenCalledWith([
        { profile_id: 'profile-uuid-111', domain: 'test.org' },
      ]);
    });

    test('createProfile validation throws error on invalid inputs', async () => {
      // Empty profile name
      await expect(focusProfilesService.createProfile('', 25, [], false, [])).rejects.toThrow(
        'Profile name is required',
      );

      // Invalid duration
      await expect(focusProfilesService.createProfile('Test', 0, [], false, [])).rejects.toThrow(
        'Duration must be at least 1 minute',
      );

      // Invalid domain name format
      await expect(
        focusProfilesService.createProfile('Test', 25, [], false, ['invalid-domain-no-dot']),
      ).rejects.toThrow('Invalid domain name: invalid-domain-no-dot');
    });

    test('deleteProfile deletes profile row in DB', async () => {
      const mockDelete = jest.fn().mockResolvedValue({ error: null });
      const fromMock = supabase.from as jest.Mock;
      fromMock.mockImplementation(() => {
        return {
          delete: mockDelete.mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
        };
      });

      await focusProfilesService.deleteProfile('profile-uuid-999');

      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
