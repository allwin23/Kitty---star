/**
 * Achievements Screen — Production Achievement Module.
 *
 * Central recognition system displaying:
 * - My Achievements (System Badges, Milestones, Partner Awards)
 * - Partner Achievements
 * - Badge Gallery (Unlocked, Locked, Secret)
 * - Achievement History Timeline
 *
 * Reuses existing Supabase backend services, RPCs, and TanStack Query.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores';
import { palette, radius, spacing } from '@/theme';

import {
  achievementService,
  getAchievementCategory,
  type AchievementRow,
  type UserAchievementWithDetails,
} from '@/services/achievement.service';
import { notificationService, reportService } from '@/services/backend';
import * as statsService from '@/services/statistics.service';

import {
  AchievementSummaryCard,
  AchievementCard,
  BadgeCard,
  AchievementHistoryItem,
  AchievementDetailModal,
  PartnerAwardSection,
  PartnerAwardCard,
  CreatePartnerAwardModal,
} from '@/features/achievements';

type TopTab = 'my_achievements' | 'partner_achievements' | 'gallery' | 'history';
type GalleryFilter = 'all' | 'unlocked' | 'locked';

export default function AchievementsScreen() {
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);


  const [activeTab, setActiveTab] = useState<TopTab>('my_achievements');
  const [galleryFilter, setGalleryFilter] = useState<GalleryFilter>('all');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [isSendingAward, setIsSendingAward] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<
    UserAchievementWithDetails | (AchievementRow & { unlocked?: boolean; unlockedAt?: string }) | null
  >(null);

  // ── Partner resolution ──────────────────────────────────────────────────────

  const partnerIdQ = useQuery({
    queryKey: queryKeys.statsPartnerId,
    queryFn: () => statsService.getPartnerIdForCurrentUser(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const partnerId = profile?.partner_id ?? partnerIdQ.data ?? null;
  const hasPartner = !!partnerId;

  // ── Queries: My Data ────────────────────────────────────────────────────────

  const allBadgesQ = useQuery({
    queryKey: ['achievements', 'all'],
    queryFn: () => achievementService.getAllAchievements(),
  });

  const myUnlockedQ = useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => achievementService.getUserAchievements(),
    enabled: !!user,
  });

  const userStatsQ = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => reportService.stats(),
    enabled: !!user,
  });

  const myReceivedAwardsQ = useQuery({
    queryKey: ['partner-awards', 'received', user?.id],
    queryFn: () => achievementService.getReceivedPartnerAwards(user!.id),
    enabled: !!user,
  });

  // ── Queries: Partner Data ──────────────────────────────────────────────────

  const partnerUnlockedQ = useQuery({
    queryKey: ['achievements', 'partner', partnerId ?? ''],
    queryFn: () => achievementService.getUserAchievements(partnerId!),
    enabled: activeTab === 'partner_achievements' && !!partnerId,
  });

  const partnerStatsQ = useQuery({
    queryKey: queryKeys.statsUserStats(partnerId ?? ''),
    queryFn: () => statsService.getUserStats(partnerId!),
    enabled: activeTab === 'partner_achievements' && !!partnerId,
  });

  const partnerReceivedAwardsQ = useQuery({
    queryKey: ['partner-awards', 'received', partnerId ?? ''],
    queryFn: () => achievementService.getReceivedPartnerAwards(partnerId!),
    enabled: (activeTab === 'partner_achievements' || activeTab === 'my_achievements') && !!partnerId,
  });

  // ── Realtime Subscription ──────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    const channel = notificationService.subscribe((n) => {
      if (n.type === 'achievement_unlocked') {
        void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
        void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
        void queryClient.invalidateQueries({ queryKey: ['partner-awards'] });
      }
    });

    const awardsChannel = supabase
      .channel(`partner-awards-sync:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partner_awards' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['partner-awards'] });
          void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(awardsChannel);
    };
  }, [user, queryClient]);

  const handleSendAward = async (data: { title: string; message: string; icon: string; xp_bonus: number }) => {
    if (!partnerId) return;
    setIsSendingAward(true);
    try {
      await achievementService.sendPartnerAward({
        recipient_id: partnerId,
        title: data.title,
        message: data.message,
        icon: data.icon,
        xp_bonus: data.xp_bonus,
      });
      void queryClient.invalidateQueries({ queryKey: ['partner-awards'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    } finally {
      setIsSendingAward(false);
    }
  };

  // ── Derived Data ───────────────────────────────────────────────────────────

  const allBadges = allBadgesQ.data ?? [];
  const myUnlocked = (myUnlockedQ.data ?? []) as UserAchievementWithDetails[];
  const userStats = userStatsQ.data as { level: number; xp: number } | null;
  const myReceivedAwards = myReceivedAwardsQ.data ?? [];
  const partnerReceivedAwards = partnerReceivedAwardsQ.data ?? [];

  const unlockedBadgeIds = useMemo(
    () => new Set(myUnlocked.map((u) => u.achievement_id)),
    [myUnlocked],
  );

  const partnerUnlocked = (partnerUnlockedQ.data ?? []) as UserAchievementWithDetails[];
  const partnerStats = partnerStatsQ.data;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const isRefreshing =
    myUnlockedQ.isFetching || userStatsQ.isFetching || allBadgesQ.isFetching;

  const handleRefresh = useCallback(() => {
    void myUnlockedQ.refetch();
    void userStatsQ.refetch();
    void allBadgesQ.refetch();
    void myReceivedAwardsQ.refetch();
    if (partnerId) {
      void partnerUnlockedQ.refetch();
      void partnerStatsQ.refetch();
      void partnerReceivedAwardsQ.refetch();
    }
  }, [myUnlockedQ, userStatsQ, allBadgesQ, myReceivedAwardsQ, partnerId, partnerUnlockedQ, partnerStatsQ, partnerReceivedAwardsQ]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ gap: spacing[24], paddingBottom: spacing[48] }}>
          {/* Header */}
          <View style={{ gap: spacing[4] }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: palette.textPrimary, letterSpacing: -0.3 }}>
              Achievements 🏆
            </Text>
            <Text style={{ color: palette.textSecondary, fontSize: 13 }}>
              Your central recognition & companion milestone hub
            </Text>
          </View>


          {/* Top Summary Card */}
          <AchievementSummaryCard
            unlockedCount={myUnlocked.length}
            totalBadges={allBadges.length}
            level={userStats?.level ?? 1}
            xp={userStats?.xp ?? 0}
            latestAchievement={myUnlocked.length > 0 ? myUnlocked[0] : null}
          />

          {/* Navigation Tabs */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[
              { id: 'my_achievements', label: 'Mine' },
              { id: 'partner_achievements', label: 'Partner' },
              { id: 'gallery', label: 'Gallery' },
              { id: 'history', label: 'History' },
            ].map((t) => {
              const active = activeTab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setActiveTab(t.id as TopTab)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: radius.md,
                    alignItems: 'center',
                    backgroundColor: active ? palette.primary : palette.surface,
                    borderWidth: 1,
                    borderColor: active ? palette.primary : palette.border,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: active ? '700' : '500',
                      color: active ? palette.primaryText : palette.mutedText,
                    }}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ────────────────── TABS CONTENT ────────────────── */}

          {/* TAB 1: MY ACHIEVEMENTS */}
          {activeTab === 'my_achievements' ? (
            <View style={{ gap: spacing.lg }}>
              {/* System Achievements */}
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                  🏅 Unlocked Badges ({myUnlocked.length})
                </Text>
                {myUnlockedQ.isLoading ? (
                  <Loading />
                ) : myUnlocked.length === 0 ? (
                  <EmptyState
                    title="No system achievements yet"
                    description="Complete daily plans and pomodoro sessions to unlock badges."
                  />
                ) : (
                  myUnlocked.map((item) => (
                    <AchievementCard
                      key={item.id}
                      item={item}
                      onPress={() => setSelectedDetail(item)}
                    />
                  ))
                )}
              </View>

              {/* Partner Awards Section (Received Awards) */}
              <PartnerAwardSection
                hasPartner={hasPartner}
                awards={myReceivedAwards}
                onOpenCreate={() => setShowAwardModal(true)}
              />
            </View>
          ) : null}

          {/* TAB 2: PARTNER ACHIEVEMENTS */}
          {activeTab === 'partner_achievements' ? (
            <View style={{ gap: spacing.md }}>
              {!hasPartner ? (
                <EmptyState
                  title="No Partner Connected"
                  description="Connect with a study partner in Accountability to view their achievements."
                />
              ) : partnerUnlockedQ.isLoading ? (
                <Loading />
              ) : (
                <>
                  <Card>
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                        Partner Summary
                      </Text>
                      <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                        Level {partnerStats?.level ?? 1} · {partnerStats?.xp ?? 0} XP · {partnerUnlocked.length} Unlocked Badges
                      </Text>
                    </View>
                  </Card>

                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                    🏅 Partner Badges ({partnerUnlocked.length})
                  </Text>
                  {partnerUnlocked.length === 0 ? (
                    <EmptyState
                      title="No partner achievements"
                      description="Your partner hasn't unlocked any badges yet."
                    />
                  ) : (
                    partnerUnlocked.map((item) => (
                      <AchievementCard
                        key={item.id}
                        item={item}
                        onPress={() => setSelectedDetail(item)}
                      />
                    ))
                  )}

                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                    💝 Awards Given to Partner ({partnerReceivedAwards.length})
                  </Text>
                  {partnerReceivedAwards.length === 0 ? (
                    <EmptyState
                      title="No Partner Awards Given Yet"
                      description="Tap '+ Award Partner' in My Achievements to gift your partner an award badge!"
                    />
                  ) : (
                    partnerReceivedAwards.map((award) => (
                      <PartnerAwardCard key={award.id} award={award} isSent />
                    ))
                  )}
                </>
              )}
            </View>
          ) : null}

          {/* TAB 3: BADGE GALLERY */}
          {activeTab === 'gallery' ? (
            <View style={{ gap: spacing.md }}>
              {/* Filter Pills */}
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                {[
                  { id: 'all', label: `All (${allBadges.length})` },
                  { id: 'unlocked', label: `Unlocked (${myUnlocked.length})` },
                  { id: 'locked', label: `Locked (${allBadges.length - myUnlocked.length})` },
                ].map((f) => {
                  const active = galleryFilter === f.id;
                  return (
                    <Pressable
                      key={f.id}
                      onPress={() => setGalleryFilter(f.id as GalleryFilter)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: radius.full,
                        backgroundColor: active ? palette.primary : palette.surface,
                        borderWidth: 1,
                        borderColor: active ? palette.primary : palette.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '600',
                          color: active ? palette.primaryText : palette.mutedText,
                        }}
                      >
                        {f.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {allBadgesQ.isLoading ? (
                <Loading />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '4%' }}>
                  {allBadges
                    .filter((badge) => {
                      const isUnlocked = unlockedBadgeIds.has(badge.id);
                      if (galleryFilter === 'unlocked') return isUnlocked;
                      if (galleryFilter === 'locked') return !isUnlocked;
                      return true;
                    })
                    .map((badge) => {
                      const isUnlocked = unlockedBadgeIds.has(badge.id);
                      const unlockedItem = myUnlocked.find((u) => u.achievement_id === badge.id);
                      return (
                        <BadgeCard
                          key={badge.id}
                          badge={badge}
                          unlocked={isUnlocked}
                          unlockedAt={unlockedItem?.unlocked_at}
                          onPress={() =>
                            setSelectedDetail(
                              unlockedItem ?? { ...badge, unlocked: false },
                            )
                          }
                        />
                      );
                    })}
                </View>
              )}
            </View>
          ) : null}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                  Achievement Timeline
                </Text>

                {myUnlockedQ.isLoading ? (
                  <Loading />
                ) : myUnlocked.length === 0 ? (
                  <EmptyState
                    title="No unlocks recorded"
                    description="Your achievement timeline will populate as you complete study goals."
                  />
                ) : (
                  myUnlocked.map((item) => (
                    <AchievementHistoryItem
                      key={item.id}
                      item={item}
                      onPress={() => setSelectedDetail(item)}
                    />
                  ))
                )}
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>

      {/* Achievement Detail Modal */}
      <AchievementDetailModal
        visible={!!selectedDetail}
        item={selectedDetail}
        onClose={() => setSelectedDetail(null)}
      />

      {/* Create Partner Award Modal */}
      <CreatePartnerAwardModal
        visible={showAwardModal}
        onClose={() => setShowAwardModal(false)}
        onSend={handleSendAward}
        isSending={isSendingAward}
      />
    </Screen>
  );
}
