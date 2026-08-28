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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

      const fetchedList = (data ?? []).map((n: any) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type,
        title: n.title,
        body: n.body,
        priority: n.priority || n.data?.priority || 'medium',
        category: n.category || n.data?.category || 'study',
        channel: n.channel || n.data?.channel || 'in_app',
        relevance_score: n.relevance_score ?? n.data?.relevance_score ?? 1,
        data: n.data || {},
        action_url: n.action_url || n.data?.action_url || undefined,
        created_at: n.created_at,
        read_at: n.read_at,
      })) as NotificationRecord[];
      const existingList = get().notifications;

      const mergedMap = new Map<string, NotificationRecord>();
      existingList.forEach((n) => mergedMap.set(n.id, n));
      fetchedList.forEach((n) => mergedMap.set(n.id, n));

      const mergedList = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      const unread = mergedList.filter((n) => !n.read_at).length;
      set({ notifications: mergedList, unreadCount: unread, loading: false });
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

      const { error } = await (supabase.from('notification_preferences') as any).upsert({
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
        const nextList = state.notifications.map((n) => (n.id === id ? { ...n, read_at: now } : n));
        return {
          notifications: nextList,
          unreadCount: nextList.filter((n) => !n.read_at).length,
        };
      });

      await supabase.from('notifications').update({ read_at: now }).eq('id', id);

      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    } catch (err) {
      console.error('[NotificationStore] Mark read failed:', err);
    }
  },

  markAllAsRead: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
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
