import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { AnnouncementItem } from '../types';
import { fonts, glassCardStyle, palette, radius, spacing } from '@/theme';

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
      <View style={[styles.board, styles.emptyBoard]}>
        <Text style={{ fontFamily: fonts.mascot, color: palette.textSecondary, fontSize: 13, textAlign: 'center', fontWeight: '500' }}>
          ✨ Companion Bulletin Board — All caught up!
        </Text>
      </View>
    );
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return { label: 'CRITICAL', bg: palette.danger, color: '#ffffff' };
      case 'high':
        return { label: 'HIGH', bg: palette.primaryGlow, color: '#ffffff' };
      case 'normal':
      default:
        return { label: 'INFO', bg: palette.blush, color: palette.cherryBloom };
    }
  };

  const priorityStyle = getPriorityStyle(announcement.priority);

  return (
    <Animated.View
      style={[
        styles.board,
        {
          transform: [{ translateY: slideAnim }],
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={{ fontSize: 18 }}>{announcement.icon}</Text>
        <Text
          style={[
            { color: palette.textPrimary, fontSize: 14, fontWeight: '700', flex: 1 },
          ]}
          numberOfLines={1}
        >
          {announcement.title}
        </Text>

        {/* Priority Badge */}
        <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
          <Text style={{ fontFamily: fonts.mono, color: priorityStyle.color, fontSize: 10, fontWeight: '800' }}>
            {priorityStyle.label}
          </Text>
        </View>

        {/* Queue Counter Indicator */}
        {queueCount > 0 ? (
          <View style={[styles.queueBadge, { backgroundColor: palette.cherryBloom }]}>
            <Text style={{ fontFamily: fonts.mono, color: '#fff', fontSize: 10, fontWeight: '800' }}>+{queueCount}</Text>
          </View>
        ) : null}

        {onDismiss ? (
          <Pressable onPress={onDismiss} style={{ padding: 4 }}>
            <Text style={{ color: palette.textMuted, fontSize: 14 }}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Typing Announcement Text */}
      <Text style={{ fontFamily: fonts.mascot, color: palette.textSecondary, fontSize: 13, marginTop: spacing[4], lineHeight: 18 }}>
        {typingText}
        {isTyping ? <Text style={{ color: palette.cherryBloom, fontWeight: '900' }}>|</Text> : ''}
      </Text>

      {/* XP Floater Tag if present */}
      {announcement.xpBonus ? (
        <View style={styles.xpFloater}>
          <Text style={{ fontFamily: fonts.mono, color: palette.cherryBloom, fontWeight: '800', fontSize: 12 }}>
            ⭐ +{announcement.xpBonus} XP
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  board: {
    ...glassCardStyle,
    borderRadius: radius.card,
    padding: spacing[12],
    gap: spacing[4],
  },
  emptyBoard: {
    backgroundColor: 'rgba(255, 245, 247, 0.25)',
    borderColor: 'rgba(250, 215, 224, 0.4)',
    borderStyle: 'dashed',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  queueBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  xpFloater: {
    alignSelf: 'flex-start',
    backgroundColor: palette.blush,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: 'rgba(232, 77, 114, 0.2)',
  },
});

