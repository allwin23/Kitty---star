import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

import { HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';
import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';
import * as waterService from '@/services/water.service';
import {
  WaterProgressCard,
  CustomWaterInput,
  GoalCard,
  HistoryList,
  WeeklyProgressCard,
  StatisticsCard,
} from '@/components/water';


export default function WaterTrackerScreen() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();


  // Queries
  const todayStatsQ = useQuery({
    queryKey: ['water-today-stats'],
    queryFn: () => waterService.getTodayStats(),
    enabled: !!user,
  });

  const todayLogsQ = useQuery({
    queryKey: ['water-today-logs'],
    queryFn: () => waterService.getDailyHistory(),
    enabled: !!user,
  });

  const weeklyStatsQ = useQuery({
    queryKey: ['water-weekly-stats'],
    queryFn: () => waterService.getWeeklyStats(),
    enabled: !!user,
  });

  const statsHistoryQ = useQuery({
    queryKey: ['water-stats-history'],
    queryFn: () => waterService.getWeeklyStats(30),
    enabled: !!user,
  });

  // Focus refetches — empty deps array prevents infinite refetch loop
  useFocusEffect(
    useCallback(() => {
      void todayStatsQ.refetch();
      void todayLogsQ.refetch();
      void weeklyStatsQ.refetch();
      void statsHistoryQ.refetch();
    }, [])
  );

  // Mutation for logging water
  const logWaterMutation = useMutation({
    mutationFn: (amount: number) => waterService.logWater({ amount_ml: amount }),
    onSuccess: (_, amount) => {
      // Invalidate queries to refresh UI immediately
      void queryClient.invalidateQueries({ queryKey: ['water-today-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['water-today-logs'] });
      void queryClient.invalidateQueries({ queryKey: ['water-weekly-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['water-stats-history'] });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });
      void queryClient.invalidateQueries({ queryKey: ['user-stats'] });

      // Emit Companion Presentation & Notification Engine events
      CompanionBus.emit({
        eventType: 'WaterBreak',
        priority: 'normal',
        payload: { customText: `Logged ${amount} ml of water! Hydration level up.` },
      });

      if (user?.id) {
        EventBus.emit({
          type: 'WaterReminder',
          userId: user.id,
          targetId: `water-${Date.now()}`,
          data: { amount },
        });
      }
    },
    onError: (err: any) => {
      Alert.alert('Error Logging Water', err?.message || 'Failed to log water intake.');
    },
  });

  const handleLogWater = (amount: number) => {
    logWaterMutation.mutate(amount);
  };

  const isLoading =
    (todayStatsQ.isLoading && !todayStatsQ.data) ||
    (todayLogsQ.isLoading && !todayLogsQ.data);

  if (isLoading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  const todayStats = todayStatsQ.data;
  const todayLogs = todayLogsQ.data ?? [];
  const weeklyStats = weeklyStatsQ.data ?? [];
  const statsHistory = statsHistoryQ.data ?? [];

  const totalMl = todayStats?.total_ml ?? 0;
  const goalMl = todayStats?.goal_ml ?? 2000;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <HeaderTitleCard
            title="Water Tracker"
            showWavingHand={false}
            subtitle="Stay hydrated to maintain peak mental focus and study stamina"
          />

          {/* Progress Card */}
          <WaterProgressCard totalMl={totalMl} goalMl={goalMl} />

          {/* Custom Input */}
          <CustomWaterInput onLog={handleLogWater} />

          {/* Goals Display */}
          <GoalCard goalMl={goalMl} />

          {/* Today's History */}
          <HistoryList logs={todayLogs} />

          {/* Weekly Progress */}
          <WeeklyProgressCard stats={weeklyStats} />

          {/* Stats Summary */}
          <StatisticsCard history={statsHistory} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
    paddingBottom: 120,
  },
  sectionContainer: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 15,
  },
  quickAddGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'space-between',
  },
});
