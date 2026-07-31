/**
 * Achievement feature components.
 *
 * Presentational components for achievements, gallery, history, and details.
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { format } from 'date-fns';

import { Card, Loading, EmptyState, Button } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import {
  getAchievementCategory,
  getBadgeIcon,
  getAchievementXPReward,
  type AchievementRow,
  type UserAchievementWithDetails,
  type AchievementCategory,
} from '@/services/achievement.service';

function usePalette() {
  const cs = useColorScheme();
  return colors[cs === 'dark' ? 'dark' : 'light'];
}

// ─── Category Badge Pill ───────────────────────────────────────────────────────

export function CategoryPill({ category }: { category: AchievementCategory }) {
  const palette = usePalette();
  const label =
    category === 'system'
      ? '🏅 System'
      : category === 'milestone'
        ? '🎖️ Milestone'
        : '💝 Partner Award';
  const bg =
    category === 'system'
      ? 'rgba(79, 70, 229, 0.15)'
      : category === 'milestone'
        ? 'rgba(234, 179, 8, 0.15)'
        : 'rgba(236, 72, 153, 0.15)';
  const color =
    category === 'system'
      ? palette.primary
      : category === 'milestone'
        ? '#d97706'
        : '#ec4899';

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: radius.sm,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color }}>{label}</Text>
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
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
          Achievement Progress
        </Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '700', fontSize: 22, color: palette.primary }}>
              {unlockedCount}/{totalBadges}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>Unlocked</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '700', fontSize: 22, color: '#16a34a' }}>
              {completionPct}%
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>Completion</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '700', fontSize: 22, color: '#d97706' }}>
              Lvl {level}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>Level</Text>
          </View>

          <View style={{ alignItems: 'center', minWidth: 70 }}>
            <Text style={{ fontWeight: '700', fontSize: 22, color: '#ec4899' }}>
              {xp}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>Total XP</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            backgroundColor: palette.background,
            borderRadius: radius.full,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${completionPct}%`,
              backgroundColor: palette.primary,
            }}
          />
        </View>

        {latestAchievement?.achievements ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              backgroundColor: palette.background,
              padding: spacing.xs,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ fontSize: 20 }}>
              {getBadgeIcon(latestAchievement.achievements.code)}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.mutedText, fontSize: 10 }}>
                Latest Unlock
              </Text>
              <Text style={{ color: palette.text, fontWeight: '600', fontSize: 12 }}>
                {latestAchievement.achievements.name}
              </Text>
            </View>
            <Text style={{ color: palette.mutedText, fontSize: 11 }}>
              {format(new Date(latestAchievement.unlocked_at), 'dd MMM')}
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
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
  const icon = getBadgeIcon(ach.code);
  const xpReward = getAchievementXPReward(ach.code);

  return (
    <Pressable onPress={onPress}>
      <Card style={{ backgroundColor: palette.surface }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: palette.background,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: palette.border,
            }}
          >
            <Text style={{ fontSize: 24 }}>{icon}</Text>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>
                {ach.name}
              </Text>
              <CategoryPill category={category} />
            </View>

            <Text style={{ color: palette.mutedText, fontSize: 12 }} numberOfLines={2}>
              {ach.description}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 }}>
              <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 11 }}>
                +{xpReward} XP
              </Text>
              <Text style={{ color: palette.mutedText, fontSize: 11 }}>•</Text>
              <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                Unlocked {format(new Date(item.unlocked_at), 'dd MMM yyyy')}
              </Text>
            </View>
          </View>
        </View>
      </Card>
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
  const icon = getBadgeIcon(badge.code);
  const isSecret = badge.code.startsWith('secret_');

  return (
    <Pressable onPress={onPress} style={{ width: '48%' }}>
      <View
        style={{
          backgroundColor: palette.surface,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: unlocked ? palette.primary : palette.border,
          padding: spacing.sm,
          gap: spacing.xs,
          opacity: unlocked ? 1 : 0.6,
          minHeight: 130,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 28, filter: unlocked ? undefined : 'grayscale(100%)' }}>
            {unlocked ? icon : isSecret ? '❓' : icon}
          </Text>
          <CategoryPill category={category} />
        </View>

        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }} numberOfLines={1}>
          {isSecret && !unlocked ? 'Secret Badge' : badge.name}
        </Text>

        <Text style={{ color: palette.mutedText, fontSize: 11 }} numberOfLines={2}>
          {isSecret && !unlocked ? 'Keep exploring to discover how to unlock.' : badge.description}
        </Text>

        <View style={{ marginTop: 'auto', paddingTop: 4 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: unlocked ? '#16a34a' : palette.mutedText,
            }}
          >
            {unlocked ? `Unlocked ${unlockedAt ? format(new Date(unlockedAt), 'dd MMM') : ''}` : '🔒 Locked'}
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
  const icon = getBadgeIcon(ach.code);

  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          alignItems: 'center',
          borderBottomColor: palette.border,
          borderBottomWidth: 1,
          paddingVertical: spacing.xs,
        }}
      >
        <Text style={{ fontSize: 24 }}>{icon}</Text>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
              {ach.name}
            </Text>
            <CategoryPill category={category} />
          </View>
          <Text style={{ color: palette.mutedText, fontSize: 11 }}>{ach.description}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 11 }}>
            +{getAchievementXPReward(ach.code)} XP
          </Text>
          <Text style={{ color: palette.mutedText, fontSize: 10 }}>
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

  // Resolve object shape whether UserAchievementWithDetails or AchievementRow
  const ach: AchievementRow | null =
    'achievements' in item ? item.achievements : (item as AchievementRow);

  if (!ach) return null;

  const unlocked = 'unlocked_at' in item ? true : (item as any).unlocked ?? false;
  const unlockedAt = 'unlocked_at' in item ? item.unlocked_at : (item as any).unlockedAt;

  const category = getAchievementCategory(ach.code);
  const icon = getBadgeIcon(ach.code);
  const xpReward = getAchievementXPReward(ach.code);

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
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.border,
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
              backgroundColor: palette.background,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: unlocked ? palette.primary : palette.border,
            }}
          >
            <Text style={{ fontSize: 44 }}>{icon}</Text>
          </View>

          {/* Badge Title & Category */}
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
              {ach.name}
            </Text>
            <CategoryPill category={category} />
          </View>

          {/* Description */}
          <Text style={{ color: palette.mutedText, textAlign: 'center', fontSize: 13 }}>
            {ach.description}
          </Text>

          {/* Metadata Grid */}
          <View
            style={{
              width: '100%',
              backgroundColor: palette.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              padding: spacing.sm,
              gap: spacing.xs,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.mutedText, fontSize: 12 }}>Status</Text>
              <Text
                style={{
                  fontWeight: '700',
                  fontSize: 12,
                  color: unlocked ? '#16a34a' : palette.mutedText,
                }}
              >
                {unlocked ? 'Unlocked ✅' : 'Locked 🔒'}
              </Text>
            </View>

            {unlocked && unlockedAt ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>Unlocked Date</Text>
                <Text style={{ color: palette.text, fontSize: 12 }}>
                  {format(new Date(unlockedAt), 'dd MMMM yyyy')}
                </Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.mutedText, fontSize: 12 }}>XP Reward</Text>
              <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 12 }}>
                +{xpReward} XP
              </Text>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: palette.mutedText, fontSize: 12 }}>Unlock Rule</Text>
              <Text style={{ color: palette.text, fontSize: 12 }}>
                Evaluated automatically by backend engine
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

