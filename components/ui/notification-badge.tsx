import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useNotificationStore } from '@/stores/notification-store';
import { glassCardStyle, palette, radius } from '@/theme';

export function NotificationBadge() {
  const router = useRouter();

  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  return (
    <Pressable
      onPress={() => router.push('/(app)/notifications')}
      style={({ pressed }) => [
        styles.container,
        pressed && { opacity: 0.75, transform: [{ scale: 0.95 }] },
      ]}
    >
      <Text style={{ fontSize: 18 }}>🔔</Text>
      {unreadCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 245, 247, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#C73A57',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: palette.cherryBloom,
    borderRadius: radius.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
});

