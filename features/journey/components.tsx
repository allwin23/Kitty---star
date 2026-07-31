/**
 * features/journey/components.tsx
 *
 * Reusable components for the Duolingo-inspired XP Journey feature.
 * Features vertical path timeline, mystery rewards, partner reward editor,
 * challenge cards, reveal animations, and XP breakdown.
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { format, formatDistanceToNow } from 'date-fns';

import { Card, Loading, EmptyState, Button, Input } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';
import type {
  MilestoneWithChallenge,
  JourneyEventRow,
  JourneyRow,
} from '@/services/journey.service';

function usePalette() {
  const cs = useColorScheme();
  return colors[cs === 'dark' ? 'dark' : 'light'];
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
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 2 }}>
            <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
              {isPartnerView ? "Partner's Journey" : 'My XP Journey'}
            </Text>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 22 }}>
              {currentXP} <Text style={{ fontSize: 14, color: palette.primary }}>Lifetime XP</Text>
            </Text>
          </View>
          <View
            style={{
              backgroundColor: 'rgba(79, 70, 229, 0.15)',
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 6,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>
              Level {level}
            </Text>
          </View>
        </View>

        {/* Quick Stat Badges */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          <View
            style={{
              flex: 1,
              backgroundColor: palette.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              padding: spacing.xs,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>✨</Text>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>+{todayXP}</Text>
            <Text style={{ color: palette.mutedText, fontSize: 10 }}>Today</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: palette.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              padding: spacing.xs,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>🎯</Text>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>{nextMilestoneXP}</Text>
            <Text style={{ color: palette.mutedText, fontSize: 10 }}>Next Target</Text>
          </View>

          <View
            style={{
              flex: 1,
              backgroundColor: palette.background,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: palette.border,
              padding: spacing.xs,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 16 }}>⏳</Text>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 14 }}>{remainingXP}</Text>
            <Text style={{ color: palette.mutedText, fontSize: 10 }}>Remaining</Text>
          </View>
        </View>
      </View>
    </Card>
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
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
            Progress to {nextXP} XP Milestone
          </Text>
          <Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>
            {pct}%
          </Text>
        </View>

        <View
          style={{
            height: 10,
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
              width: `${pct}%`,
              backgroundColor: palette.primary,
              borderRadius: radius.full,
            }}
          />
        </View>

        <Text style={{ color: palette.mutedText, fontSize: 11, textAlign: 'right' }}>
          {nextXP - currentXP} XP needed to reach next checkpoint
        </Text>
      </View>
    </Card>
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

  // Node visual theme
  const nodeBg = isClaimed
    ? '#16a34a'
    : isUnlocked
      ? milestone.reward_color || palette.primary
      : isCurrentTarget
        ? palette.surface
        : palette.background;

  const borderColor = isUnlocked
    ? milestone.reward_color || palette.primary
    : isCurrentTarget
      ? palette.primary
      : palette.border;

  return (
    <View style={{ alignItems: 'center', marginVertical: spacing.sm, position: 'relative' }}>
      {/* Target Indicator */}
      {isCurrentTarget ? (
        <View
          style={{
            backgroundColor: palette.primary,
            borderRadius: radius.full,
            paddingHorizontal: 8,
            paddingVertical: 2,
            marginBottom: 4,
          }}
        >
          <Text style={{ color: palette.primaryText, fontSize: 10, fontWeight: '700' }}>
            NEXT CHECKPOINT
          </Text>
        </View>
      ) : null}

      {/* Circle Node Button */}
      <Pressable onPress={onPress}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: nodeBg,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Text style={{ fontSize: 28 }}>
            {isClaimed ? '⭐' : isUnlocked ? milestone.reward_emoji || '🎁' : '🎁'}
          </Text>
        </View>
      </Pressable>

      {/* Label & Status */}
      <View style={{ alignItems: 'center', marginTop: 4, gap: 2 }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 13 }}>
          {milestone.required_xp} XP
        </Text>

        <Text style={{ color: palette.mutedText, fontSize: 11 }}>
          {isClaimed
            ? 'Claimed ⭐'
            : isUnlocked
              ? 'Unlocked 🎉'
              : 'Mystery Reward 🔒'}
        </Text>

        {/* Partner Quick Edit Button */}
        {isPartner && onEdit ? (
          <Pressable
            onPress={onEdit}
            style={{
              marginTop: 2,
              backgroundColor: palette.surface,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: palette.border,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ color: palette.primary, fontSize: 10, fontWeight: '600' }}>
              ✏️ Edit Reward
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
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.sm }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: palette.background,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ fontSize: 32 }}>🎁</Text>
        </View>

        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
          Mystery Reward
        </Text>

        <Text style={{ color: palette.mutedText, textAlign: 'center', fontSize: 12 }}>
          Unlocks automatically at <Text style={{ fontWeight: '700', color: palette.primary }}>{milestone.required_xp} XP</Text>.
          Keep studying to reveal your partner's surprise!
        </Text>

        <View
          style={{
            backgroundColor: palette.background,
            borderRadius: radius.full,
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <Text style={{ color: palette.mutedText, fontSize: 11, fontWeight: '600' }}>
            {remaining} XP remaining
          </Text>
        </View>
      </View>
    </Card>
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
    <Card style={{ backgroundColor: palette.surface, borderColor: milestone.reward_color || palette.primary }}>
      <View style={{ gap: spacing.sm, alignItems: 'center', paddingVertical: spacing.xs }}>
        <Text style={{ fontSize: 48 }}>{milestone.reward_emoji || '🎁'}</Text>

        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
          {milestone.reward_title}
        </Text>

        <Text style={{ color: palette.mutedText, textAlign: 'center', fontSize: 13 }}>
          {milestone.reward_description}
        </Text>

        {milestone.unlocked_at ? (
          <Text style={{ color: palette.mutedText, fontSize: 11 }}>
            Unlocked on {format(new Date(milestone.unlocked_at), 'dd MMM yyyy')}
          </Text>
        ) : null}

        {!milestone.is_claimed && onClaim ? (
          <Button onPress={onClaim} disabled={isClaiming} style={{ width: '100%', marginTop: 4 }}>
            {isClaiming ? 'Claiming...' : 'Claim Reward ⭐'}
          </Button>
        ) : milestone.is_claimed ? (
          <View
            style={{
              backgroundColor: 'rgba(22, 163, 74, 0.15)',
              borderRadius: radius.full,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>
              Claimed on {milestone.claimed_at ? format(new Date(milestone.claimed_at), 'dd MMM') : 'Record'} ⭐
            </Text>
          </View>
        ) : null}
      </View>
    </Card>
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
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: 2,
            borderColor: milestone.reward_color || palette.primary,
            padding: spacing.lg,
            gap: spacing.md,
            alignItems: 'center',
          }}
        >
          {/* Confetti Celebration Banner */}
          <Text style={{ fontSize: 12, fontWeight: '700', color: palette.primary, letterSpacing: 1 }}>
            🎉 MILESTONE REWARD REVEALED! 🎉
          </Text>

          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: milestone.reward_color ? `${milestone.reward_color}25` : 'rgba(79, 70, 229, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: milestone.reward_color || palette.primary,
            }}
          >
            <Text style={{ fontSize: 50 }}>{milestone.reward_emoji || '🎁'}</Text>
          </View>

          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 20, textAlign: 'center' }}>
              {milestone.reward_title}
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 12 }}>
              Unlocked at {milestone.required_xp} XP
            </Text>
          </View>

          <Text style={{ color: palette.mutedText, textAlign: 'center', fontSize: 13 }}>
            "{milestone.reward_description}"
          </Text>

          {/* Action Buttons */}
          <View style={{ width: '100%', gap: spacing.xs, marginTop: spacing.xs }}>
            {!milestone.is_claimed && onClaim ? (
              <Button onPress={onClaim} disabled={isClaiming}>
                {isClaiming ? 'Claiming...' : 'Claim Reward ⭐'}
              </Button>
            ) : null}

            <Button onPress={onClose} style={{ backgroundColor: palette.background }}>
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

