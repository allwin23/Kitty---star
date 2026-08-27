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

export interface NotificationCardProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

function renderCategoryIcon(category: string, size: number) {
  // Dark icons to contrast sharply with the light cards
  const darkColor = '#2A1D22';
  switch (category) {
    case 'partner':
      return <Users size={size} color={darkColor} strokeWidth={2.4} />;
    case 'water':
      return <Droplets size={size} color={darkColor} strokeWidth={2.4} />;
    case 'achievements':
      return <Trophy size={size} color={darkColor} strokeWidth={2.4} />;
    case 'ai_coach':
      return <Bot size={size} color={darkColor} strokeWidth={2.4} />;
    case 'reports':
      return <BarChart2 size={size} color={darkColor} strokeWidth={2.4} />;
    case 'social':
      return <Flame size={size} color={darkColor} strokeWidth={2.4} />;
    case 'study':
    default:
      return <BookOpen size={size} color={darkColor} strokeWidth={2.4} />;
  }
}

export function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const router = useRouter();
  const isUnread = !notification.read_at;

  // Solid, high-contrast badges for readability
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { label: 'URGENT', bg: '#D94C61', color: '#FFFFFF' };
      case 'high':
        return { label: 'HIGH', bg: '#FFBE5C', color: '#2A1D22' };
      case 'medium':
        return { label: 'INFO', bg: '#E84D72', color: '#FFFFFF' };
      case 'low':
      default:
        return { label: 'TIP', bg: '#FFF0F2', color: '#E84D72' };
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
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        width: '100%',
        marginBottom: 10,
      })}
    >
      {/* 
        This is a standard View component. We define background and borders inline 
        using static string hex colors to make it 100% bulletproof on release APKs.
      */}
      <View
        style={[
          styles.cardBase,
          isUnread ? styles.cardUnread : styles.cardRead,
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
                  isUnread && { fontWeight: '800' },
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
                <Text style={{ color: '#E84D72', fontSize: 12, fontWeight: '700' }}>
                  View Details
                </Text>
                <ChevronRight size={14} color="#E84D72" strokeWidth={2.4} />
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
                <X size={14} color="#66545B" strokeWidth={2.4} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 24,
    padding: 16,
    gap: 6,
    // Add flat platform specific styles safely
    ...Platform.select({
      web: {
        elevation: 3,
        shadowColor: '#2a1d22',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      default: {},
    }),
  },
  cardRead: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FAD7E0',
    borderWidth: 1.5,
  },
  cardUnread: {
    backgroundColor: '#FFF5F7',
    borderColor: '#E84D72',
    borderWidth: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    gap: 8,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A1D22',
    flex: 1,
  },
  timeText: {
    fontSize: 11,
    color: '#66545B',
    fontWeight: '500',
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#3A2D32',
    marginTop: 4,
    fontWeight: '500',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E84D72',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  deleteBtn: {
    padding: 4,
  },
});
