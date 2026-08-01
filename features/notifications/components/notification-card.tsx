import { formatDistanceToNow, parseISO } from 'date-fns';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { NotificationRecord } from '../types';
import { colors, radius, spacing, typography } from '@/theme';

export interface NotificationCardProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();

  const isUnread = !notification.read_at;

  // Get icon for category
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'partner':
        return '👥';
      case 'water':
        return '💧';
      case 'achievements':
        return '🏆';
      case 'ai_coach':
        return '🤖';
      case 'reports':
        return '📊';
      case 'social':
        return '🔥';
      case 'study':
      default:
        return '📚';
    }
  };

  // Get color badge for priority
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'URGENT', bg: '#ef4444', color: '#ffffff' };
      case 'high':
        return { label: 'HIGH', bg: '#f97316', color: '#ffffff' };
      case 'medium':
        return { label: 'INFO', bg: `${palette.primary}20`, color: palette.primary };
      case 'low':
      default:
        return { label: 'TIP', bg: palette.surface, color: palette.mutedText };
    }
  };

  const priorityBadge = getPriorityBadge(notification.priority);

  const formatTime = (isoString: string) => {
    try {
      return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
    } catch (e) {
      return 'just now';
    }
  };

  const handlePress = () => {
    if (isUnread && onMarkRead) {
      onMarkRead(notification.id);
    }

    if (notification.action_url) {
      try {
        router.push(notification.action_url as any);
      } catch (err) {
        console.warn('Failed to navigate notification action url:', notification.action_url);
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isUnread ? `${palette.primary}0D` : palette.surface,
          borderColor: isUnread ? `${palette.primary}50` : palette.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={styles.headerRow}>
        {/* Category Icon */}
        <View style={[styles.iconContainer, { backgroundColor: palette.background }]}>
          <Text style={{ fontSize: 20 }}>{getCategoryIcon(notification.category)}</Text>
        </View>

        {/* Title and metadata */}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                typography.title,
                { color: palette.text, fontSize: 15, flex: 1 },
                isUnread && { fontWeight: '700' },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>

            {/* Unread blue dot */}
            {isUnread ? (
              <View style={[styles.unreadDot, { backgroundColor: palette.primary }]} />
            ) : null}
          </View>

          <Text style={{ color: palette.mutedText, fontSize: 11 }}>
            {formatTime(notification.created_at)}
          </Text>
        </View>
      </View>

      {/* Body Content */}
      <Text style={[typography.body, { color: palette.text, fontSize: 13, marginTop: spacing.xs }]}>
        {notification.body}
      </Text>

      {/* Footer Tags & Actions */}
      <View style={styles.footerRow}>
        <View style={[styles.badge, { backgroundColor: priorityBadge.bg }]}>
          <Text style={{ color: priorityBadge.color, fontSize: 10, fontWeight: '700' }}>
            {priorityBadge.label}
          </Text>
        </View>

        {notification.action_url ? (
          <Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>
            View Details →
          </Text>
        ) : null}

        {onDelete ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            style={{ marginLeft: 'auto', padding: 4 }}
          >
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
});
