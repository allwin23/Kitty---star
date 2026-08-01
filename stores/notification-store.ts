import { create } from 'zustand';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from './auth-store';
import { NotificationEngine } from '@/features/notifications/engine';
import type { NotificationPreferences, NotificationRecord } from '@/features/notifications/types';

interface NotificationStore {
  notifications: NotificationRecord[];
  unreadCount: number;
  preferences: NotificationPreferences | null;
  activeFilter: string;
  loading: boolean;

  fetchNotifications: () => Promise<void>;
  fetchPreferences: (userId: string) => Promise<void>;
  updatePreferences: (userId: string, partial: Partial<NotificationPreferences>) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setActiveFilter: (filter: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: null,
  activeFilter: 'all',
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ notifications: [], unreadCount: 0, loading: false });
        return;
      }

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data ?? []) as unknown as NotificationRecord[];
      const unread = list.filter((n) => !n.read_at).length;

      set({ notifications: list, unreadCount: unread, loading: false });
    } catch (err) {
      console.error('[NotificationStore] Fetch failed:', err);
      set({ loading: false });
    }
  },

  fetchPreferences: async (userId: string) => {
    try {
      const prefs = await NotificationEngine.getUserPreferences(userId);
      set({ preferences: prefs });
    } catch (err) {
      console.error('[NotificationStore] Preferences fetch failed:', err);
    }
  },

  updatePreferences: async (userId: string, partial: Partial<NotificationPreferences>) => {
    try {
      const current = get().preferences;
      const updated = { ...current, ...partial } as NotificationPreferences;
      set({ preferences: updated });

      const { error } = await (supabase.from('notification_preferences') as any)
        .upsert({
          user_id: userId,
          ...partial,
          updated_at: new Date().toISOString(),
        });

      if (error) console.error('[NotificationStore] Preference save failed:', error.message);
    } catch (err) {
      console.error('[NotificationStore] Preference update error:', err);
    }
  },

  markAsRead: async (id: string) => {
    try {
      const now = new Date().toISOString();
      set((state) => {
        const nextList = state.notifications.map((n) =>
          n.id === id ? { ...n, read_at: now } : n,
        );
        return {
          notifications: nextList,
          unreadCount: nextList.filter((n) => !n.read_at).length,
        };
      });

      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('id', id);

      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error('[NotificationStore] Mark read failed:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toISOString();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read_at: n.read_at || now })),
        unreadCount: 0,
      }));

      await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);

      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error('[NotificationStore] Mark all read failed:', err);
    }
  },

  deleteNotification: async (id: string) => {
    try {
      set((state) => {
        const nextList = state.notifications.filter((n) => n.id !== id);
        return {
          notifications: nextList,
          unreadCount: nextList.filter((n) => !n.read_at).length,
        };
      });

      await supabase.from('notifications').delete().eq('id', id);
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error('[NotificationStore] Delete notification failed:', err);
    }
  },

  clearAll: async () => {
    try {
      set({ notifications: [], unreadCount: 0 });
      const authUser = useAuthStore.getState().user;
      const userId = authUser?.id;
      if (userId) {
        await supabase.from('notifications').delete().eq('user_id', userId);
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await supabase.from('notifications').delete().eq('user_id', user.id);
        }
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error('[NotificationStore] Clear all failed:', err);
    }
  },

  setActiveFilter: (filter: string) => set({ activeFilter: filter }),
}));
