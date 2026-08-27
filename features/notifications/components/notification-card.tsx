import { formatDistanceToNow, parseISO } from 'date-fns';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  BarChart2,
  BookOpen,
  Bot,
  ChevronRight,
  Droplets,
  Flame,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import type { NotificationRecord } from '../types';
import { palette, radius, spacing } from '@/theme';

export interface NotificationCardProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function renderCategoryIcon(category: string, size: number) {
  switch (category) {
    case 'partner':
      return <Users size={size} color="#121218" strokeWidth={2.4} />;
    case 'water':
      return <Droplets size={size} color="#121218" strokeWidth={2.4} />;
    case 'achievements':
      return <Trophy size={size} color="#121218" strokeWidth={2.4} />;
    case 'ai_coach':
      return <Bot size={size} color="#121218" strokeWidth={2.4} />;
    case 'reports':
      return <BarChart2 size={size} color="#121218" strokeWidth={2.4} />;
    case 'social':
      return <Flame size={size} color="#121218" strokeWidth={2.4} />;
    case 'study':
    default:
      return <BookOpen size={size} color="#121218" strokeWidth={2.4} />;
  }
}

export function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const router = useRouter();
  const isUnread = !notification.read_at;

  // Get color badge for priority
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'URGENT', bg: 'rgba(239, 68, 68, 0.15)', color: '#DC2626' };
      case 'high':
        return { label: 'HIGH', bg: 'rgba(249, 115, 22, 0.15)', color: '#EA580C' };
      case 'medium':
        return { label: 'INFO', bg: 'rgba(240, 115, 146, 0.15)', color: palette.danger };
      case 'low':
      default:
        return { label: 'TIP', bg: 'rgba(250, 215, 224, 0.5)', color: palette.textSecondary };
    }
  };

  const priorityBadge = getPriorityBadge(notification.priority);

  const formatTime = (isoString: string) => {
    try {
      return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
    } catch {
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
      } catch {
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
          backgroundColor: isUnread ? 'rgba(255, 243, 245, 0.95)' : 'rgba(255, 243, 245, 0.78)',
          borderColor: isUnread ? palette.danger : 'rgba(250, 215, 224, 0.85)',
          borderWidth: isUnread ? 2 : 1.5,
        },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.headerRow}>
        {/* Category Icon Badge */}
        <View style={styles.iconContainer}>
          {renderCategoryIcon(notification.category, 20)}
        </View>

        {/* Title and metadata */}
        <View style={{ flex: 1, gap: 2 }}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.titleText,
                isUnread && { fontWeight: '800', color: palette.textPrimary },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>

            {/* Unread pink indicator dot */}
            {isUnread ? <View style={styles.unreadDot} /> : null}
          </View>

          <Text style={styles.timeText}>
            {formatTime(notification.created_at)}
          </Text>
        </View>
      </View>

      {/* Body Content */}
      <Text style={styles.bodyText}>
        {notification.body}
      </Text>

      {/* Footer Tags & Actions */}
      <View style={styles.footerRow}>
        <View style={[styles.badge, { backgroundColor: priorityBadge.bg }]}>
          <Text style={{ color: priorityBadge.color, fontSize: 10, fontWeight: '800' }}>
            {priorityBadge.label}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {notification.action_url ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: palette.danger, fontSize: 12, fontWeight: '700' }}>
                View Details
              </Text>
              <ChevronRight size={14} color={palette.danger} strokeWidth={2.4} />
            </View>
          ) : null}

          {onDelete ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              style={styles.deleteBtn}
            >
              <X size={14} color={palette.textSecondary} strokeWidth={2.4} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.xs,
    elevation: 3,
    // NOTE: Do NOT add overflow:'hidden' here — it kills backgroundColor on Android release builds when combined with elevation
    ...(Platform.OS === 'web'
      ? ({
          backdropFilter: 'blur(12px) saturate(160%)',
          WebkitBackdropFilter: 'blur(12px) saturate(160%)',
        } as any)
      : {}),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(232, 77, 114, 0.14)',
    borderColor: 'rgba(232, 77, 114, 0.30)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textPrimary,
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: palette.textSecondary,
    fontWeight: '500',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.textPrimary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.danger,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  deleteBtn: {
    padding: 4,
  },
});
