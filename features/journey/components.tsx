/**
 * features/journey/components.tsx
 *
 * Reusable components for the Duolingo-inspired XP Journey feature.
 * Features vertical path timeline, mystery rewards, partner reward editor,
 * challenge cards, reveal animations, and XP breakdown.
 *
 * Updated with minimal vector icons, contextual color touches, and 3-pattern micro-animations!
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
import { format, formatDistanceToNow } from 'date-fns';
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  Edit3,
  Flame,
  Gem,
  Gift,
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
import type {
  MilestoneWithChallenge,
  JourneyEventRow,
  JourneyRow,
} from '@/services/journey.service';

function usePalette() {
  return palette;
}

// ─── Continuous Animated Vector Icon ─────────────────────────────────────────

export function AnimatedJourneyIcon({
  icon: Icon,
  size = 20,
  color = '#121218',
}: {
  icon: LucideIcon;
  size?: number;
  color?: string;
}) {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Pattern 1: Pendulum Wiggle & Swing
    rotation.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(14, { duration: 450, easing: Easing.inOut(Easing.quad) }),
        withTiming(-8, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(8, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      false
    );

    // Pattern 2: Pulse Scale Breathing
    scale.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(1.22, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.95, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(1.15, { duration: 350, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 500 }),
        withTiming(1, { duration: 1200 })
      ),
      -1,
      false
    );

    // Pattern 3: Floating Vertical Bounce
    translateY.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 700 }),
        withTiming(-5, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withTiming(2, { duration: 300, easing: Easing.inOut(Easing.quad) }),
        withTiming(-3, { duration: 300, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 450 }),
        withTiming(0, { duration: 1350 })
      ),
      -1,
      false
    );
  }, [rotation, scale, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Icon size={size} color={color} strokeWidth={2.4} />
    </Animated.View>
  );
}

// ─── JourneyHeader ─────────────────────────────────────────────────────────────

export interface JourneyHeaderProps {
  currentXP: number;
  level: number;
  todayXP: number;
  nextMilestoneXP: number;
  remainingXP: number;
  isPartnerView?: boolean;
}

export function JourneyHeader({
  currentXP,
  level,
  todayXP,
  nextMilestoneXP,
  remainingXP,
  isPartnerView,
}: JourneyHeaderProps) {
  const palette = usePalette();

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
              {isPartnerView ? "Partner's Journey" : 'My XP Journey'}
            </Text>
            <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 22 }}>
              {currentXP} <Text style={{ fontSize: 14, color: palette.danger }}>Lifetime XP</Text>
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(232, 77, 114, 0.12)',
              borderColor: 'rgba(232, 77, 114, 0.28)',
              borderWidth: 1,
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 13 }}>
              Level {level}
            </Text>
          </View>
        </View>

        {/* Quick Stat Badges with Contextual Colors + Animated Vector Icons */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 243, 245, 0.90)',
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: 'rgba(255, 190, 92, 0.40)',
              padding: spacing.xs,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(255, 190, 92, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatedJourneyIcon icon={Zap} size={16} color="#FF9F1C" />
            </View>
            <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 14 }}>+{todayXP}</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: '500' }}>Today</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 243, 245, 0.90)',
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: 'rgba(96, 165, 250, 0.40)',
              padding: spacing.xs,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(96, 165, 250, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatedJourneyIcon icon={Target} size={16} color="#3B82F6" />
            </View>
            <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 14 }}>{nextMilestoneXP}</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: '500' }}>Next Target</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255, 243, 245, 0.90)',
              borderRadius: radius.md,
              borderWidth: 1.5,
              borderColor: 'rgba(167, 139, 250, 0.40)',
              padding: spacing.xs,
              alignItems: 'center',
              gap: 4,
            }}
          >
            <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: 'rgba(167, 139, 250, 0.15)', alignItems: 'center', justifyContent: 'center' }}>
              <AnimatedJourneyIcon icon={Clock} size={16} color="#8B5CF6" />
            </View>
            <Text style={{ color: palette.textPrimary, fontWeight: '800', fontSize: 14 }}>{remainingXP}</Text>
            <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: '500' }}>Remaining</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── JourneyProgressCard ───────────────────────────────────────────────────────

