/**
 * Reports Screen — list of finalized daily_reports.
 * Each row links to the report detail screen.
 */
import { useEffect, useRef } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import { reportService, notificationService, plannerService } from '@/services/backend';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { Card, EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const channelRef = useRef<ReturnType<typeof notificationService.subscribe> | null>(null);
  const reportsChannelRef = useRef<ReturnType<typeof reportService.subscribeToReports> | null>(
    null,
  );

  const reportsQ = useQuery({
    queryKey: queryKeys.reports,
    queryFn: () => reportService.list(),
  });

  const statsQ = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => reportService.stats(),
  });

  const achievementsQ = useQuery({
    queryKey: queryKeys.achievements,
    queryFn: () => reportService.achievements(),
  });

  // Realtime subscription to daily_reports and notifications to update reports when review is finalized
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;

    // Listen directly to report insertions
    reportsChannelRef.current = reportService.subscribeToReports(userId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
    });

    // Also keep notifications fallback listener
    channelRef.current = notificationService.subscribe((notification) => {
      if (
        notification.user_id === userId &&
        (notification.type === 'submission_approved' || notification.type === 'submission_rejected')
      ) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
        void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
        void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      }
    });

    return () => {
      if (reportsChannelRef.current) {
        plannerService.unsubscribe(reportsChannelRef.current);
      }
      channelRef.current?.unsubscribe();
    };
  }, [userId, queryClient]);

  const reports = (reportsQ.data ?? []) as {
    id: string;
    date: string;
    planned_tasks: number;
    completed_tasks: number;
    total_pomodoros: number;
    approval_status: string;
    xp_earned: number;
    streak_after_day: number;
    completed_minutes: number;
  }[];

  const stats = statsQ.data as {
    xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    total_pomodoros: number;
    total_minutes: number;
    approved_days: number;
    rejected_days: number;
  } | null;

  const achievements = (achievementsQ.data ?? []) as {
    id: string;
    unlocked_at: string;
    achievements: { name: string; description: string } | null;
  }[];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={reportsQ.isFetching}
            onRefresh={() => void reportsQ.refetch()}
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
          <Text style={[typography.heading, { color: palette.text }]}>Reports</Text>

          {/* User Stats */}
          {stats ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
                  Your Stats
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {[
                    { label: 'Level', value: stats.level },
                    { label: 'XP', value: stats.xp },
                    { label: 'Streak', value: `${stats.current_streak}d` },
                    { label: 'Best Streak', value: `${stats.longest_streak}d` },
                    { label: '🍅 Total', value: stats.total_pomodoros },
                    { label: '✅ Days', value: stats.approved_days },
                    { label: '❌ Rejected', value: stats.rejected_days },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center', minWidth: 70 }}>
                      <Text style={{ fontWeight: '700', fontSize: 20, color: palette.primary }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: palette.mutedText, fontSize: 11 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : statsQ.isLoading ? (
            <Loading />
          ) : null}

          {/* Achievements */}
          {achievements.length > 0 ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
                  Achievements ({achievements.length})
                </Text>
                {achievements.map((a) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      alignItems: 'center',
                      borderBottomColor: palette.border,
                      borderBottomWidth: 1,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🏆</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: palette.text, fontWeight: '600' }}>
                        {a.achievements?.name}
                      </Text>
                      <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                        {a.achievements?.description}
                      </Text>
                    </View>
                    <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                      {format(new Date(a.unlocked_at), 'dd MMM')}
                    </Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Reports List */}
          <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
            Daily Reports
          </Text>

          {reportsQ.isLoading ? (
            <Loading />
          ) : reportsQ.error ? (
            <ErrorState
              error={(reportsQ.error as Error).message}
              onRetry={() => void reportsQ.refetch()}
            />
          ) : reports.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description="Reports appear after your partner approves or rejects a submission."
            />
          ) : (
            reports.map((r) => (
              <Pressable
                key={r.id}
                onPress={() =>
                  router.push({
                    pathname: '/(app)/accountability/report',
                    params: { reportId: r.id },
                  })
                }
              >
                <Card>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ gap: spacing.xs }}>
                      <Text style={{ color: palette.text, fontWeight: '600', fontSize: 15 }}>
                        {format(new Date(r.date), 'EEE, dd MMM yyyy')}
                      </Text>
                      <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                        {r.completed_tasks}/{r.planned_tasks} tasks · {r.total_pomodoros} 🍅 · +
                        {r.xp_earned} XP
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text
                        style={{
                          color: r.approval_status === 'approved' ? '#16a34a' : palette.danger,
                          fontWeight: '700',
                          fontSize: 12,
                          textTransform: 'capitalize',
                          borderWidth: 1,
                          borderColor:
                            r.approval_status === 'approved' ? '#16a34a' : palette.danger,
                          borderRadius: radius.sm,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        {r.approval_status}
                      </Text>
                      <Text style={{ color: palette.mutedText, fontSize: 11 }}>
                        Streak: {r.streak_after_day}d
                      </Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
