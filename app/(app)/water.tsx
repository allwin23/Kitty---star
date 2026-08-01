import { useCallback } from 'react';
import { Alert, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';

import { Loading, Screen } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';
import { waterService } from '@/services/backend';
import { CompanionBus } from '@/features/companion/event-bus';
import { EventBus } from '@/features/notifications/event-bus';

// Import our modular water tracker components
import {
  CustomWaterInput,
  GoalCard,
  HistoryList,
  QuickAddButton,
  StatisticsCard,
  WaterProgressCard,
  WeeklyProgressCard,
} from '@/components/water';

export default function WaterTrackerScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
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
    queryFn: () => waterService.getTodayLogs(),
    enabled: !!user,
  });

  const weeklyStatsQ = useQuery({
    queryKey: ['water-weekly-stats'],
    queryFn: () => waterService.getWeeklyStats(),
    enabled: !!user,
  });

  const statsHistoryQ = useQuery({
    queryKey: ['water-stats-history'],
    queryFn: () => waterService.getStatsHistory(),
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
    mutationFn: (amount: number) => waterService.log({ amount_ml: amount }),
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
          <View>
            <Text style={[typography.heading, { color: palette.text, fontSize: 26 }]}>Water Tracker</Text>
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
              Stay hydrated to maintain peak mental focus and study stamina.
            </Text>
          </View>

          {/* Progress Card */}
          <WaterProgressCard totalMl={totalMl} goalMl={goalMl} />

          {/* Quick Add Buttons Grid */}
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: palette.text }]}>Quick Add</Text>
            <View style={styles.quickAddGrid}>
              {[100, 200, 250, 500, 1000].map((amount) => (
                <QuickAddButton
                  key={amount}
                  amount={amount}
                  onPress={() => handleLogWater(amount)}
                />
              ))}
            </View>
          </View>

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
    paddingBottom: spacing['2xl'],
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
