import { create } from 'zustand';

type NotificationStore = Record<string, never>;

export const useNotificationStore = create<NotificationStore>(() => ({}));
