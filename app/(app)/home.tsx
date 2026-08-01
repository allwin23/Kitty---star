import { useEffect, useRef } from 'react';
import { Alert, Platform, ScrollView, Text, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { Button, Card, CreativeToolsGrid, HeaderTitleCard, Loading, NotificationBadge, Screen } from '@/components/ui';
import { CompanionStage } from '@/features/companion/components/companion-stage';
import { notificationService, reportService, testingService } from '@/services/backend';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { palette, spacing } from '@/theme';
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
        <View style={{ gap: spacing[24], paddingBottom: spacing[48] }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <HeaderTitleCard
              title={`Hello, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
              subtitle={user?.email ?? undefined}
              showWavingHand
            />
            <NotificationBadge />
          </View>

          {/* Synchronized Companion Stage */}
          <CompanionStage />

          {/* Progress Stats Card */}
          {statsQ.isLoading ? (
            <Loading />
          ) : stats ? (
            <Card>
              <View style={{ gap: spacing[16] }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: palette.danger, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Your Growth & Stats
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', gap: spacing[16] }}>
                  {[
                    { label: 'Level', value: stats.level },
                    { label: 'XP', value: stats.xp },
                    { label: 'Streak', value: `${stats.current_streak}d` },
                    { label: 'Approved', value: stats.approved_days },
                    { label: 'Pomodoros', value: stats.total_pomodoros },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center', minWidth: 60 }}>
                      <Text style={{ fontWeight: '800', fontSize: 22, color: palette.cherryBloom, fontFamily: "'Martian Mono', monospace" }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: palette.textSecondary, fontSize: 12, marginTop: spacing[4] }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : null}

          {/* Quick Companion Features & Tools */}
          <Card>
            <View style={{ gap: spacing[12] }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: palette.danger, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                STUDY SPACE & TOOLS
              </Text>
              <CreativeToolsGrid />
            </View>
          </Card>


          {/* Developer testing tools */}
          <Card>
            <View style={{ gap: spacing[12] }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: palette.danger, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Developer Testing Tools
              </Text>
              <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18 }}>
                Reset all daily plans, submissions, reports, and notification histories.
              </Text>
              <Button
                variant="tertiary"
                size="sm"
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
          <Button variant="tertiary" onPress={() => void logout()}>
            Sign out of Companion
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

