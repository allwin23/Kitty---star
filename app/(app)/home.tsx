import { useEffect, useRef } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { Button, Card, Loading, Screen } from '@/components/ui';
import { notificationService, reportService, testingService } from '@/services/backend';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { colors, spacing, typography } from '@/theme';
import type { TableRow } from '@/types/database';

export default function HomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const channelRef = useRef<ReturnType<typeof notificationService.subscribe> | null>(null);

  // User stats
  const statsQ = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => reportService.stats(),
    enabled: !!user,
  });

  const stats = statsQ.data as {
    xp: number;
    level: number;
    current_streak: number;
    approved_days: number;
    total_pomodoros: number;
  } | null;

  // Notifications
  const notifQ = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => notificationService.listUnread(),
    enabled: !!user,
  });

  const notifications = (notifQ.data ?? []) as TableRow<'notifications'>[];

  // Realtime notification subscription
  useEffect(() => {
    channelRef.current = notificationService.subscribe((notification) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mascotFeed });
      void queryClient.invalidateQueries({ queryKey: queryKeys.mascotUnread });
      if (notification.type === 'submission_approved' || notification.type === 'submission_rejected') {
        void queryClient.invalidateQueries({ queryKey: ['reports'] });
        void queryClient.invalidateQueries({ queryKey: ['current-plan'] });
        void queryClient.invalidateQueries({ queryKey: ['initial-plan'] });
        void queryClient.invalidateQueries({ queryKey: ['my-submission'] });
      }
    });
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [queryClient]);

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Greeting */}
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.heading, { color: colors.light.text }]}>
              Hello, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
            </Text>
            <Text style={{ color: colors.light.mutedText }}>{user?.email}</Text>
          </View>

          {/* Stats */}
          {statsQ.isLoading ? (
            <Loading />
          ) : stats ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.light.text }}>Your Progress</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }}>
                  {[
                    { label: 'Level', value: stats.level },
                    { label: 'XP', value: stats.xp },
                    { label: 'Streak', value: `${stats.current_streak}d` },
                    { label: '✅ Days', value: stats.approved_days },
                    { label: '🍅', value: stats.total_pomodoros },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center' }}>
                      <Text style={{ fontWeight: '700', fontSize: 22, color: colors.light.primary }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: colors.light.mutedText, fontSize: 12 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : null}

          {/* Quick actions */}
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: '700', color: colors.light.text }}>Quick Actions</Text>
              <Button onPress={() => router.push('/(app)/accountability')}>
                ✅ Accountability
              </Button>
              <Button onPress={() => router.push('/(app)/accountability/reports')}>
                📊 Reports & Achievements
              </Button>
              <Button onPress={() => router.push('/(app)/pyq')}>
                📚 PYQ Practice
              </Button>
              <Button onPress={() => router.push('/(app)/flashcards')}>
                ⚡ Flashcards
              </Button>
            </View>
          </Card>

          {/* Notifications */}
          {notifications.length > 0 ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ fontWeight: '700', color: colors.light.text }}>
                  Notifications ({notifications.length})
                </Text>
                {notifications.map((n) => (
                  <View
                    key={n.id}
                    style={{
                      borderBottomColor: colors.light.border,
                      borderBottomWidth: 1,
                      paddingVertical: spacing.xs,
                      gap: spacing.xs,
                    }}
                  >
                    <Text style={{ color: colors.light.text, fontWeight: '600' }}>{n.title}</Text>
                    <Text style={{ color: colors.light.mutedText, fontSize: 13 }}>{n.body}</Text>
                    <Button onPress={() => void handleMarkRead(n.id)}>Mark read</Button>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          {/* Database Reset (Testing Only) */}
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontWeight: '700', color: colors.light.danger }}>
                Developer testing tools
              </Text>
              <Text style={{ color: colors.light.mutedText, fontSize: 13 }}>
                Delete all plan, task, submission, report and notification histories and reset streaks back to zero.
              </Text>
              <Button
                onPress={async () => {
                  const title = 'Reset all data?';
                  const msg = 'This will delete all daily plans, tasks, submissions, reports, notifications and reset stats to 0.';
                  const confirmed =
                    Platform.OS === 'web'
                      ? window.confirm(`${title}\n\n${msg}`)
                      : await new Promise((resolve) => {
                          Alert.alert(title, msg, [
                            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                            { text: 'Reset', onPress: () => resolve(true), style: 'destructive' },
                          ]);
                        });

                  if (confirmed) {
                    try {
                      await testingService.resetAllData();
                      queryClient.clear();
                      if (Platform.OS === 'web') {
                        window.alert('Database successfully reset to clean state!');
                      } else {
                        Alert.alert('Success', 'Database successfully reset to clean state!');
                      }
                    } catch (e: any) {
                      if (Platform.OS === 'web') {
                        window.alert(`Failed to reset: ${e.message}`);
                      } else {
                        Alert.alert('Error', e.message);
                      }
                    }
                  }
                }}
              >
                Reset Database (Unseed)
              </Button>
            </View>
          </Card>

          {/* Logout */}
          <Button onPress={() => void logout()}>Logout</Button>
        </View>
      </ScrollView>
    </Screen>
  );
}