export interface JourneyProgressCardProps {
  currentXP: number;
  prevXP: number;
  nextXP: number;
}

export function JourneyProgressCard({ currentXP, prevXP, nextXP }: JourneyProgressCardProps) {
  const palette = usePalette();
  const range = nextXP - prevXP;
  const progressInStep = Math.max(0, currentXP - prevXP);
  const pct = range > 0 ? Math.min(100, Math.round((progressInStep / range) * 100)) : 0;

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 14 }}>
            Progress to {nextXP} XP Milestone
          </Text>
          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 13 }}>
            {pct}%
          </Text>
        </View>

        <View
          style={{
            height: 10,
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
              width: `${pct}%`,
              backgroundColor: palette.cherryBloom,
              borderRadius: radius.full,
            }}
          />
        </View>

        <Text style={{ color: palette.textSecondary, fontSize: 11, textAlign: 'right', fontWeight: '500' }}>
          {nextXP - currentXP} XP needed to reach next checkpoint
        </Text>
      </View>
    </View>
  );
}

// ─── JourneyTimeline Node Component ─────────────────────────────────────────────

export interface JourneyNodeProps {
  milestone: MilestoneWithChallenge;
  currentXP: number;
  isPartner: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

export function JourneyNode({
  milestone,
  currentXP,
  isPartner,
  onPress,
  onEdit,
}: JourneyNodeProps) {
  const palette = usePalette();

  const isUnlocked = milestone.is_unlocked;
  const isClaimed = milestone.is_claimed;
  const isCurrentTarget = !isUnlocked && currentXP < milestone.required_xp;

  const NodeIcon: LucideIcon = isClaimed
    ? CheckCircle2
    : isUnlocked
      ? Trophy
      : Gift;

  const iconColor = isClaimed
    ? '#16a34a'
    : isUnlocked
      ? '#D94C61'
      : '#66545B';

  return (
    <View style={{ alignItems: 'center', marginVertical: spacing.sm, position: 'relative' }}>
      {/* Target Indicator */}
      {isCurrentTarget ? (
        <View
          style={{
            backgroundColor: palette.danger,
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
            NEXT CHECKPOINT
          </Text>
        </View>
      ) : null}

      {/* Circle Node Button with Contextual Color Animated Vector Icon */}
      <Pressable onPress={onPress}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: isClaimed
              ? 'rgba(22, 163, 74, 0.15)'
              : isUnlocked
                ? 'rgba(217, 76, 97, 0.15)'
                : 'rgba(255, 255, 255, 0.85)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2.5,
            borderColor: isClaimed
              ? '#16a34a'
              : isUnlocked
                ? palette.danger
                : 'rgba(250, 215, 224, 0.90)',
            shadowColor: palette.danger,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <AnimatedJourneyIcon icon={NodeIcon} size={26} color={iconColor} />
        </View>
      </Pressable>

      {/* Label & Status */}
      <View style={{ alignItems: 'center', marginTop: 6, gap: 2 }}>
        <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 14 }}>
          {milestone.required_xp} XP
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {isClaimed ? (
            <>
              <CheckCircle2 size={12} color="#16a34a" />
              <Text style={{ color: '#16a34a', fontSize: 11, fontWeight: '700' }}>Claimed</Text>
            </>
          ) : isUnlocked ? (
            <>
              <Award size={12} color={palette.danger} />
              <Text style={{ color: palette.danger, fontSize: 11, fontWeight: '700' }}>Unlocked</Text>
            </>
          ) : (
            <>
              <Lock size={12} color={palette.textSecondary} />
              <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: '500' }}>Mystery Reward</Text>
            </>
          )}
        </View>

