import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import type { AnnouncementItem } from '../types';
import { colors, radius, spacing, typography } from '@/theme';

export interface CompanionBulletinBoardProps {
  announcement: AnnouncementItem | null;
  typingText: string;
  isTyping: boolean;
  queueCount?: number;
  onDismiss?: () => void;
}

export function CompanionBulletinBoard({
  announcement,
  typingText,
  isTyping,
  queueCount = 0,
  onDismiss,
}: CompanionBulletinBoardProps) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const slideAnim = useRef(new Animated.Value(-20)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (announcement) {
      slideAnim.setValue(-20);
      fadeAnim.setValue(0);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [announcement?.id, slideAnim, fadeAnim]);

  if (!announcement) {
    return (
      <View
        style={[
          styles.board,
          {
            backgroundColor: palette.surface,
            borderColor: palette.border,
            borderStyle: 'dashed',
          },
        ]}
      >
        <Text style={{ color: palette.mutedText, fontSize: 13, textAlign: 'center' }}>
          ✨ Companion Bulletin Board — All caught up!
        </Text>
      </View>
    );
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { label: 'CRITICAL', bg: '#ef4444', color: '#ffffff' };
      case 'high':
        return { label: 'HIGH', bg: '#f97316', color: '#ffffff' };
      case 'normal':
      default:
        return { label: 'INFO', bg: `${palette.primary}20`, color: palette.primary };
    }
  };

  const priorityStyle = getPriorityStyle(announcement.priority);

  return (
    <Animated.View
      style={[
        styles.board,
        {
          backgroundColor: announcement.priority === 'critical' ? '#fef2f2' : palette.surface,
          borderColor: announcement.priority === 'critical' ? '#ef4444' : palette.border,
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 20 }}>{announcement.icon}</Text>
        <Text
          style={[
            typography.title,
            { color: palette.text, fontSize: 15, flex: 1 },
          ]}
          numberOfLines={1}
        >
          {announcement.title}
        </Text>

        {/* Priority Badge */}
        <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={{ color: priorityStyle.color, fontSize: 10, fontWeight: '800' }}>
            {priorityStyle.label}
          </Text>
        </View>

        {/* Queue Counter Indicator */}
        {queueCount > 0 ? (
          <View style={[styles.queueBadge, { backgroundColor: palette.primary }]}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>+{queueCount}</Text>
          </View>
        ) : null}

        {onDismiss ? (
          <Pressable onPress={onDismiss} style={{ padding: 4 }}>
            <Text style={{ color: palette.mutedText, fontSize: 14 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Typing Announcement Text */}
      <Text style={[typography.body, { color: palette.text, fontSize: 13, marginTop: spacing.xs }]}>
        {typingText}
        {isTyping ? <Text style={{ color: palette.primary, fontWeight: '900' }}>|</Text> : ''}
      </Text>

      {/* XP Floater Tag if present */}
      {announcement.xpBonus ? (
        <View style={styles.xpFloater}>
          <Text style={{ color: '#16a34a', fontWeight: '800', fontSize: 12 }}>
            ⭐ +{announcement.xpBonus} XP
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    padding: spacing.sm,
    gap: spacing.xs,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  queueBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  xpFloater: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
});
