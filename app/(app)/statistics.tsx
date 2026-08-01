/**
 * Statistics Screen — production statistics dashboard.
 *
 * Shows all study statistics across every module.
 * Supports a time filter (day / week / month / all time) and a
 * partner toggle to view the connected partner's statistics using
 * the same components.
 *
 * All data is loaded from the backend via TanStack Query.
 * No frontend calculations duplicate backend logic.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { HeaderTitleCard, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';
import * as statsService from '@/services/statistics.service';
import { grammarService } from '@/services';
import {
  PartnerToggle,
  TimeFilterBar,
  OverviewSection,
  AccountabilitySection,
  PomodoroSection,
  PYQSection,
  FlashcardSection,
  VocabularySection,
  GrammarSection,
  WaterSection,
  DailyActivitySection,
  RecentReportsSection,
  AchievementsSection,
} from '@/features/statistics';
import {
  deriveAccountabilityStats,
  type TimeFilter,
} from '@/services/statistics.service';

export default function StatisticsScreen() {
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [viewingPartner, setViewingPartner] = useState(false);


  // Fetch partner_id for current user (or fallback to auth store profile)
  const partnerIdQ = useQuery({
    queryKey: queryKeys.statsPartnerId,
    queryFn: () => statsService.getPartnerIdForCurrentUser(),
    enabled: !!user,
    staleTime: 10_000,
  });
  const partnerId = profile?.partner_id ?? partnerIdQ.data ?? null;
  const hasPartner = !!partnerId;

  // The user_id whose statistics we display
  const targetUserId = useMemo(() => {
    if (viewingPartner && partnerId) return partnerId;
    return user?.id ?? null;
  }, [viewingPartner, partnerId, user?.id]);

  // Realtime subscription for ultimate live sync (for own user AND partner!)
  useEffect(() => {
    if (!targetUserId) return;

    const channel = statsService.subscribeToStatistics(targetUserId, () => {
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [targetUserId, queryClient]);

  const queryOptions = {
    enabled: !!targetUserId,
    staleTime: 0,
    refetchInterval: 3000, // 3-second live sync interval for ultimate smoothness
  };

  // ── Query: User Stats (overview) ────────────────────────────────────────────

  const userStatsQ = useQuery({
    queryKey: queryKeys.statsUserStats(targetUserId ?? ''),
    queryFn: () => statsService.getUserStats(targetUserId ?? undefined),
    ...queryOptions,
  });

  // ── Query: Achievements ────────────────────────────────────────────────────

  const achievementsQ = useQuery({
    queryKey: queryKeys.statsAchievements(targetUserId ?? ''),
    queryFn: () => statsService.getAchievements(targetUserId ?? undefined),
    ...queryOptions,
  });

  // ── Query: Daily Activity ──────────────────────────────────────────────────

  const activityQ = useQuery({
    queryKey: queryKeys.statsDailyActivity(targetUserId ?? '', timeFilter),
    queryFn: () => statsService.getDailyActivity(targetUserId!, timeFilter),
    ...queryOptions,
  });

  // ── Query: Reports ────────────────────────────────────────────────────────

  const reportsQ = useQuery({
    queryKey: queryKeys.statsReports(targetUserId ?? '', timeFilter),
    queryFn: () => statsService.getReports(targetUserId!, timeFilter),
    ...queryOptions,
  });

  // ── Query: PYQ Stats ──────────────────────────────────────────────────────

  const pyqStatsQ = useQuery({
    queryKey: queryKeys.statsPYQ(targetUserId ?? ''),
    queryFn: () => statsService.getPYQStats(targetUserId!),
    ...queryOptions,
  });

  // ── Query: Vocabulary Stats ────────────────────────────────────────────────

  const vocabStatsQ = useQuery({
    queryKey: queryKeys.statsVocabulary(targetUserId ?? ''),
    queryFn: () => statsService.getVocabularyStats(targetUserId!),
    ...queryOptions,
  });

  // ── Query: Grammar Stats ──────────────────────────────────────────────────

  const grammarStatsQ = useQuery({
    queryKey: queryKeys.statsGrammar(targetUserId ?? ''),
    queryFn: () => statsService.getGrammarStats(targetUserId!),
    ...queryOptions,
  });

  // Grammar topic breakdown
  const grammarTopicsQ = useQuery({
    queryKey: ['stats', 'grammar-topics', targetUserId ?? ''],
    queryFn: async () => {
      if (!targetUserId) return [];
      const attempts = await statsService.getGrammarAttempts(targetUserId, 'all');
      const counts: Record<string, number> = {};
      for (const row of attempts) {
        counts[row.topic] = (counts[row.topic] ?? 0) + 1;
      }
      return Object.entries(counts).map(([topic, attempts]) => ({ topic, attempts }));
    },
    ...queryOptions,
  });

  // ── Query: Water Stats ─────────────────────────────────────────────────────

  const waterQ = useQuery({
    queryKey: queryKeys.statsWater(targetUserId ?? '', timeFilter),
    queryFn: () => statsService.getWaterStats(targetUserId!, timeFilter),
    ...queryOptions,
  });

  // ── Query: Flashcard schedule stats ───────────────────────────────────────

  const flashcardScheduleQ = useQuery({
    queryKey: queryKeys.statsFlashcardSchedule(targetUserId ?? ''),
    queryFn: () => statsService.getFlashcardScheduleStats(targetUserId!),
    ...queryOptions,
  });

  // ── Query: Flashcard reviews ───────────────────────────────────────────────

  const flashcardReviewsQ = useQuery({
    queryKey: queryKeys.statsFlashcardReviews(targetUserId ?? '', timeFilter),
    queryFn: () => statsService.getFlashcardReviews(targetUserId!, timeFilter),
    ...queryOptions,
  });

  // ── Query: Pomodoro sessions ───────────────────────────────────────────────

  const pomodoroSessionsQ = useQuery({
    queryKey: ['stats', 'pomodoro-sessions', targetUserId ?? '', timeFilter],
    queryFn: () => statsService.getPomodoroStats(targetUserId!, timeFilter),
    ...queryOptions,
  });

  // ── Derived values (no recalculation — uses backend rows only) ─────────────

  const activityRows = activityQ.data ?? [];
  const reportsRows = reportsQ.data ?? [];

  const accountabilityStats = useMemo(
    () => deriveAccountabilityStats(reportsRows),
    [reportsRows],
  );

  // ── Refresh all queries ────────────────────────────────────────────────────

  const isAnyRefreshing = [
    userStatsQ,
    achievementsQ,
    activityQ,
    reportsQ,
    pomodoroSessionsQ,
    pyqStatsQ,
    vocabStatsQ,
    grammarStatsQ,
    waterQ,
    flashcardScheduleQ,
    flashcardReviewsQ,
  ].some((q) => q.isFetching);

  const handleRefresh = useCallback(() => {
    if (!targetUserId) return;
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
  }, [queryClient, targetUserId]);

  const handleTimeFilterChange = useCallback((f: TimeFilter) => {
    setTimeFilter(f);
  }, []);

  const handleTogglePartner = useCallback((partner: boolean) => {
    setViewingPartner(partner);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const partnerName = viewingPartner
    ? 'Partner'
    : profile?.full_name?.split(' ')[0] ?? 'My';

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isAnyRefreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={{ gap: spacing[24], paddingBottom: 120 }}>
          {/* Header */}
          <HeaderTitleCard
            title="Statistics"
            showWavingHand={false}
            subtitle={viewingPartner ? "Viewing partner's statistics" : 'Your overall study progress & growth'}
          />


          {/* Partner Toggle */}
          <PartnerToggle
            viewingPartner={viewingPartner}
            hasPartner={hasPartner}
            onToggle={handleTogglePartner}
          />

          {/* Partner no-partner warning */}
          {viewingPartner && !hasPartner ? (
            <View
              style={{
                backgroundColor: palette.surface,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: palette.border,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: palette.mutedText, textAlign: 'center', fontSize: 13 }}>
                {"You don't have a connected study partner yet. Connect with a partner to view their statistics."}
              </Text>
            </View>
          ) : null}

          {/* Time Filter — always visible */}
          <TimeFilterBar value={timeFilter} onChange={handleTimeFilterChange} />

          {targetUserId ? (
            <>
              {/* Section 1: Overview */}
              <OverviewSection
                userStats={userStatsQ.data ?? null}
                achievements={achievementsQ.data ?? []}
                activityRows={activityRows}
                isLoading={userStatsQ.isLoading}
                error={
                  userStatsQ.error ? (userStatsQ.error as Error).message : null
                }
                onRetry={() => void userStatsQ.refetch()}
              />

              {/* Section 2: Accountability */}
              <AccountabilitySection
                stats={reportsRows.length > 0 ? accountabilityStats : null}
                isLoading={reportsQ.isLoading}
                error={reportsQ.error ? (reportsQ.error as Error).message : null}
                onRetry={() => void reportsQ.refetch()}
              />

              {/* Section 3: Pomodoro */}
              <PomodoroSection
                stats={pomodoroSessionsQ.data ?? null}
                isLoading={pomodoroSessionsQ.isLoading}
                error={pomodoroSessionsQ.error ? (pomodoroSessionsQ.error as Error).message : null}
                onRetry={() => void pomodoroSessionsQ.refetch()}
              />

              {/* Section 4: PYQ */}
              <PYQSection
                stats={pyqStatsQ.data ?? null}
                isLoading={pyqStatsQ.isLoading}
                error={pyqStatsQ.error ? (pyqStatsQ.error as Error).message : null}
                onRetry={() => void pyqStatsQ.refetch()}
              />

              {/* Section 5: Flashcards */}
              <FlashcardSection
                scheduleStats={flashcardScheduleQ.data ?? null}
                reviewsCount={flashcardReviewsQ.data?.length ?? 0}
                userStats={userStatsQ.data ?? null}
                isLoading={flashcardScheduleQ.isLoading || flashcardReviewsQ.isLoading}
                error={
                  flashcardScheduleQ.error
                    ? (flashcardScheduleQ.error as Error).message
                    : flashcardReviewsQ.error
                      ? (flashcardReviewsQ.error as Error).message
                      : null
                }
                onRetry={() => {
                  void flashcardScheduleQ.refetch();
                  void flashcardReviewsQ.refetch();
                }}
              />

              {/* Section 6: Vocabulary */}
              <VocabularySection
                stats={vocabStatsQ.data ?? null}
                activityRows={activityRows}
                isLoading={vocabStatsQ.isLoading}
                error={vocabStatsQ.error ? (vocabStatsQ.error as Error).message : null}
                onRetry={() => void vocabStatsQ.refetch()}
              />

              {/* Section 7: Grammar */}
              <GrammarSection
                stats={grammarStatsQ.data ?? null}
                topicBreakdown={grammarTopicsQ.data ?? []}
                isLoading={grammarStatsQ.isLoading}
                error={grammarStatsQ.error ? (grammarStatsQ.error as Error).message : null}
                onRetry={() => void grammarStatsQ.refetch()}
              />

              {/* Section 8: Water */}
              <WaterSection
                waterRows={waterQ.data ?? []}
                isLoading={waterQ.isLoading}
                error={waterQ.error ? (waterQ.error as Error).message : null}
                onRetry={() => void waterQ.refetch()}
              />

              {/* Section 9: Daily Activity */}
              <DailyActivitySection
                activityRows={activityRows}
                isLoading={activityQ.isLoading}
                error={activityQ.error ? (activityQ.error as Error).message : null}
                onRetry={() => void activityQ.refetch()}
              />

              {/* Section 10: Recent Reports */}
              <RecentReportsSection
                reports={reportsRows}
                isLoading={reportsQ.isLoading}
                error={reportsQ.error ? (reportsQ.error as Error).message : null}
                onRetry={() => void reportsQ.refetch()}
              />

              {/* Achievements */}
              <AchievementsSection
                achievements={achievementsQ.data ?? []}
                isLoading={achievementsQ.isLoading}
                error={achievementsQ.error ? (achievementsQ.error as Error).message : null}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