        {/* Partner Quick Edit Button */}
        {isPartner && onEdit ? (
          <Pressable
            onPress={onEdit}
            style={{
              marginTop: 4,
              backgroundColor: 'rgba(232, 77, 114, 0.10)',
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: 'rgba(232, 77, 114, 0.25)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Edit3 size={11} color={palette.danger} />
            <Text style={{ color: palette.danger, fontSize: 10, fontWeight: '700' }}>
              Edit Reward
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── LockedRewardCard ──────────────────────────────────────────────────────────

export interface LockedRewardCardProps {
  milestone: MilestoneWithChallenge;
  currentXP: number;
}

export function LockedRewardCard({ milestone, currentXP }: LockedRewardCardProps) {
  const palette = usePalette();
  const remaining = Math.max(0, milestone.required_xp - currentXP);

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(232, 77, 114, 0.14)',
            borderColor: 'rgba(232, 77, 114, 0.30)',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatedJourneyIcon icon={Gift} size={24} color={palette.danger} />
        </View>

        <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 16 }}>
          Mystery Reward
        </Text>

        <Text style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12, lineHeight: 16, fontWeight: '500' }}>
          Unlocks automatically at <Text style={{ fontWeight: '800', color: palette.danger }}>{milestone.required_xp} XP</Text>.
          {" Keep studying to reveal your partner's surprise!"}
        </Text>

        <View
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.70)',
            borderRadius: radius.full,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: 'rgba(250, 215, 224, 0.90)',
          }}
        >
          <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: '600' }}>
            {remaining} XP remaining
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── UnlockedRewardCard ────────────────────────────────────────────────────────

export interface UnlockedRewardCardProps {
  milestone: MilestoneWithChallenge;
  onClaim?: () => void;
  isClaiming?: boolean;
}

export function UnlockedRewardCard({ milestone, onClaim, isClaiming }: UnlockedRewardCardProps) {
  const palette = usePalette();

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: 'rgba(232, 77, 114, 0.14)',
            borderColor: 'rgba(232, 77, 114, 0.30)',
            borderWidth: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AnimatedJourneyIcon icon={Trophy} size={28} color={palette.danger} />
        </View>

        <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
          {milestone.reward_title}
        </Text>

        <Text style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
          {milestone.reward_description}
        </Text>

        {milestone.unlocked_at ? (
          <Text style={{ color: palette.textSecondary, fontSize: 11 }}>
            Unlocked on {format(new Date(milestone.unlocked_at), 'dd MMM yyyy')}
          </Text>
        ) : null}

        {!milestone.is_claimed && onClaim ? (
          <Button onPress={onClaim} disabled={isClaiming} style={{ width: '100%', marginTop: 4 }}>
            {isClaiming ? 'Claiming...' : 'Claim Reward'}
          </Button>
        ) : milestone.is_claimed ? (
          <View
            style={{
              backgroundColor: 'rgba(22, 163, 74, 0.15)',
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 4,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCircle2 size={13} color="#16a34a" />
            <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>
              Claimed on {milestone.claimed_at ? format(new Date(milestone.claimed_at), 'dd MMM') : 'Record'}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ─── RewardRevealModal ─────────────────────────────────────────────────────────

export interface RewardRevealModalProps {
  milestone: MilestoneWithChallenge | null;
  visible: boolean;
  onClose: () => void;
  onClaim?: () => void;
  isClaiming?: boolean;
}

export function RewardRevealModal({
  milestone,
  visible,
  onClose,
  onClaim,
  isClaiming,
}: RewardRevealModalProps) {
  const palette = usePalette();
  if (!milestone) return null;

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
          <Text style={{ fontSize: 12, fontWeight: '800', color: palette.danger, letterSpacing: 1 }}>
            MILESTONE REWARD REVEALED
          </Text>

          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: 'rgba(232, 77, 114, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: palette.cherryBloom,
            }}
          >
            <AnimatedJourneyIcon icon={Trophy} size={40} color={palette.danger} />
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 20, textAlign: 'center' }}>
              {milestone.reward_title}
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Unlocked at {milestone.required_xp} XP
            </Text>
          </View>

          <Text style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
            {`"${milestone.reward_description}"`}
          </Text>

          <View style={{ width: '100%', gap: spacing.xs, marginTop: spacing.xs }}>
            {!milestone.is_claimed && onClaim ? (
              <Button onPress={onClaim} disabled={isClaiming}>
                {isClaiming ? 'Claiming...' : 'Claim Reward'}
              </Button>
            ) : null}

            <Button onPress={onClose} variant="secondary">
              Close
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── PartnerRewardEditor Modal ─────────────────────────────────────────────────

export interface PartnerRewardEditorProps {
  milestone: MilestoneWithChallenge | null;
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    reward_title: string;
    reward_description: string;
    reward_emoji: string;
    reward_color: string;
  }) => Promise<void>;
  onAttachChallenge?: (data: {
    deadline: string;
    success_message: string;
    failure_message: string;
  }) => Promise<void>;
  isSaving: boolean;
}

