/**
 * XP Journey Screen — Duolingo-inspired Milestone & Surprise Reward Path.
 *
 * Features:
 * - Continuous non-consuming lifetime XP milestone checkpoints (500, 1000, 1500, ...).
 * - Mystery Rewards configured by connected study partner.
 * - Auto-unlocking & Auto-expansion when target XP is reached.
 * - Partner Reward Manager mode.
 * - Real-time synchronization across devices.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, EmptyState, Loading, Screen, Button } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { colors, radius, spacing, typography } from '@/theme';

import { journeyService, type MilestoneWithChallenge } from '@/services/journey.service';
import { reportService } from '@/services/backend';
import * as statsService from '@/services/statistics.service';

import {
  JourneyHeader,
  JourneyProgressCard,
  JourneyNode,
  LockedRewardCard,
  UnlockedRewardCard,
  RewardRevealModal,
  PartnerRewardEditor,
  JourneyHistoryCard,
} from '@/features/journey';

export default function JourneyScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [viewingPartner, setViewingPartner] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneWithChallenge | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneWithChallenge | null>(null);
  const [showRevealModal, setShowRevealModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Partner Resolution ──────────────────────────────────────────────────────

  const partnerIdQ = useQuery({
    queryKey: queryKeys.statsPartnerId,
    queryFn: () => statsService.getPartnerIdForCurrentUser(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const partnerId = profile?.partner_id ?? partnerIdQ.data ?? null;
  const hasPartner = !!partnerId;

  // The user_id whose journey is being displayed or managed
  const targetUserId = useMemo(() => {
    if (viewingPartner && partnerId) return partnerId;
    return user?.id ?? null;
  }, [viewingPartner, partnerId, user?.id]);

  // ── Journey Query ───────────────────────────────────────────────────────────

  const journeyQ = useQuery({
    queryKey: queryKeys.journey(targetUserId ?? ''),
    queryFn: () => journeyService.getOrCreateJourney(targetUserId!),
    enabled: !!targetUserId,
  });

  const journey = journeyQ.data ?? null;
  const journeyId = journey?.id ?? null;

  // ── Milestones & Events Queries ─────────────────────────────────────────────

  const milestonesQ = useQuery({
    queryKey: queryKeys.journeyMilestones(journeyId ?? ''),
    queryFn: () => journeyService.getMilestones(journeyId!),
    enabled: !!journeyId,
  });

  const eventsQ = useQuery({
    queryKey: queryKeys.journeyEvents(journeyId ?? ''),
    queryFn: () => journeyService.getEvents(journeyId!),
    enabled: !!journeyId,
  });

  const userStatsQ = useQuery({
    queryKey: queryKeys.statsUserStats(targetUserId ?? ''),
    queryFn: () => statsService.getUserStats(targetUserId!),
    enabled: !!targetUserId,
  });

  const activityTodayQ = useQuery({
    queryKey: queryKeys.statsDailyActivity(targetUserId ?? '', 'day'),
    queryFn: () => statsService.getDailyActivity(targetUserId!, 'day'),
    enabled: !!targetUserId,
  });

  // ── Realtime Subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!journeyId) return;

    const channel = journeyService.subscribeToJourney(journeyId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.journey(targetUserId!) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.journeyMilestones(journeyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.journeyEvents(journeyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.statsUserStats(targetUserId!) });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [journeyId, targetUserId, queryClient]);

  // ── Derived Data ───────────────────────────────────────────────────────────

  const milestones = milestonesQ.data ?? [];
  const events = eventsQ.data ?? [];
  const userStats = userStatsQ.data;
  const todayActivity = activityTodayQ.data ?? [];

  const currentXP = userStats?.xp ?? 0;
  const level = userStats?.level ?? 1;
  const streak = userStats?.current_streak ?? 0;
  const todayXP = todayActivity.reduce((s, r) => s + r.xp_earned, 0);

  // Find next locked target milestone
  const nextMilestone = useMemo(
    () => milestones.find((m) => !m.is_unlocked && m.required_xp > currentXP),
    [milestones, currentXP],
  );

  const prevMilestone = useMemo(() => {
    const passed = milestones.filter((m) => m.required_xp <= currentXP);
    return passed.length > 0 ? passed[passed.length - 1] : null;
  }, [milestones, currentXP]);

  const nextMilestoneXP = nextMilestone?.required_xp ?? currentXP + 500;
  const prevMilestoneXP = prevMilestone?.required_xp ?? 0;
  const remainingXP = Math.max(0, nextMilestoneXP - currentXP);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleClaimReward = useCallback(
    async (milestoneId: string) => {
      setIsClaiming(true);
      try {
        await journeyService.claimReward(milestoneId);
        void queryClient.invalidateQueries({ queryKey: queryKeys.journeyMilestones(journeyId!) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.journeyEvents(journeyId!) });
        setShowRevealModal(false);
      } finally {
        setIsClaiming(false);
      }
    },
    [journeyId, queryClient],
  );

  const handleSaveMilestoneReward = useCallback(
    async (data: {
      reward_title: string;
      reward_description: string;
      reward_emoji: string;
      reward_color: string;
    }) => {
      if (!editingMilestone) return;
      setIsSaving(true);
      try {
        await journeyService.editMilestone({
          milestone_id: editingMilestone.id,
          ...data,
        });
        void queryClient.invalidateQueries({ queryKey: queryKeys.journeyMilestones(journeyId!) });
        setEditingMilestone(null);
      } finally {
        setIsSaving(false);
      }
    },
    [editingMilestone, journeyId, queryClient],
  );

  const handleExpandCheckpoints = useCallback(async () => {
    if (!journeyId) return;
    await journeyService.expandJourney(journeyId, 5);
    void queryClient.invalidateQueries({ queryKey: queryKeys.journeyMilestones(journeyId) });
  }, [journeyId, queryClient]);

  const isRefreshing = journeyQ.isFetching || milestonesQ.isFetching;

  const handleRefresh = useCallback(() => {
    void journeyQ.refetch();
    void milestonesQ.refetch();
    void eventsQ.refetch();
    void userStatsQ.refetch();
  }, [journeyQ, milestonesQ, eventsQ, userStatsQ]);

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Title Header */}
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.heading, { color: palette.text }]}>
              XP Journey
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
              {viewingPartner
                ? "Managing partner's surprise milestone rewards"
                : 'Continuous lifetime XP progress & surprise partner rewards'}
            </Text>
          </View>

          {/* Mode Toggle Button */}
          {hasPartner ? (
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <Button
                onPress={() => setViewingPartner(false)}
                style={{
                  flex: 1,
                  backgroundColor: !viewingPartner ? palette.primary : palette.surface,
                }}
              >
                <Text
                  style={{
                    color: !viewingPartner ? palette.primaryText : palette.text,
                    fontWeight: '600',
                  }}
                >
                  My Journey Path
                </Text>
              </Button>
              <Button
                onPress={() => setViewingPartner(true)}
                style={{
                  flex: 1,
                  backgroundColor: viewingPartner ? palette.primary : palette.surface,
                }}
              >
                <Text
                  style={{
                    color: viewingPartner ? palette.primaryText : palette.text,
                    fontWeight: '600',
                  }}
                >
                  Manage Partner's Rewards ✏️
                </Text>
              </Button>
            </View>
          ) : null}

          {journeyQ.isLoading ? (
            <Loading />
          ) : !journey ? (
            <EmptyState
              title="Journey Not Initialized"
              description="Start studying to initialize your lifetime XP Journey path."
            />
          ) : (
            <>
              {/* Journey Header Card */}
              <JourneyHeader
                currentXP={currentXP}
                level={level}
                todayXP={todayXP}
                nextMilestoneXP={nextMilestoneXP}
                remainingXP={remainingXP}
                isPartnerView={viewingPartner}
              />

              {/* Progress Card */}
              <JourneyProgressCard
                currentXP={currentXP}
                prevXP={prevMilestoneXP}
                nextXP={nextMilestoneXP}
              />

              {/* Duolingo-style Vertical Timeline Path */}
              <Card style={{ backgroundColor: palette.surface }}>
                <View style={{ gap: spacing.md, alignItems: 'center' }}>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
                    🗺️ Milestone Checkpoints Path
                  </Text>

                  {viewingPartner ? (
                    <Text
                      style={{ color: palette.mutedText, fontSize: 12, textAlign: 'center' }}
                    >
                      Tap "✏️ Edit Reward" on any node below to customize your partner's secret
                      surprise for that milestone!
                    </Text>
                  ) : null}

                  {milestonesQ.isLoading ? (
                    <Loading />
                  ) : milestones.length === 0 ? (
                    <EmptyState
                      title="No Checkpoints Found"
                      description="Milestone checkpoints will generate automatically."
                    />
                  ) : (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                      {milestones.map((m, idx) => (
                        <View key={m.id} style={{ alignItems: 'center', width: '100%' }}>
                          {/* Connector Line */}
                          {idx > 0 ? (
                            <View
                              style={{
                                width: 4,
                                height: 28,
                                backgroundColor: m.is_unlocked ? palette.primary : palette.border,
                              }}
                            />
                          ) : null}

                          <JourneyNode
                            milestone={m}
                            currentXP={currentXP}
                            isPartner={viewingPartner}
                            onPress={() => {
                              setSelectedMilestone(m);
                              if (m.is_unlocked) {
                                setShowRevealModal(true);
                              }
                            }}
                            onEdit={() => setEditingMilestone(m)}
                          />
                        </View>
                      ))}
                    </View>
                  )}

                  {viewingPartner ? (
                    <Button onPress={handleExpandCheckpoints} style={{ marginTop: spacing.sm }}>
                      + Add 5 More Checkpoints
                    </Button>
                  ) : null}
                </View>
              </Card>

              {/* Selected Milestone Detail Preview */}
              {selectedMilestone ? (
                selectedMilestone.is_unlocked ? (
                  <UnlockedRewardCard
                    milestone={selectedMilestone}
                    onClaim={() => handleClaimReward(selectedMilestone.id)}
                    isClaiming={isClaiming}
                  />
                ) : (
                  <LockedRewardCard milestone={selectedMilestone} currentXP={currentXP} />
                )
              ) : null}

              {/* Timeline Events History */}
              <JourneyHistoryCard events={events} />
            </>
          )}
        </View>
      </ScrollView>

      {/* Reward Reveal Celebration Modal */}
      <RewardRevealModal
        visible={showRevealModal}
        milestone={selectedMilestone}
        onClose={() => setShowRevealModal(false)}
        onClaim={
          selectedMilestone && !selectedMilestone.is_claimed
            ? () => handleClaimReward(selectedMilestone.id)
            : undefined
        }
        isClaiming={isClaiming}
      />

      {/* Partner Reward Editor Modal */}
      <PartnerRewardEditor
        visible={!!editingMilestone}
        milestone={editingMilestone}
        onClose={() => setEditingMilestone(null)}
        onSave={handleSaveMilestoneReward}
        isSaving={isSaving}
      />
    </Screen>
  );
}
