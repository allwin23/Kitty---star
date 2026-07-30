/**
 * Report Detail Screen
 * Shows the complete finalized daily_report with report_tasks.
 */
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { format } from 'date-fns';

import { queryKeys } from '@/lib/query-keys';
import { supabase } from '@/lib/supabase';
import { Card, ErrorState, Loading, Screen } from '@/components/ui';
import { colors, radius, spacing, typography } from '@/theme';

async function fetchReport(id: string) {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, report_tasks(*)')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export default function ReportDetailScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();

  const reportQ = useQuery({
    queryKey: queryKeys.report(reportId),
    queryFn: () => fetchReport(reportId),
    enabled: !!reportId,
  });

  const r = (reportQ.data as unknown) as {
    id: string;
    date: string;
    planned_minutes: number;
    completed_minutes: number;
    planned_tasks: number;
    completed_tasks: number;
    total_pomodoros: number;
    approval_status: string;
    review_comment: string | null;
    xp_earned: number;
    streak_after_day: number;
    report_tasks: {
      id: string;
      title: string;
      estimated_minutes: number;
      completed_minutes: number;
      completed: boolean;
      pomodoros: number;
      order: number;
    }[];
  } | null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: palette.primary, fontSize: 16 }}>← Back</Text>
            </Pressable>
            <Text style={[typography.title, { color: palette.text, flex: 1 }]}>Report Detail</Text>
          </View>

          {reportQ.isLoading ? (
            <Loading />
          ) : reportQ.error ? (
            <ErrorState
              error={(reportQ.error as Error).message}
              onRetry={() => void reportQ.refetch()}
            />
          ) : r ? (
            <>
              {/* Summary */}
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <Text style={[typography.title, { color: palette.text }]}>
                    {format(new Date(r.date), 'EEEE, d MMMM yyyy')}
                  </Text>
                  <Text
                    style={{
                      color: r.approval_status === 'approved' ? '#16a34a' : palette.danger,
                      fontWeight: '700',
                      textTransform: 'capitalize',
                      fontSize: 16,
                    }}
                  >
                    {r.approval_status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                  </Text>
                  {r.review_comment ? (
                    <Text style={{ color: palette.mutedText, fontSize: 14 }}>
                      Partner note: "{r.review_comment}"
                    </Text>
                  ) : null}

                  {/* Stats grid */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
                    {[
                      { label: 'Tasks Done', value: `${r.completed_tasks}/${r.planned_tasks}` },
                      { label: '🍅 Pomodoros', value: r.total_pomodoros },
                      { label: 'Study Time', value: `${r.completed_minutes}m` },
                      { label: 'XP Earned', value: `+${r.xp_earned}` },
                      { label: 'Streak', value: `${r.streak_after_day}d` },
                    ].map((s) => (
                      <View key={s.label} style={{ alignItems: 'center', minWidth: 80 }}>
                        <Text style={{ fontWeight: '700', fontSize: 20, color: palette.primary }}>
                          {s.value}
                        </Text>
                        <Text style={{ color: palette.mutedText, fontSize: 11 }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Card>

              {/* Task breakdown */}
              <Card>
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
                    Task Breakdown
                  </Text>
                  {r.report_tasks
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((t) => (
                      <View
                        key={t.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          gap: spacing.sm,
                          borderBottomColor: palette.border,
                          borderBottomWidth: 1,
                          paddingVertical: spacing.xs,
                        }}
                      >
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 4,
                            backgroundColor: t.completed ? palette.primary : 'transparent',
                            borderWidth: 2,
                            borderColor: t.completed ? palette.primary : palette.border,
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                          }}
                        >
                          {t.completed ? (
                            <Text style={{ color: palette.primaryText, fontSize: 10, fontWeight: '700' }}>
                              ✓
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              color: palette.text,
                              textDecorationLine: t.completed ? 'line-through' : 'none',
                              opacity: t.completed ? 0.6 : 1,
                            }}
                          >
                            {t.title}
                          </Text>
                          <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                            {t.completed_minutes}/{t.estimated_minutes} min · {t.pomodoros} 🍅
                          </Text>
                        </View>
                        <Text
                          style={{
                            color: t.completed ? '#16a34a' : palette.danger,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {t.completed ? 'Done' : 'Pending'}
                        </Text>
                      </View>
                    ))}
                </View>
              </Card>
            </>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