export function PartnerRewardEditor({
  milestone,
  visible,
  onClose,
  onSave,
  isSaving,
}: PartnerRewardEditorProps) {
  const palette = usePalette();
  const [title, setTitle] = useState(milestone?.reward_title ?? '');
  const [description, setDescription] = useState(milestone?.reward_description ?? '');

  if (!milestone) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }
    try {
      await onSave({
        reward_title: title.trim(),
        reward_description: description.trim(),
        reward_emoji: '🎁',
        reward_color: '#C73A57',
      });
      onClose();
    } catch (err) {
      console.warn('Save failed:', err);
    }
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
        <ScrollView
          style={{ width: '100%', maxWidth: 360 }}
          contentContainerStyle={{
            backgroundColor: 'rgba(255, 243, 245, 0.95)',
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: 'rgba(250, 215, 224, 0.90)',
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 18, textAlign: 'center' }}>
            Edit {milestone.required_xp} XP Surprise Reward
          </Text>

          {/* Title Input */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Reward Title (Hidden until unlocked)
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Movie Night"
            />
          </View>

          {/* Description Input */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.textSecondary, fontSize: 12, fontWeight: '600' }}>
              Description & Secret Partner Note
            </Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. You earned it! Snacks on me!"
            />
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button onPress={onClose} variant="secondary" style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button onPress={handleSave} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : 'Save Surprise'}
            </Button>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── JourneyHistoryCard ────────────────────────────────────────────────────────

export interface JourneyHistoryCardProps {
  events: JourneyEventRow[];
}

export function JourneyHistoryCard({ events }: JourneyHistoryCardProps) {
  const palette = usePalette();

  if (events.length === 0) {
    return (
      <View style={[glassCardStyle, styles.pinkGlassCard]}>
        <EmptyState title="No timeline events" description="Events appear as milestones unlock." />
      </View>
    );
  }

  return (
    <View style={[glassCardStyle, styles.pinkGlassCard]}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AnimatedJourneyIcon icon={History} size={18} color={palette.danger} />
          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 15 }}>
            Journey Timeline History
          </Text>
        </View>

        {events.slice(0, 10).map((evt) => {
          const EvtIcon: LucideIcon =
            evt.event_type === 'milestone_unlocked'
              ? Award
              : evt.event_type === 'reward_claimed'
                ? Star
                : evt.event_type === 'challenge_completed'
                  ? Trophy
                  : Compass;

          const iconColor =
            evt.event_type === 'milestone_unlocked'
              ? '#D94C61'
              : evt.event_type === 'reward_claimed'
                ? '#16a34a'
                : evt.event_type === 'challenge_completed'
                  ? '#FF9F1C'
                  : '#3B82F6';

          const title =
            evt.event_type === 'milestone_unlocked'
              ? `Unlocked ${(evt.data as any)?.required_xp || ''} XP Milestone`
              : evt.event_type === 'reward_claimed'
                ? `Claimed ${(evt.data as any)?.reward_title || 'Reward'}`
                : evt.event_type === 'challenge_completed'
                  ? 'Challenge Completed!'
                  : 'Milestones Expanded';

          return (
            <View
              key={evt.id}
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                alignItems: 'center',
                borderBottomColor: 'rgba(250, 215, 224, 0.60)',
                borderBottomWidth: 1,
                paddingVertical: spacing.xs,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  backgroundColor: `${iconColor}18`,
                  borderColor: `${iconColor}30`,
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AnimatedJourneyIcon icon={EvtIcon} size={16} color={iconColor} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.textPrimary, fontWeight: '700', fontSize: 14 }}>
                  {title}
                </Text>
                <Text style={{ color: palette.textSecondary, fontSize: 11, fontWeight: '500' }}>
                  {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
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
