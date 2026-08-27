/**
 * Achievement feature components.
 *
 * Presentational components for achievements, gallery, history, and details.
 * All titles, category pills, and section headers use crisp black (#2A1D22) for maximum legibility!
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { format } from 'date-fns';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Crown,
  Droplets,
  Flame,
  Gem,
  Gift,
  Heart,
  HelpCircle,
  History,
  Lock,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react-native';

import { Card, Loading, EmptyState, Button, Input } from '@/components/ui';
import { glassCardStyle, palette, radius, spacing } from '@/theme';
import {
  getAchievementCategory,
  getAchievementXPReward,
  type AchievementRow,
  type UserAchievementWithDetails,
  type AchievementCategory,
} from '@/services/achievement.service';

function usePalette() {
  return palette;
}

// ─── 12 Icon-Specific Bespoke Micro-Animations ───────────────────────────────

export type AchievementAnimType =
  | 'flame'       // 🔥 Rapid Ignition & Rising Heat Flickers
  | 'trophy'      // 🏆 Triumph Golden Lift & Victory Sway
  | 'target'      // 🎯 Radar Sweep & Lock-in Reticle Snap
  | 'star'        // ⭐ Twinkling Starburst Spin & Pop
  | 'award'       // 💝 Double Heartbeat Thump & Gentle Float
  | 'check'       // ✅ Seal Stamp Elastic Bounce & Checkmark Spin
  | 'clock'       // ⏱️ Step Ticking Pendulum Swing
  | 'droplets'    // 💧 Liquid Drop Fall, Splash & Squish
  | 'book'        // 📖 Book Page Flip & Open Flutter
  | 'zap'         // ⚡ Electric Thunder Bolt Tremor & Flash
  | 'crown'       // 👑 Royal Majesty Levitation
  | 'secret';     // ❓ Mystery Curiosity Hover

export function ContextualAchievementIcon({
  code = '',
  size = 22,
  customIcon,
  customColor,
}: {
  code?: string;
  size?: number;
  customIcon?: LucideIcon;
  customColor?: string;
}) {
  let Icon: LucideIcon = Trophy;
  let type: AchievementAnimType = 'trophy';
  let color = '#D94C61';

  const c = code.toLowerCase();

  if (c.includes('streak') || c === 'seven_day_streak') {
    Icon = Flame;
    type = 'flame';
    color = '#FF9F1C';
  } else if (c.includes('pomodoro') || c === 'first_pomodoro') {
    Icon = Clock;
    type = 'clock';
    color = '#3B82F6';
  } else if (c.includes('hundred') || c.includes('target') || c.includes('goal')) {
    Icon = Target;
    type = 'target';
    color = '#8B5CF6';
  } else if (c.includes('approved') || c === 'first_approved_day') {
    Icon = CheckCircle2;
    type = 'check';
    color = '#16a34a';
  } else if (c.includes('water') || c.includes('hydration')) {
    Icon = Droplets;
    type = 'droplets';
    color = '#06B6D4';
  } else if (c.includes('pyq') || c.includes('test') || c.includes('vocab') || c.includes('book')) {
    Icon = BookOpen;
    type = 'book';
    color = '#EC4899';
  } else if (c.includes('flashcard') || c.includes('speed')) {
    Icon = Zap;
    type = 'zap';
    color = '#F59E0B';
  } else if (c.includes('partner') || c.includes('award')) {
    Icon = Heart;
    type = 'award';
    color = '#EC4899';
  } else if (c.includes('level') || c.includes('xp') || c.includes('star')) {
    Icon = Star;
    type = 'star';
    color = '#F59E0B';
  } else if (c.includes('master') || c.includes('king') || c.includes('crown')) {
    Icon = Crown;
    type = 'crown';
    color = '#FFBE5C';
  } else if (c.startsWith('secret_')) {
    Icon = HelpCircle;
    type = 'secret';
    color = '#2A1D22';
  }

  if (customIcon) Icon = customIcon;
  if (customColor) color = customColor;

  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const scaleX = useSharedValue(1);
  const scaleY = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    switch (type) {
      case 'flame': {
        translateY.value = withRepeat(
          withSequence(
            withTiming(-7, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(2, { duration: 140, easing: Easing.in(Easing.quad) }),
            withTiming(-4, { duration: 160 }),
            withTiming(1, { duration: 140 }),
            withTiming(0, { duration: 200 }),
            withTiming(0, { duration: 1000 })
          ),
          -1,
          false
        );
        translateX.value = withRepeat(
          withSequence(
            withTiming(-2, { duration: 120 }),
            withTiming(2, { duration: 120 }),
            withTiming(-1, { duration: 100 }),
            withTiming(1, { duration: 100 }),
            withTiming(0, { duration: 150 }),
            withTiming(0, { duration: 1250 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.32, { duration: 220 }),
            withTiming(0.9, { duration: 180 }),
            withTiming(1.18, { duration: 180 }),
            withTiming(1, { duration: 250 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          false
        );
        break;
      }

      case 'target': {
        rotation.value = withRepeat(
          withTiming(360, { duration: 5500, easing: Easing.linear }),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.35, { duration: 400, easing: Easing.out(Easing.back(2)) }),
            withTiming(0.92, { duration: 300 }),
            withTiming(1.15, { duration: 350 }),
            withTiming(1.0, { duration: 400 }),
            withTiming(1.0, { duration: 2000 })
          ),
          -1,
          false
        );
        break;
      }

      case 'award': {
        scale.value = withRepeat(
          withSequence(
            withTiming(1.35, { duration: 180, easing: Easing.out(Easing.quad) }),
            withTiming(1.08, { duration: 140 }),
            withTiming(1.28, { duration: 160 }),
            withTiming(1.0, { duration: 300 }),
            withTiming(1.0, { duration: 1400 })
          ),
          -1,
          false
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 400, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 400 }),
            withTiming(0, { duration: 1380 })
          ),
          -1,
          false
        );
        break;
      }

      case 'check': {
        translateY.value = withRepeat(
          withSequence(
            withTiming(4, { duration: 140 }),
            withTiming(-6, { duration: 280, easing: Easing.out(Easing.back(3)) }),
            withTiming(0, { duration: 200 }),
            withTiming(0, { duration: 1600 })
          ),
          -1,
          false
        );
        rotation.value = withRepeat(
          withSequence(
            withTiming(20, { duration: 200 }),
            withTiming(-10, { duration: 200 }),
            withTiming(0, { duration: 200 }),
            withTiming(0, { duration: 1600 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 220 }),
            withTiming(0.95, { duration: 200 }),
            withTiming(1, { duration: 200 }),
            withTiming(1, { duration: 1600 })
          ),
          -1,
          false
        );
        break;
      }

      case 'clock': {
        rotation.value = withRepeat(
          withSequence(
            withTiming(-26, { duration: 350, easing: Easing.out(Easing.exp) }),
            withTiming(26, { duration: 350, easing: Easing.out(Easing.exp) }),
            withTiming(-14, { duration: 300, easing: Easing.out(Easing.exp) }),
            withTiming(14, { duration: 300, easing: Easing.out(Easing.exp) }),
            withTiming(0, { duration: 300 }),
            withTiming(0, { duration: 900 })
          ),
          -1,
          false
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(3, { duration: 200 }),
            withTiming(0, { duration: 200 }),
            withTiming(0, { duration: 1900 })
          ),
          -1,
          false
        );
        break;
      }

      case 'droplets': {
        translateY.value = withRepeat(
          withSequence(
            withTiming(7, { duration: 300, easing: Easing.in(Easing.quad) }),
            withTiming(-8, { duration: 350, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 250 }),
            withTiming(0, { duration: 1300 })
          ),
          -1,
          false
        );
        scaleX.value = withRepeat(
          withSequence(
            withTiming(1.35, { duration: 280 }),
            withTiming(0.85, { duration: 250 }),
            withTiming(1, { duration: 250 }),
            withTiming(1, { duration: 1420 })
          ),
          -1,
          false
        );
        scaleY.value = withRepeat(
          withSequence(
            withTiming(0.8, { duration: 280 }),
            withTiming(1.25, { duration: 250 }),
            withTiming(1, { duration: 250 }),
            withTiming(1, { duration: 1420 })
          ),
          -1,
          false
        );
        break;
      }

      case 'book': {
        rotation.value = withRepeat(
          withSequence(
            withTiming(-22, { duration: 400, easing: Easing.inOut(Easing.quad) }),
            withTiming(22, { duration: 450, easing: Easing.inOut(Easing.quad) }),
            withTiming(-10, { duration: 350 }),
            withTiming(10, { duration: 350 }),
            withTiming(0, { duration: 400 }),
            withTiming(0, { duration: 1100 })
          ),
          -1,
          false
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 450 }),
            withTiming(0, { duration: 400 }),
            withTiming(0, { duration: 1200 })
          ),
          -1,
          false
        );
        break;
      }

      case 'zap': {
        translateX.value = withRepeat(
          withSequence(
            withTiming(-6, { duration: 50 }),
            withTiming(6, { duration: 50 }),
            withTiming(-4, { duration: 50 }),
            withTiming(4, { duration: 50 }),
            withTiming(0, { duration: 80 }),
            withTiming(0, { duration: 1600 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.4, { duration: 100 }),
            withTiming(0.85, { duration: 80 }),
            withTiming(1.2, { duration: 100 }),
            withTiming(1, { duration: 120 }),
            withTiming(1, { duration: 1600 })
          ),
          -1,
          false
        );
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.3, { duration: 50 }),
            withTiming(1.0, { duration: 50 }),
            withTiming(0.5, { duration: 50 }),
            withTiming(1.0, { duration: 100 }),
            withTiming(1.0, { duration: 1650 })
          ),
          -1,
          false
        );
        break;
      }

      case 'star': {
        rotation.value = withRepeat(
          withSequence(
            withTiming(45, { duration: 400, easing: Easing.inOut(Easing.back(1.5)) }),
            withTiming(-45, { duration: 450, easing: Easing.inOut(Easing.back(1.5)) }),
            withTiming(0, { duration: 350 }),
            withTiming(0, { duration: 1000 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.4, { duration: 400 }),
            withTiming(0.9, { duration: 350 }),
            withTiming(1.2, { duration: 350 }),
            withTiming(1, { duration: 400 }),
            withTiming(1, { duration: 700 })
          ),
          -1,
          false
        );
        break;
      }

      case 'crown': {
        translateY.value = withRepeat(
          withSequence(
            withTiming(-9, { duration: 900, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          false
        );
        rotation.value = withRepeat(
          withSequence(
            withTiming(-12, { duration: 600, easing: Easing.inOut(Easing.quad) }),
            withTiming(12, { duration: 600, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 600 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.18, { duration: 900 }),
            withTiming(1.0, { duration: 900 })
          ),
          -1,
          false
        );
        break;
      }

      case 'secret': {
        rotation.value = withRepeat(
          withSequence(
            withTiming(-18, { duration: 350 }),
            withTiming(18, { duration: 350 }),
            withTiming(-8, { duration: 250 }),
            withTiming(8, { duration: 250 }),
            withTiming(0, { duration: 300 }),
            withTiming(0, { duration: 1200 })
          ),
          -1,
          false
        );
        translateY.value = withRepeat(
          withSequence(
            withTiming(-5, { duration: 500 }),
            withTiming(0, { duration: 400 }),
            withTiming(0, { duration: 1300 })
          ),
          -1,
          false
        );
        break;
      }

      case 'trophy':
      default: {
        translateY.value = withRepeat(
          withSequence(
            withTiming(-10, { duration: 450, easing: Easing.out(Easing.back(2.5)) }),
            withTiming(2, { duration: 350 }),
            withTiming(0, { duration: 400 }),
            withTiming(0, { duration: 1200 })
          ),
          -1,
          false
        );
        rotation.value = withRepeat(
          withSequence(
            withTiming(-18, { duration: 280 }),
            withTiming(18, { duration: 280 }),
            withTiming(-9, { duration: 220 }),
            withTiming(9, { duration: 220 }),
            withTiming(0, { duration: 300 }),
            withTiming(0, { duration: 1400 })
          ),
          -1,
          false
        );
        scale.value = withRepeat(
          withSequence(
            withTiming(1.3, { duration: 450 }),
            withTiming(0.95, { duration: 350 }),
            withTiming(1, { duration: 400 }),
            withTiming(1, { duration: 1400 })
          ),
          -1,
          false
        );
        break;
      }
    }
  }, [type, rotation, scale, scaleX, scaleY, translateX, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { scaleX: scaleX.value },
      { scaleY: scaleY.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon size={size} color={color} strokeWidth={2.4} />
    </Animated.View>
  );
}

// ─── Category Badge Pill ───────────────────────────────────────────────────────

export function CategoryPill({ category }: { category: AchievementCategory }) {
  const isAward = category === 'partner_award';
  const label = isAward ? 'Partner Award' : 'System Badge';
  const bg = isAward ? 'rgba(236, 72, 153, 0.15)' : 'rgba(232, 77, 114, 0.15)';
  const iconColor = isAward ? '#EC4899' : '#D94C61';

  return (
    <View
      style={{
        backgroundColor: bg,
        borderColor: isAward ? 'rgba(236, 72, 153, 0.30)' : 'rgba(232, 77, 114, 0.30)',
        borderWidth: 1.5,
        borderRadius: radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <ContextualAchievementIcon customIcon={isAward ? Heart : Award} customColor={iconColor} size={12} />
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#2A1D22' }}>{label}</Text>
    </View>
  );
}

// ─── AchievementSummaryCard ────────────────────────────────────────────────────

export interface AchievementSummaryCardProps {
  unlockedCount: number;
  totalBadges: number;
  level: number;
  xp: number;
  latestAchievement: UserAchievementWithDetails | null;
}

export function AchievementSummaryCard({
  unlockedCount,
  totalBadges,
  level,
  xp,
  latestAchievement,
}: AchievementSummaryCardProps) {
  const palette = usePalette();
  const completionPct =
    totalBadges > 0 ? Math.round((unlockedCount / totalBadges) * 100) : 0;

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 16 }}>
          Achievement Progress
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: palette.danger }}>
              {unlockedCount}/{totalBadges}
            </Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>Unlocked</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: '#16a34a' }}>
              {completionPct}%
            </Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>Completion</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: '#FF9F1C' }}>
              Lvl {level}
            </Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>Level</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '800', fontSize: 22, color: '#EC4899' }}>
              {xp}
            </Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>Total XP</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.70)',
            borderRadius: radius.full,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: 'rgba(250, 215, 224, 0.90)',
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${completionPct}%`,
              backgroundColor: palette.cherryBloom,
              borderRadius: radius.full,
            }}
          />
        </View>

        {latestAchievement?.achievements ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              padding: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: 'rgba(250, 215, 224, 0.90)',
            }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(232, 77, 114, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
              <ContextualAchievementIcon code={latestAchievement.achievements.code} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '700' }}>
                Latest Unlock
              </Text>
              <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>
                {latestAchievement.achievements.name}
              </Text>
            </View>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>
              {format(new Date(latestAchievement.unlocked_at), 'dd MMM')}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── AchievementCard ───────────────────────────────────────────────────────────

export interface AchievementCardProps {
  item: UserAchievementWithDetails;
  onPress: () => void;
}

export function AchievementCard({ item, onPress }: AchievementCardProps) {
  const palette = usePalette();
  const ach = item.achievements;
  if (!ach) return null;

  const category = getAchievementCategory(ach.code);
  const xpReward = getAchievementXPReward(ach.code);

  return (
    <Pressable onPress={onPress}>
      <View style={[glassCardStyle, styles.pinkGlassCard, { marginBottom: spacing.xs }]}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: 'rgba(232, 77, 114, 0.14)',
              borderColor: 'rgba(232, 77, 114, 0.30)',
              borderWidth: 1.5,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ContextualAchievementIcon code={ach.code} size={24} />
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 15 }}>
                {ach.name}
              </Text>
              <CategoryPill category={category} />
            </View>

            <Text style={{ color: '#2A1D22', fontSize: 12, lineHeight: 16, fontWeight: '600' }} numberOfLines={2}>
              {ach.description}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 3 }}>
              <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 12 }}>
                +{xpReward} XP
              </Text>
              <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '700' }}>•</Text>
              <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>
                Unlocked {format(new Date(item.unlocked_at), 'dd MMM yyyy')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─── BadgeCard / LockedBadgeCard (Gallery Grid) ────────────────────────────────

export interface BadgeCardProps {
  badge: AchievementRow;
  unlocked: boolean;
  unlockedAt?: string;
  onPress: () => void;
}

export function BadgeCard({ badge, unlocked, unlockedAt, onPress }: BadgeCardProps) {
  const palette = usePalette();
  const category = getAchievementCategory(badge.code);
  const isSecret = badge.code.startsWith('secret_');

  return (
    <Pressable onPress={onPress} style={{ width: '48%', marginBottom: 12 }}>
      <View
        style={{
          backgroundColor: 'rgba(255, 243, 245, 0.85)',
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: unlocked ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
          padding: spacing.sm,
          gap: spacing.xs,
          opacity: unlocked ? 1 : 0.75,
          minHeight: 130,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: unlocked ? 'rgba(232, 77, 114, 0.14)' : 'rgba(0, 0, 0, 0.05)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSecret && !unlocked ? (
              <ContextualAchievementIcon code="secret_badge" customIcon={HelpCircle} customColor="#2A1D22" size={22} />
            ) : (
              <ContextualAchievementIcon code={badge.code} size={22} />
            )}
          </View>
          <CategoryPill category={category} />
        </View>

        <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
          {isSecret && !unlocked ? 'Secret Badge' : badge.name}
        </Text>

        <Text style={{ color: '#2A1D22', fontSize: 12, lineHeight: 16, fontWeight: '600' }} numberOfLines={2}>
          {isSecret && !unlocked ? 'Keep exploring to discover how to unlock.' : badge.description}
        </Text>

        <View style={{ marginTop: 'auto', paddingTop: 4 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              color: unlocked ? '#16a34a' : '#2A1D22',
            }}
          >
            {unlocked ? `Unlocked ${unlockedAt ? format(new Date(unlockedAt), 'dd MMM') : ''}` : 'Locked'}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── AchievementHistoryItem ────────────────────────────────────────────────────

export interface AchievementHistoryItemProps {
  item: UserAchievementWithDetails;
  onPress: () => void;
}

export function AchievementHistoryItem({ item, onPress }: AchievementHistoryItemProps) {
  const palette = usePalette();
  const ach = item.achievements;
  if (!ach) return null;

  const category = getAchievementCategory(ach.code);

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
          borderBottomColor: 'rgba(250, 215, 224, 0.60)',
          borderBottomWidth: 1,
          paddingVertical: spacing.xs,
        }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(232, 77, 114, 0.12)', alignItems: 'center', justifyContent: 'center' }}>
          <ContextualAchievementIcon code={ach.code} size={20} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 14 }}>
              {ach.name}
            </Text>
            <CategoryPill category={category} />
          </View>
          <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '600' }}>{ach.description}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 12 }}>
            +{getAchievementXPReward(ach.code)} XP
          </Text>
          <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>
            {format(new Date(item.unlocked_at), 'dd MMM yyyy')}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// ─── AchievementDetail Modal ───────────────────────────────────────────────────

export interface AchievementDetailModalProps {
  item: UserAchievementWithDetails | (AchievementRow & { unlocked?: boolean; unlockedAt?: string }) | null;
  visible: boolean;
  onClose: () => void;
}

export function AchievementDetailModal({ item, visible, onClose }: AchievementDetailModalProps) {
  const palette = usePalette();
  if (!item) return null;

  const ach: AchievementRow | null =
    'achievements' in item ? item.achievements : (item as AchievementRow);

  if (!ach) return null;

  const unlocked = 'unlocked_at' in item ? true : (item as any).unlocked ?? false;
  const unlockedAt = 'unlocked_at' in item ? item.unlocked_at : (item as any).unlockedAt;

  const category = getAchievementCategory(ach.code);
  const xpReward = getAchievementXPReward(ach.code);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: 'rgba(255, 243, 245, 0.95)',
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: palette.cherryBloom,
            padding: spacing.lg,
            gap: spacing.md,
            alignItems: 'center',
          }}
        >
          {/* Badge Large Icon */}
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(232, 77, 114, 0.14)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: unlocked ? palette.cherryBloom : 'rgba(250, 215, 224, 0.90)',
            }}
          >
            <ContextualAchievementIcon code={ach.code} size={42} />
          </View>

          {/* Badge Title & Category */}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
              {ach.name}
            </Text>
            <CategoryPill category={category} />
          </View>

          {/* Description */}
          <Text style={{ color: '#2A1D22', textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '600' }}>
            {ach.description}
          </Text>

          {/* Metadata Grid */}
          <View
            style={{
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: 'rgba(250, 215, 224, 0.90)',
              padding: spacing.sm,
              gap: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>Status</Text>
              <Text
                style={{
                  fontWeight: '800',
                  fontSize: 12,
                  color: unlocked ? '#16a34a' : '#2A1D22',
                }}
              >
                {unlocked ? 'Unlocked' : 'Locked'}
              </Text>
            </View>

            {unlocked && unlockedAt ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>Unlocked Date</Text>
                <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>
                  {format(new Date(unlockedAt), 'dd MMMM yyyy')}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '800' }}>XP Reward</Text>
              <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 12 }}>
                +{xpReward} XP
              </Text>
            </View>
          </View>

          <Button onPress={onClose} style={{ width: '100%' }}>
            Close
          </Button>
        </View>
      </View>
    </Modal>
  );
}

