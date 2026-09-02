import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { TableRow } from '@/types/database';

export type NotificationRecord = TableRow<'notifications'> & {
  category?: string;
};

interface NotificationStore {
  notifications: NotificationRecord[];
  unreadCount: number;
  activeFilter: string;
  loading: boolean;

  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  setActiveFilter: (filter: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
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

      const list = (data ?? []).map((n) => ({
        ...n,
        category: (n as any).category || (n.data as any)?.category || 'study',
      }));

      const unread = list.filter((n) => !n.read_at).length;
      set({ notifications: list, unreadCount: unread, loading: false });
    } catch (err) {
      console.error('[NotificationStore] Fetch failed:', err);
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    const list = get().notifications.map((n) =>
      n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
    );
    const unread = list.filter((n) => !n.read_at).length;
    set({ notifications: list, unreadCount: unread });

    try {
      await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.error('[NotificationStore] markRead failed:', err);
    }
  },

  markAllAsRead: async () => {
    const list = get().notifications.map((n) => ({
      ...n,
      read_at: n.read_at || new Date().toISOString(),
    }));
    set({ notifications: list, unreadCount: 0 });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .is('read_at', null);
      }
    } catch (err) {
      console.error('[NotificationStore] markAllAsRead failed:', err);
    }
  },

  deleteNotification: async (id: string) => {
    const list = get().notifications.filter((n) => n.id !== id);
    const unread = list.filter((n) => !n.read_at).length;
    set({ notifications: list, unreadCount: unread });

    try {
      await supabase.from('notifications').delete().eq('id', id);
    } catch (err) {
      console.error('[NotificationStore] delete failed:', err);
    }
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('notifications').delete().eq('user_id', user.id);
      }
    } catch (err) {
      console.error('[NotificationStore] clearAll failed:', err);
    }
  },

  setActiveFilter: (filter: string) => set({ activeFilter: filter }),
}));
