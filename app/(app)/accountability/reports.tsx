/**
 * Reports Screen — list of finalized daily_reports.
 * Each row links to the report detail screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

import { reportService, notificationService, plannerService } from '@/services/backend';
import { getPartnerProfile } from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { Card, EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const palette = colors[isDark ? 'dark' : 'light'];
  const cardText = colors.light.text;
  const cardMutedText = colors.light.mutedText;
  const cardPrimary = colors.light.primary;
  const cardBorder = 'rgba(232, 77, 114, 0.20)';
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const partnerId = profile?.partner_id;

  const [selectedTab, setSelectedTab] = useState<'my' | 'partner'>('my');
  const [showOlderMy, setShowOlderMy] = useState(false);
  const [showOlderPartner, setShowOlderPartner] = useState(false);
  const [showOlderAchievements, setShowOlderAchievements] = useState(false);

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

  const partnerProfileQ = useQuery({
    queryKey: queryKeys.partnerProfile,
    queryFn: getPartnerProfile,
    enabled: !!user,
  });

  const partnerProfile = partnerProfileQ.data;
  const partnerName =
    partnerProfile?.full_name?.trim() || partnerProfile?.email?.split('@')[0] || 'Partner';

  const partnerStatsQ = useQuery({
    queryKey: ['partner-stats', partnerId],
    queryFn: async () => {
      if (!partnerId) return null;
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', partnerId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId && selectedTab === 'partner',
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

  type ReportItem = {
    id: string;
    user_id: string;
    date: string;
    planned_tasks: number;
    completed_tasks: number;
    total_pomodoros: number;
    approval_status: string;
    xp_earned: number;
    streak_after_day: number;
    completed_minutes: number;
  };

  const reports = (reportsQ.data ?? []) as ReportItem[];

  const myReports = reports.filter((r: ReportItem) => r.user_id === user?.id);
  const partnerReports = reports.filter((r: ReportItem) => r.user_id === partnerId);

  const displayedMyReports = showOlderMy ? myReports : myReports.slice(0, 7);
  const displayedPartnerReports = showOlderPartner ? partnerReports : partnerReports.slice(0, 7);

  const activeReports = selectedTab === 'my' ? displayedMyReports : displayedPartnerReports;
  const activeFullList = selectedTab === 'my' ? myReports : partnerReports;
  const activeShowOlder = selectedTab === 'my' ? showOlderMy : showOlderPartner;
  const setActiveShowOlder = selectedTab === 'my' ? setShowOlderMy : setShowOlderPartner;

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
            refreshing={reportsQ.isFetching || partnerStatsQ.isFetching}
            onRefresh={() => {
              void reportsQ.refetch();
              if (partnerId) void partnerStatsQ.refetch();
            }}
          />
        }
      >
        <View style={{ gap: spacing.lg, paddingBottom: 120 }}>
          {/* Header Row: Back arrow + Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Text style={{ color: palette.text, fontSize: 20, fontWeight: '800' }}>
                ←
              </Text>
            </Pressable>
            <Text style={[typography.heading, { color: palette.text, flex: 1 }]}>Reports</Text>
          </View>

          {/* Slider / Segmented Control Tab Bar */}
          {partnerId ? (
            <View
              style={{
                flexDirection: 'row',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: 24,
                padding: 4,
                marginVertical: spacing.xs,
              }}
            >
              <Pressable
                onPress={() => setSelectedTab('my')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: selectedTab === 'my' ? (isDark ? '#C73A57' : '#FFFFFF') : 'transparent',
                  borderRadius: 20,
                  elevation: selectedTab === 'my' ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 14,
                    color: selectedTab === 'my' ? (isDark ? '#FFFFFF' : '#C73A57') : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
                  }}
                >
                  My Reports
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setSelectedTab('partner')}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  backgroundColor: selectedTab === 'partner' ? (isDark ? '#C73A57' : '#FFFFFF') : 'transparent',
                  borderRadius: 20,
                  elevation: selectedTab === 'partner' ? 2 : 0,
                }}
              >
                <Text
                  style={{
                    fontWeight: '800',
                    fontSize: 14,
                    color: selectedTab === 'partner' ? (isDark ? '#FFFFFF' : '#C73A57') : (isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'),
                  }}
                >
                  {`${partnerName}'s Reports`}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Stats Card */}
          {selectedTab === 'my' && stats ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: cardText, fontWeight: '700', fontSize: 16 }}>
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
                      <Text style={{ fontWeight: '700', fontSize: 20, color: cardPrimary }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: cardMutedText, fontSize: 11 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : selectedTab === 'partner' && partnerStatsQ.isLoading ? (
            <Card>
              <Loading />
            </Card>
          ) : selectedTab === 'partner' && partnerStatsQ.data ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: cardText, fontWeight: '700', fontSize: 16 }}>
                  {`${partnerName}'s Stats`}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                  {[
                    { label: 'Level', value: partnerStatsQ.data.level },
                    { label: 'XP', value: partnerStatsQ.data.xp },
                    { label: 'Streak', value: `${partnerStatsQ.data.current_streak}d` },
                    { label: 'Best Streak', value: `${partnerStatsQ.data.longest_streak}d` },
                    { label: '🍅 Total', value: partnerStatsQ.data.total_pomodoros },
                    { label: '✅ Days', value: partnerStatsQ.data.approved_days },
                    { label: '❌ Rejected', value: partnerStatsQ.data.rejected_days },
                  ].map((s) => (
                    <View key={s.label} style={{ alignItems: 'center', minWidth: 70 }}>
                      <Text style={{ fontWeight: '700', fontSize: 20, color: cardPrimary }}>
                        {s.value}
                      </Text>
                      <Text style={{ color: cardMutedText, fontSize: 11 }}>{s.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </Card>
          ) : null}

          {/* Achievements Card (Only for user tab) */}
          {selectedTab === 'my' && achievements.length > 0 ? (
            <Card>
              <View style={{ gap: spacing.sm }}>
                <Text style={{ color: cardText, fontWeight: '700', fontSize: 16 }}>
                  Achievements ({achievements.length})
                </Text>
                {(showOlderAchievements ? achievements : achievements.slice(0, 7)).map((a) => (
                  <View
                    key={a.id}
                    style={{
                      flexDirection: 'row',
                      gap: spacing.sm,
                      alignItems: 'center',
                      borderBottomColor: cardBorder,
                      borderBottomWidth: 1,
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Text style={{ fontSize: 24 }}>🏆</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: cardText, fontWeight: '600' }}>
                        {a.achievements?.name}
                      </Text>
                      <Text style={{ color: cardMutedText, fontSize: 12 }}>
                        {a.achievements?.description}
                      </Text>
                    </View>
                    <Text style={{ color: cardMutedText, fontSize: 11 }}>
                      {format(new Date(a.unlocked_at), 'dd MMM')}
                    </Text>
                  </View>
                ))}

                {/* Show Older Achievements Button */}
                {achievements.length > 7 && !showOlderAchievements ? (
                  <Pressable
                    onPress={() => setShowOlderAchievements(true)}
                    style={({ pressed }) => ({
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0, 0, 0, 0.05)',
                      borderColor: 'rgba(232, 77, 114, 0.20)',
                      borderWidth: 1.5,
                      borderRadius: 20,
                      paddingVertical: 10,
                      marginTop: spacing.sm,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text
                      style={{
                        color: cardText,
                        fontWeight: '800',
                        fontSize: 13,
                      }}
                    >
                      Show Older Achievements
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ) : null}

          {/* Reports List Title */}
          <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
            {selectedTab === 'my' ? 'My Daily Reports' : `${partnerName}'s Daily Reports`}
          </Text>

          {reportsQ.isLoading ? (
            <Loading />
          ) : reportsQ.error ? (
            <ErrorState
              error={(reportsQ.error as Error).message}
              onRetry={() => void reportsQ.refetch()}
            />
          ) : activeReports.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description={
                selectedTab === 'my'
                  ? 'Reports appear after your partner approves or rejects a submission.'
                  : `${partnerName} has no approved or rejected report history yet.`
              }
            />
          ) : (
            <>
              {activeReports.map((r) => (
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
                        <Text style={{ color: cardText, fontWeight: '600', fontSize: 15 }}>
                          {format(new Date(r.date), 'EEE, dd MMM yyyy')}
                        </Text>
                        <Text style={{ color: cardMutedText, fontSize: 12 }}>
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
                        <Text style={{ color: cardMutedText, fontSize: 11 }}>
                          Streak: {r.streak_after_day}d
                        </Text>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}

              {/* Show Older Reports Button */}
              {activeFullList.length > 7 && !activeShowOlder ? (
                <Pressable
                  onPress={() => setActiveShowOlder(true)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(199, 58, 87, 0.35)' : 'rgba(250, 215, 224, 0.90)',
                    borderWidth: 1.5,
                    borderRadius: 20,
                    paddingVertical: 12,
                    marginTop: spacing.xs,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: isDark ? '#FFF7F8' : '#C73A57',
                      fontWeight: '800',
                      fontSize: 14,
                    }}
                  >
                    Show Older Reports
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
