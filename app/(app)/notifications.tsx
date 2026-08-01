import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { isToday, isYesterday, parseISO } from 'date-fns';

import { Card, EmptyState, Loading, Screen } from '@/components/ui';
import { NotificationCard } from '@/features/notifications/components/notification-card';
import type { NotificationRecord } from '@/features/notifications/types';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing, typography } from '@/theme';

export default function NotificationsScreen() {
  const router = useRouter();


  const user = useAuthStore((s) => s.user);
  const {
    notifications,
    unreadCount,
    loading,
    activeFilter,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    setActiveFilter,
  } = useNotificationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to clear your entire notification history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => void clearAll() },
      ],
    );
  };

  // Filter list by category chip & search query
  const filteredNotifications = notifications.filter((item) => {
    // 1. Filter Chip
    if (activeFilter === 'unread' && item.read_at) return false;
    if (activeFilter === 'partner' && item.category !== 'partner') return false;
    if (activeFilter === 'study' && item.category !== 'study') return false;
    if (activeFilter === 'water' && item.category !== 'water') return false;
    if (activeFilter === 'achievements' && item.category !== 'achievements') return false;

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Group notifications into Today, Yesterday, Earlier
  const todayList: NotificationRecord[] = [];
  const yesterdayList: NotificationRecord[] = [];
  const earlierList: NotificationRecord[] = [];

  filteredNotifications.forEach((n) => {
    try {
      const date = parseISO(n.created_at);
      if (isToday(date)) {
        todayList.push(n);
      } else if (isYesterday(date)) {
        yesterdayList.push(n);
      } else {
        earlierList.push(n);
      }
    } catch (e) {
      earlierList.push(n);
    }
  });

  const filterChips = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread (${unreadCount})` },
    { id: 'partner', label: '👥 Partner' },
    { id: 'study', label: '📚 Study' },
    { id: 'water', label: '💧 Water' },
    { id: 'achievements', label: '🏆 Awards' },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.primary} />
        }
      >
        <View style={{ gap: spacing.md, paddingBottom: spacing['2xl'] }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Pressable onPress={() => router.back()}>
                <Text style={{ color: palette.primary, fontSize: 16 }}>← Back</Text>
              </Pressable>
              <Text style={[typography.title, { color: palette.text, fontSize: 20 }]}>
                Notifications
              </Text>
              {unreadCount > 0 ? (
                <View style={{ backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{unreadCount}</Text>
                </View>
              ) : null}
            </View>

            {/* Quick Settings Icon */}
            <Pressable
              onPress={() => router.push('/(app)/notifications-settings')}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: radius.md,
                paddingHorizontal: spacing.sm,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color: palette.text, fontSize: 13, fontWeight: '600' }}>⚙️ Settings</Text>
            </Pressable>
          </View>

          {/* Action Toolbar */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
            <Pressable
              onPress={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              style={{
                flex: 1,
                backgroundColor: unreadCount > 0 ? `${palette.primary}15` : palette.surface,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: radius.sm,
                paddingVertical: 8,
                alignItems: 'center',
                opacity: unreadCount > 0 ? 1 : 0.5,
              }}
            >
              <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '700' }}>
                ✓ Mark All Read
              </Text>
            </Pressable>

            <Pressable
              onPress={handleClearAll}
              disabled={notifications.length === 0}
              style={{
                backgroundColor: palette.surface,
                borderColor: palette.border,
                borderWidth: 1,
                borderRadius: radius.sm,
                paddingHorizontal: spacing.md,
                paddingVertical: 8,
                opacity: notifications.length > 0 ? 1 : 0.5,
              }}
            >
              <Text style={{ color: palette.danger, fontSize: 12, fontWeight: '600' }}>
                Clear All
              </Text>
            </Pressable>
          </View>

          {/* Search bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: palette.surface,
              borderColor: palette.border,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: spacing.sm,
            }}
          >
            <Text style={{ fontSize: 14 }}>🔍</Text>
            <TextInput
              style={{
                flex: 1,
                color: palette.text,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.xs,
                fontSize: 14,
              }}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search notifications..."
              placeholderTextColor={palette.mutedText}
            />
            {searchQuery ? (
              <Pressable onPress={() => setSearchQuery('')}>
                <Text style={{ color: palette.mutedText, fontSize: 14 }}>✕</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {filterChips.map((chip) => {
              const active = activeFilter === chip.id;
              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setActiveFilter(chip.id)}
                  style={{
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderColor: active ? palette.primary : palette.border,
                    borderWidth: 1,
                    borderRadius: radius.full || 20,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    style={{
                      color: active ? palette.primaryText : palette.text,
                      fontSize: 12,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Content Sections */}
          {loading && notifications.length === 0 ? (
            <Loading />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              title="No Notifications"
              description={
                searchQuery
                  ? `No notifications matching "${searchQuery}"`
                  : activeFilter === 'unread'
                  ? 'You are all caught up! No unread alerts.'
                  : 'You have no notifications in this category.'
              }
            />
          ) : (
            <View style={{ gap: spacing.lg }}>
              {/* Group 1: Today */}
              {todayList.length > 0 && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.title, { color: palette.mutedText, fontSize: 13, textTransform: 'uppercase' }]}>
                    Today ({todayList.length})
                  </Text>
                  {todayList.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </View>
              )}

              {/* Group 2: Yesterday */}
              {yesterdayList.length > 0 && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.title, { color: palette.mutedText, fontSize: 13, textTransform: 'uppercase' }]}>
                    Yesterday ({yesterdayList.length})
                  </Text>
                  {yesterdayList.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </View>
              )}

              {/* Group 3: Earlier */}
              {earlierList.length > 0 && (
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.title, { color: palette.mutedText, fontSize: 13, textTransform: 'uppercase' }]}>
                    Earlier ({earlierList.length})
                  </Text>
                  {earlierList.map((n) => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onMarkRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
