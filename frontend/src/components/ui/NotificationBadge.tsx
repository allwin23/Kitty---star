'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '@/stores/notification-store';
import { useAuthStore } from '@/stores';

export function NotificationBadge() {
  const user = useAuthStore((s) => s.user);
  const { unreadCount, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [user, fetchNotifications]);

  return (
    <Link
      href="/notifications"
      className="relative w-10 h-10 rounded-[18px] bg-white/95 hover:bg-white border border-[#FAD7E0] shadow-sm flex items-center justify-center text-[#C73A57] transition-all hover:scale-105 active:scale-95"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 bg-[#D94C61] text-white text-[11px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