// ─── PartnerAwardSection ───────────────────────────────────────────────────────

export interface PartnerAwardSectionProps {
  hasPartner: boolean;
  supportsCustomBadges: boolean;
}

export function PartnerAwardSection({ hasPartner, supportsCustomBadges }: PartnerAwardSectionProps) {
  const palette = usePalette();

  return (
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
          💝 Partner Awards
        </Text>

        {!hasPartner ? (
          <EmptyState
            title="No Partner Connected"
            description="Connect with a study partner in Accountability to exchange appreciation awards."
          />
        ) : !supportsCustomBadges ? (
          <View
            style={{
              backgroundColor: palette.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              padding: spacing.md,
              gap: spacing.xs,
            }}
          >
            <Text style={{ color: palette.text, fontWeight: '600', fontSize: 14 }}>
              Backend Capability Notice
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 12 }}>
              Partner-designed custom badges require the `partner_awards` database table and
              `send_partner_award` RPC on Supabase.
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 12, marginTop: 4 }}>
              Automatic system & milestone achievements are fully active and awarded by the backend.
            </Text>
          </View>
        ) : (
          <EmptyState
            title="No Partner Awards Yet"
            description="Custom partner awards given by your study partner will appear here permanently."
          />
        )}
      </View>
    </Card>
  );
}