// ─── PartnerAwardCard ─────────────────────────────────────────────────────────

export interface PartnerAwardCardProps {
  award: any;
  isSent?: boolean;
}

export function PartnerAwardCard({ award, isSent }: PartnerAwardCardProps) {
  const palette = usePalette();

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard, { marginBottom: spacing.xs }]}>
      <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: 'rgba(236, 72, 153, 0.14)',
            borderColor: 'rgba(236, 72, 153, 0.30)',
            borderWidth: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ContextualAchievementIcon customIcon={Heart} customColor="#EC4899" size={24} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 15 }}>
              {award.title}
            </Text>
            <CategoryPill category="partner_award" />
          </View>

          {award.message ? (
            <Text style={{ color: '#2A1D22', fontSize: 13, fontStyle: 'italic', fontWeight: '600', marginTop: 2 }}>
              &quot;{award.message}&quot;
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 4 }}>
            <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 12 }}>
              +{award.xp_bonus || 50} XP Bonus
            </Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '700' }}>•</Text>
            <Text style={{ color: '#2A1D22', fontSize: 11, fontWeight: '800' }}>
              {isSent ? 'Sent' : 'Received'} {format(new Date(award.created_at), 'dd MMM yyyy')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── PartnerAwardSection ───────────────────────────────────────────────────────

export interface PartnerAwardSectionProps {
  hasPartner: boolean;
  awards: any[];
  onOpenCreate: () => void;
}

export function PartnerAwardSection({
  hasPartner,
  awards,
  onOpenCreate,
}: PartnerAwardSectionProps) {
  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 16 }}>
          Partner Awards ({awards.length})
        </Text>
        {hasPartner ? (
          <Button onPress={onOpenCreate} size="sm">
            + Award Partner
          </Button>
        ) : null}
      </View>

      {!hasPartner ? (
        <View style={[glassCardStyle, styles.pinkGlassCard]}>
          <EmptyState
            title="No Partner Connected"
            description="Connect with a study partner to send and receive custom award badges."
          />
        </View>
      ) : awards.length === 0 ? (
        <View style={[glassCardStyle, styles.pinkGlassCard]}>
          <EmptyState
            title="No Partner Awards Received"
            description="Ask your partner to award you for study milestones or send them one first!"
          />
        </View>
      ) : (
        awards.map((a) => <PartnerAwardCard key={a.id} award={a} />)
      )}
    </View>
  );
}

