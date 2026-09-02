'use client';
import React, { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { useNotificationStore } from '@/stores/notification-store';
import { useAuthStore } from '@/stores';
import { Bell, CheckCheck, Trash2, Users, BookOpen, Droplets, Trophy } from 'lucide-react';
import clsx from 'clsx';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const {
    notifications,
    unreadCount,
    loading,
    activeFilter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    setActiveFilter,
  } = useNotificationStore();

  useEffect(() => {
    if (user) {
      void fetchNotifications();
    }
  }, [user, fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (activeFilter === 'unread') return !n.read_at;
    if (activeFilter === 'partner') return n.category === 'partner';
    if (activeFilter === 'study') return n.category === 'study';
    if (activeFilter === 'water') return n.category === 'water';
    if (activeFilter === 'achievements') return n.category === 'achievements';
    return true;
  });

  const filterChips = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'partner', label: 'Partner' },
    { id: 'study', label: 'Study' },
    { id: 'water', label: 'Water' },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <HeaderTitleCard
            title="Notification Center"
            subtitle="Updates on study goals, partner submissions, and milestones"
          />
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void markAllAsRead()}
              icon={<CheckCheck className="w-3.5 h-3.5" />}
            >
              Mark Read
            </Button>
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => void clearAll()}
              className="text-[#D94C61] hover:bg-rose-50"
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-black transition-all',
                activeFilter === chip.id
                  ? 'bg-[#C73A57] text-white shadow-xs'
                  : 'bg-white/90 text-[#66545B] hover:text-[#C73A57] border border-[#FAD7E0]'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading message="Syncing notifications…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-8 h-8" />}
            title="No notifications here"
            description="You're all caught up! Updates from your study partner will appear here."
          />
        ) : (
          <div className="space-y-2.5">
            {filtered.map((item) => (
              <Card
                key={item.id}
                onClick={() => !item.read_at && markAsRead(item.id)}
                className={clsx(
                  'p-4 transition-all cursor-pointer flex items-start justify-between gap-3',
                  item.read_at ? 'bg-white/75 opacity-80' : 'bg-white/95 border-[#E84D72]/40 shadow-xs'
                )}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!item.read_at && (
                      <span className="w-2 h-2 rounded-full bg-[#E84D72] animate-pulse shrink-0" />
                    )}
                    <h4 className="text-xs font-extrabold text-[#2A1D22]">{item.title}</h4>
                  </div>
                  <p className="text-xs text-[#66545B] leading-relaxed">{item.body}</p>
                  <span className="text-[10px] text-[#BFAFB5] font-semibold block pt-0.5">
                    {new Date(item.created_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