const EMOJIS = ['🎁', '🍕', '🎬', '🍦', '🎮', '☕', '📚', '🏖️', '🍿', '💖'];
const COLORS = ['#000000', '#18181B', '#27272A', '#52525B', '#71717A', '#A1A1AA'];

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
  const [emoji, setEmoji] = useState(milestone?.reward_emoji ?? '🎁');
  const [color, setColor] = useState(milestone?.reward_color ?? '#000000');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (milestone) {
      setTitle(milestone.reward_title);
      setDescription(milestone.reward_description);
      setEmoji(milestone.reward_emoji || '🎁');
      setColor(milestone.reward_color || '#000000');
    }
  }, [milestone]);

  if (!milestone) return null;

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a reward title.');
      return;
    }
    setErrorMsg(null);
    try {
      await onSave({
        reward_title: title.trim(),
        reward_description: description.trim(),
        reward_emoji: emoji,
        reward_color: color,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Failed to save milestone reward.');
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
            backgroundColor: palette.surface,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: palette.border,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text style={{ color: palette.text, fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
            ✏️ Edit {milestone.required_xp} XP Surprise Reward
          </Text>

          {/* Emoji Selector */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
              Choose Emoji
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {EMOJIS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: emoji === e ? palette.primary : palette.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: palette.border,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Title Input */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
              Reward Title (Hidden until unlocked)
            </Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend Movie Night 🍿"
            />
          </View>

          {/* Description Input */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
              Description & Secret Partner Note
            </Text>
            <Input
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. You earned it! I'll buy popcorn and snacks!"
            />
          </View>

          {/* Color Selector */}
          <View style={{ gap: 4 }}>
            <Text style={{ color: palette.mutedText, fontSize: 12, fontWeight: '600' }}>
              Badge Color
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
              {COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: c,
                    borderWidth: color === c ? 3 : 1,
                    borderColor: color === c ? palette.text : palette.border,
                  }}
                />
              ))}
            </View>
          </View>

          {errorMsg ? (
            <Text style={{ color: palette.danger, fontSize: 12, textAlign: 'center' }}>
              {errorMsg}
            </Text>
          ) : null}

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button onPress={onClose} style={{ flex: 1, backgroundColor: palette.background }}>
              Cancel
            </Button>
            <Button onPress={handleSave} disabled={isSaving} style={{ flex: 1 }}>
              {isSaving ? 'Saving...' : 'Save Surprise 🎁'}
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
      <Card style={{ backgroundColor: palette.surface }}>
        <EmptyState title="No timeline events" description="Events appear as milestones unlock." />
      </Card>
    );
  }

  return (
    <Card style={{ backgroundColor: palette.surface }}>
      <View style={{ gap: spacing.sm }}>
        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
          📜 Journey Timeline History
        </Text>

        {events.slice(0, 10).map((evt) => {
          const icon =
            evt.event_type === 'milestone_unlocked'
              ? '🎉'
              : evt.event_type === 'reward_claimed'
                ? '⭐'
                : evt.event_type === 'challenge_completed'
                  ? '🏆'
                  : '🗺️';

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
                borderBottomColor: palette.border,
                borderBottomWidth: 1,
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '600', fontSize: 13 }}>
                  {title}
                </Text>
                <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                  {formatDistanceToNow(new Date(evt.created_at), { addSuffix: true })}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