// ─── CreatePartnerAwardModal ───────────────────────────────────────────────────

export interface CreatePartnerAwardModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (data: { title: string; message: string; icon: string; xp_bonus: number }) => Promise<void>;
  isSending?: boolean;
}

export function CreatePartnerAwardModal({
  visible,
  onClose,
  onSend,
  isSending,
}: CreatePartnerAwardModalProps) {
  const palette = usePalette();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = async () => {
    if (!title.trim()) return;
    await onSend({
      title: title.trim(),
      message: message.trim(),
      icon: '💝',
      xp_bonus: 50,
    });
    setTitle('');
    setMessage('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: 'rgba(255, 243, 245, 0.95)',
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: 'rgba(250, 215, 224, 0.90)',
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={{ color: '#2A1D22', fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
            Award Your Partner
          </Text>

          <View style={{ gap: 4 }}>
            <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '700' }}>
              Award Title
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Focus Champ of the Week"
            />
          </View>

          <View style={{ gap: 4 }}>
            <Text style={{ color: '#2A1D22', fontSize: 12, fontWeight: '700' }}>
              Encouraging Note
            </Text>
            <Input
              value={message}
              onChangeText={setMessage}
              placeholder="e.g. Incredible work studying 4 hours today!"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button onPress={onClose} variant="secondary" style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button onPress={handleSend} disabled={isSending || !title.trim()} style={{ flex: 1 }}>
              {isSending ? 'Sending...' : 'Send Award'}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = {
  pinkGlassCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.90)',
    borderRadius: 24,
    padding: spacing.md,
  },
};
