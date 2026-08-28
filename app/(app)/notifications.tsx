import { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Bell,
  BookOpen,
  CheckCheck,
  Droplets,
  Settings,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react-native';

import { EmptyState, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { NotificationCard } from '@/features/notifications/components/notification-card';
import { useAuthStore } from '@/stores';
import { useNotificationStore } from '@/stores/notification-store';
import { palette, radius, spacing } from '@/theme';

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

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchNotifications();
    }, [fetchNotifications]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleClearAll = () => {
    const title = 'Clear All Notifications';
    const msg = 'Are you sure you want to clear your entire notification history?';
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}`)) {
        void clearAll();
      }
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: () => void clearAll() },
      ]);
    }
  };

  // Filter list by active filter chip
  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'unread' && item.read_at) return false;
    if (activeFilter === 'partner' && item.category !== 'partner') return false;
    if (activeFilter === 'study' && item.category !== 'study') return false;
    if (activeFilter === 'water' && item.category !== 'water') return false;
    if (activeFilter === 'achievements' && item.category !== 'achievements') return false;
    return true;
  });

  const filterChips = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'unread', label: `Unread (${unreadCount})`, icon: Bell },
    { id: 'partner', label: 'Partner', icon: Users },
    { id: 'study', label: 'Study', icon: BookOpen },
    { id: 'water', label: 'Water', icon: Droplets },
    { id: 'achievements', label: 'Awards', icon: Trophy },
  ];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.danger}
          />
        }
      >
        <View style={styles.container}>
          {/* Header Bar */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1, paddingRight: spacing.sm }}>
              <HeaderTitleCard
                title="Notifications"
                subtitle="Stay up to date with partner activity & study reminders"
              />
            </View>

            <View style={{ gap: 6, alignItems: 'stretch' }}>
              {/* Urge Control Button */}
              <Pressable
                onPress={() => router.push('/(app)/urge-control')}
                style={styles.headerUrgeBtn}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <ShieldCheck size={13} color="#FFFFFF" strokeWidth={2.4} />
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    Urge Control
                  </Text>
                </View>
              </Pressable>

              {/* Quick Settings Button */}
              <Pressable
                onPress={() => router.push('/(app)/notifications-settings')}
                style={styles.headerSettingsBtn}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Settings size={13} color={palette.danger} strokeWidth={2.2} />
                  <Text style={{ color: palette.danger, fontSize: 11, fontWeight: '800' }}>
                    Settings
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Action Toolbar */}
          <View style={styles.toolbarRow}>
            <Pressable
              onPress={() => void markAllAsRead()}
              disabled={unreadCount === 0}
              style={[styles.actionBtn, { opacity: unreadCount > 0 ? 1 : 0.5 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CheckCheck size={16} color={palette.danger} strokeWidth={2.4} />
                <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '800' }}>
                  Mark All Read
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={handleClearAll}
              disabled={notifications.length === 0}
              style={[styles.actionBtn, { opacity: notifications.length > 0 ? 1 : 0.5 }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Trash2 size={16} color={palette.danger} strokeWidth={2.4} />
                <Text style={{ color: palette.danger, fontSize: 13, fontWeight: '800' }}>
                  Clear All
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {filterChips.map((chip) => {
              const active = activeFilter === chip.id;
              const ChipIcon = chip.icon;

              return (
                <Pressable
                  key={chip.id}
                  onPress={() => setActiveFilter(chip.id)}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? palette.danger : 'rgba(255, 243, 245, 0.85)',
                      borderColor: active ? palette.danger : 'rgba(250, 215, 224, 0.85)',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ChipIcon
                      size={14}
                      color={active ? '#FFFFFF' : palette.textPrimary}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={{
                        color: active ? '#FFFFFF' : palette.textPrimary,
                        fontSize: 13,
                        fontWeight: active ? '800' : '600',
                      }}
                    >
                      {chip.label}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Notifications List */}
          {loading && notifications.length === 0 ? (
            <Loading />
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <EmptyState
                title="No Notifications"
                description={
                  activeFilter === 'unread'
                    ? 'You are all caught up! No unread alerts.'
                    : 'You have no notifications in this category.'
                }
              />
            </View>
          ) : (
            <View style={{ gap: spacing.sm }}>
              {filteredNotifications.map((n) => (
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSettingsBtn: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  headerUrgeBtn: {
    backgroundColor: palette.danger,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  filterChip: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  emptyContainer: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
});
