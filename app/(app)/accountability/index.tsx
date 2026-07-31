/**
 * Accountability Screen
 *
 * Clear sections:
 *  1. Prior Planning (Tomorrow) — edit draft tasks for TOMORROW only
 *  2. My Initial Plan — read-only snapshot created at day start
 *  3. My Today Tasks — live editable checklist with submit button
 *  4. Partner's Live Tasks — real-time read-only view of partner's task progress
 *  5. Partner Submission — partner's pending submission with review button
 *
 * Auto-start: If today has a draft but no plan, auto-duplicate into plans on mount.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format, addDays } from 'date-fns';

import { plannerService, notificationService } from '@/services/backend';
import {
  getDraft,
  getInitialPlan,
  getCurrentPlan,
  getPartnerCurrentPlan,
  getPartnerSubmission,
} from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Loading,
  Screen,
} from '@/components/ui';
import { TodoList, type TodoTask } from '@/features/accountability/todo-list';
import { PomodoroModal } from '@/features/accountability/pomodoro-modal';
import { colors, radius, spacing, typography } from '@/theme';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = addDays(new Date(), 1).toISOString().slice(0, 10);

function SectionTitle({ children }: { children: string }) {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  return (
    <Text style={[typography.title, { color: palette.text, fontSize: 18 }]}>{children}</Text>
  );
}

export default function AccountabilityScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [pomodoroTask, setPomodoroTask] = useState<TodoTask | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const autoStartRef = useRef(false);

  // ─── My Queries ─────────────────────────────────────────────────────────────

  const currentPlanQ = useQuery({
    queryKey: queryKeys.currentPlan(today),
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  const currentPlan = currentPlanQ.data as {
    id: string;
    status: 'editing' | 'submitted';
    current_tasks: {
      id: string; title: string; estimated_minutes: number;
      completed_minutes: number; completed_pomodoros: number;
      status: 'pending' | 'completed'; order: number;
    }[];
  } | null;

  // Prior planning is ALWAYS for tomorrow
  const draftQ = useQuery({
    queryKey: queryKeys.draft(tomorrow),
    queryFn: () => getDraft(tomorrow),
    enabled: !!user,
  });

  // Check if today has a draft (for auto-start when the day rolls over)
  const todayDraftQ = useQuery({
    queryKey: queryKeys.draft(today),
    queryFn: () => getDraft(today),
    enabled: !!user && !currentPlan && !currentPlanQ.isLoading,
  });

  const initialPlanQ = useQuery({
    queryKey: queryKeys.initialPlan(today),
    queryFn: () => getInitialPlan(today),
    enabled: !!user,
  });

  const todayReportQ = useQuery({
    queryKey: ['today-report', today],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('daily_reports')
        .select('*, report_tasks(*)')
        .eq('date', today)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const todayReport = todayReportQ.data;

  // ─── Auto-start: duplicate today's draft into plans ─────────────────────────

  const startDayMutation = useMutation({
    mutationFn: () => plannerService.createDailyPlans(today),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.initialPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: ['draft'] });
      void queryClient.invalidateQueries({ queryKey: ['today-report', today] });
    },
    onError: (e: Error) => Alert.alert('Error starting day', e.message),
  });

  const todayDraft = todayDraftQ.data as {
    id: string;
    draft_tasks?: { id: string; title: string; estimated_minutes: number; order: number }[];
  } | null;

  const hasTodayDraftTasks = (todayDraft?.draft_tasks ?? []).length > 0;
  const hasTodayReport = !!todayReport;

  useEffect(() => {
    // Auto-start: if today has a draft with tasks but no plan exists, and not finalized yet
    if (
      !currentPlan &&
      !currentPlanQ.isLoading &&
      hasTodayDraftTasks &&
      !todayDraftQ.isLoading &&
      !hasTodayReport &&
      !todayReportQ.isLoading &&
      !autoStartRef.current &&
      !startDayMutation.isPending
    ) {
      autoStartRef.current = true;
      void startDayMutation.mutateAsync();
    }
  }, [currentPlan, currentPlanQ.isLoading, hasTodayDraftTasks, todayDraftQ.isLoading, hasTodayReport, todayReportQ.isLoading, startDayMutation]);

  // ─── Partner Queries ────────────────────────────────────────────────────────

  const partnerPlanQ = useQuery({
    queryKey: queryKeys.partnerPlan(today),
    queryFn: () => getPartnerCurrentPlan(today),
    enabled: !!user,
    refetchInterval: 30000, // Poll every 30s for live updates
  });

  const partnerQ = useQuery({
    queryKey: queryKeys.partnerSubmission,
    queryFn: getPartnerSubmission,
    enabled: !!user,
  });

  // ─── Cache invalidation ─────────────────────────────────────────────────────

  const invalidateAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['draft'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.initialPlan(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.partnerSubmission });
    void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
    void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
    void queryClient.invalidateQueries({ queryKey: ['today-report', today] });
  }, [queryClient]);

  // Realtime: listen for notifications to auto-refresh on review events
  const channelRef = useRef<ReturnType<typeof notificationService.subscribe> | null>(null);
  useEffect(() => {
    channelRef.current = notificationService.subscribe(() => {
      invalidateAll();
    });
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [invalidateAll]);

  // Realtime: subscribe to partner's changes (plans, tasks, submissions) for live visibility
  const partnerChannelRef = useRef<ReturnType<typeof plannerService.subscribeToPartnerChanges> | null>(null);
  const partnerId = profile?.partner_id;
  useEffect(() => {
    if (!partnerId) return;
    partnerChannelRef.current = plannerService.subscribeToPartnerChanges(partnerId, () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerSubmission });
    });
    return () => {
      if (partnerChannelRef.current) {
        plannerService.unsubscribe(partnerChannelRef.current);
      }
    };
  }, [partnerId, queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    invalidateAll();
    setRefreshing(false);
  };

  // ─── Draft / Prior Planning mutations (always for TOMORROW) ─────────────────

  const draftTasks: TodoTask[] = (
    (draftQ.data as { draft_tasks?: { id: string; title: string; estimated_minutes: number; order: number }[] } | null)?.draft_tasks ?? []
  )
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ ...t, status: 'pending' as const }));

  const saveDraftMutation = useMutation({
    mutationFn: (tasks: { title: string; estimated_minutes: number }[]) =>
      plannerService.createDraft(tomorrow, tasks),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.draft(tomorrow) });
    },
    onError: (e: Error) => Alert.alert('Error saving draft', e.message),
  });

  const handleDraftAdd = async (title: string, minutes: number) => {
    const current = draftTasks.map((t) => ({ title: t.title, estimated_minutes: t.estimated_minutes }));
    await saveDraftMutation.mutateAsync([...current, { title, estimated_minutes: minutes }]);
  };

  const handleDraftEdit = async (task: TodoTask, title: string, minutes: number) => {
    const updated = draftTasks.map((t) =>
      t.id === task.id ? { title, estimated_minutes: minutes } : { title: t.title, estimated_minutes: t.estimated_minutes }
    );
    await saveDraftMutation.mutateAsync(updated);
  };

  const handleDraftDelete = async (taskId: string) => {
    const remaining = draftTasks
      .filter((t) => t.id !== taskId)
      .map((t) => ({ title: t.title, estimated_minutes: t.estimated_minutes }));
    await saveDraftMutation.mutateAsync(remaining);
  };

  // ─── Manual "Start Empty Day" for users who didn't plan ahead ───────────────

  const startEmptyDayMutation = useMutation({
    mutationFn: async () => {
      // Create an empty draft for today, then duplicate into plans
      await plannerService.createDraft(today, [{ title: 'New task', estimated_minutes: 25 }]);
      return plannerService.createDailyPlans(today);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.initialPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: ['draft'] });
    },
    onError: (e: Error) => Alert.alert('Error starting day', e.message),
  });

  // ─── My Live Todo mutations ─────────────────────────────────────────────────

  const currentTasks: TodoTask[] = (currentPlan?.current_tasks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      id: t.id,
      title: t.title,
      estimated_minutes: t.estimated_minutes,
      status: t.status,
      completed_pomodoros: t.completed_pomodoros,
      order: t.order,
    }));

  const handleTaskToggle = async (task: TodoTask) => {
    setSavingTaskId(task.id);
    try {
      const isCompleted = task.status !== 'completed';
      await plannerService.toggleTask(task.id, isCompleted);
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
    } catch (e: any) {
      Alert.alert('Error updating task', e.message);
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleTaskEdit = async (task: TodoTask, title: string, minutes: number) => {
    setSavingTaskId(task.id);
    try {
      await plannerService.updateTask(task.id, { title, estimated_minutes: minutes, order: task.order });
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
    } finally {
      setSavingTaskId(null);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    await plannerService.deleteTask(taskId);
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
  };

  const handleTaskAdd = async (title: string, minutes: number) => {
    if (!currentPlan) return;
    const maxOrder = currentTasks.reduce((m, t) => Math.max(m, t.order), -1) + 1;
    await plannerService.addTask({
      plan_id: currentPlan.id,
      title,
      estimated_minutes: minutes,
      order: maxOrder,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
  };

  // ─── Initial plan tasks ──────────────────────────────────────────────────────

  const initialPlan = initialPlanQ.data as {
    id: string;
    initial_tasks: { id: string; title: string; estimated_minutes: number; order: number }[];
  } | null;

  const initialTasks: TodoTask[] = (initialPlan?.initial_tasks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({ ...t, status: 'pending' as const }));

  // ─── Partner live tasks ──────────────────────────────────────────────────────

  const partnerPlan = partnerPlanQ.data as {
    id: string;
    status: 'editing' | 'submitted';
    user_id: string;
    current_tasks: {
      id: string; title: string; estimated_minutes: number;
      completed_minutes: number; completed_pomodoros: number;
      status: 'pending' | 'completed'; order: number;
    }[];
  } | null;

  const partnerTasks: TodoTask[] = (partnerPlan?.current_tasks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      id: t.id,
      title: t.title,
      estimated_minutes: t.estimated_minutes,
      status: t.status,
      completed_pomodoros: t.completed_pomodoros,
      order: t.order,
    }));

  const partnerCompletedCount = partnerTasks.filter((t) => t.status === 'completed').length;

  // ─── Partner submission ──────────────────────────────────────────────────────

  const partnerSub = partnerQ.data as {
    id: string;
    submitted_at: string;
    status: string;
    profiles?: { full_name: string | null; avatar_url: string | null } | null;
    current_plans?: { current_tasks: { title: string; status: string }[] } | null;
  } | null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  const tomorrowFormatted = format(new Date(tomorrow + 'T00:00:00'), 'dd MMM');
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header */}
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.heading, { color: palette.text }]}>Accountability</Text>
            <Text style={{ color: palette.mutedText }}>{format(new Date(), 'EEEE, d MMMM yyyy')}</Text>
          </View>

          {/* ─── Section 1: Prior Planning (ALWAYS Tomorrow) ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle>{"Prior Planning"}</SectionTitle>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                  For tomorrow ({tomorrowFormatted})
                </Text>
              </View>

              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                {"Plan tomorrow\u2019s tasks. At midnight, this becomes your Initial Plan snapshot and today\u2019s task list."}
              </Text>

              {draftQ.isLoading ? (
                <Loading />
              ) : draftQ.error ? (
                <ErrorState error={(draftQ.error as Error).message} onRetry={() => void draftQ.refetch()} />
              ) : (
                <TodoList
                  tasks={draftTasks}
                  onAdd={handleDraftAdd}
                  onEdit={handleDraftEdit}
                  onDelete={handleDraftDelete}
                  savingId={saveDraftMutation.isPending ? 'all' : null}
                />
              )}

              {saveDraftMutation.isPending ? (
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>{"Saving\u2026"}</Text>
              ) : null}
            </View>
          </Card>

          {/* ─── Section 2: My Initial Plan Snapshot ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <SectionTitle>My Initial Plan</SectionTitle>
              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Read-only snapshot from your prior planning. Your partner compares this against your submission.
              </Text>

              {initialPlanQ.isLoading || startDayMutation.isPending ? (
                <Loading />
              ) : initialPlanQ.error ? (
                <ErrorState
                  error={(initialPlanQ.error as Error).message}
                  onRetry={() => void initialPlanQ.refetch()}
                />
              ) : initialTasks.length === 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <EmptyState
                    title="No initial plan"
                    description={
                      currentPlan
                        ? "No initial plan snapshot was created for today."
                        : "You didn\u2019t set prior planning for today. Start an empty day to add tasks now."
                    }
                  />
                  {/* If no plan exists, no draft, and no report for today, let user start an empty day */}
                  {!currentPlan && !hasTodayDraftTasks && !todayReport ? (
                    <Button
                      disabled={startEmptyDayMutation.isPending}
                      onPress={() => void startEmptyDayMutation.mutateAsync()}
                    >
                      {startEmptyDayMutation.isPending ? 'Starting\u2026' : 'Start Empty Day'}
                    </Button>
                  ) : null}
                </View>
              ) : (
                <TodoList tasks={initialTasks} readOnly />
              )}
            </View>
          </Card>

          {/* ─── Section 3: My Today Tasks ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle>{"My Today\u2019s Tasks"}</SectionTitle>
                {currentPlan?.status === 'submitted' ? (
                  <Text
                    style={{
                      color: palette.primary,
                      fontSize: 12,
                      fontWeight: '600',
                      borderWidth: 1,
                      borderColor: palette.primary,
                      borderRadius: 4,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    Submitted
                  </Text>
                ) : null}
              </View>

              {currentPlanQ.isLoading || startDayMutation.isPending || todayReportQ.isLoading ? (
                <Loading />
              ) : currentPlanQ.error ? (
                <ErrorState
                  error={(currentPlanQ.error as Error).message}
                  onRetry={() => void currentPlanQ.refetch()}
                />
              ) : todayReport ? (
                <View style={{ gap: spacing.sm }}>
                  <TodoList
                    tasks={(Array.isArray(todayReport.report_tasks) ? todayReport.report_tasks : []).map((t: any) => ({
                      id: t.id,
                      title: t.title,
                      estimated_minutes: t.estimated_minutes,
                      status: t.completed ? 'completed' : 'pending',
                      completed_pomodoros: t.pomodoros,
                      order: t.order ?? 0,
                    }))}
                    readOnly
                    showPomodoro
                  />
                  <View
                    style={{
                      backgroundColor: todayReport.approval_status === 'approved' ? '#f0fdf4' : '#fef2f2',
                      borderColor: todayReport.approval_status === 'approved' ? '#16a34a' : '#ef4444',
                      borderRadius: radius.md,
                      borderWidth: 1,
                      padding: spacing.sm,
                      marginTop: spacing.sm,
                    }}
                  >
                    <Text
                      style={{
                        color: todayReport.approval_status === 'approved' ? '#16a34a' : '#ef4444',
                        fontWeight: '700',
                        textAlign: 'center',
                        fontSize: 14,
                        textTransform: 'capitalize',
                      }}
                    >
                      Day Completed: {todayReport.approval_status} 🎉
                    </Text>
                    {todayReport.review_comment ? (
                      <Text
                        style={{
                          color: palette.mutedText,
                          fontSize: 12,
                          textAlign: 'center',
                          marginTop: 4,
                          fontStyle: 'italic',
                        }}
                      >
                        &quot;{todayReport.review_comment}&quot;
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : !currentPlan ? (
                <EmptyState
                  title="Not started"
                  description={"No tasks for today. Use \u201CStart Empty Day\u201D above, or plan tomorrow\u2019s tasks in Prior Planning."}
                />
              ) : currentPlan.status === 'submitted' ? (
                <View style={{ gap: spacing.sm }}>
                  <TodoList tasks={currentTasks} readOnly showPomodoro />
                  <Text style={{ color: palette.mutedText, fontSize: 13, textAlign: 'center' }}>
                    Day submitted. Awaiting partner review.
                  </Text>
                </View>
              ) : (
                <TodoList
                  tasks={currentTasks}
                  onToggle={handleTaskToggle}
                  onEdit={handleTaskEdit}
                  onDelete={handleTaskDelete}
                  onAdd={handleTaskAdd}
                  onPomodoro={(task) => setPomodoroTask(task)}
                  showPomodoro
                  savingId={savingTaskId}
                />
              )}

              {/* Submit button */}
              {currentPlan && currentTasks.length > 0 ? (
                <Button
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/accountability/submit',
                      params: { planId: currentPlan.id },
                    })
                  }
                >
                  {currentPlan.status === 'submitted' ? 'View Submission & Proofs \u2192' : 'Submit To Partner \u2192'}
                </Button>
              ) : null}
            </View>
          </Card>

          {/* ─── Section 4: Partner's Live Tasks ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle>{"Partner\u2019s Today Tasks"}</SectionTitle>
                {partnerPlan ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' }} />
                    <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                      {partnerCompletedCount}/{partnerTasks.length} done
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Live view of your partner{"'"}s task progress. Updates in real-time.
              </Text>

              {partnerPlanQ.isLoading ? (
                <Loading />
              ) : !partnerPlan ? (
                <EmptyState
                  title="No tasks yet"
                  description={"Your partner hasn\u2019t started their day yet."}
                />
              ) : partnerTasks.length === 0 ? (
                <EmptyState
                  title="No tasks"
                  description="Your partner has no tasks in their plan."
                />
              ) : (
                <TodoList tasks={partnerTasks} readOnly showPomodoro />
              )}
            </View>
          </Card>

          {/* ─── Section 5: Partner Submission (pending review) ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <SectionTitle>Partner Submission</SectionTitle>

              {partnerQ.isLoading ? (
                <Loading />
              ) : partnerQ.error ? (
                <ErrorState
                  error={(partnerQ.error as Error).message}
                  onRetry={() => void partnerQ.refetch()}
                />
              ) : !partnerSub ? (
                <EmptyState
                  title="No submission"
                  description={"Your partner hasn\u2019t submitted today\u2019s plan yet."}
                />
              ) : (
                <View style={{ gap: spacing.sm }}>
                  <Text style={{ color: palette.text, fontWeight: '600' }}>
                    {partnerSub.profiles?.full_name ?? 'Your partner'}
                  </Text>
                  <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                    Submitted {format(new Date(partnerSub.submitted_at), 'dd MMM HH:mm')}
                  </Text>
                  <Text
                    style={{
                      color:
                        partnerSub.status === 'pending'
                          ? palette.primary
                          : partnerSub.status === 'approved'
                          ? 'green'
                          : palette.danger,
                      fontWeight: '600',
                      textTransform: 'capitalize',
                    }}
                  >
                    {partnerSub.status}
                  </Text>
                  {(partnerSub.current_plans?.current_tasks ?? []).slice(0, 3).map((t, i) => (
                    <Text key={i} style={{ color: palette.mutedText, fontSize: 13 }}>
                      {"\u00B7"} {t.title} {t.status === 'completed' ? '\u2713' : ''}
                    </Text>
                  ))}
                  {partnerSub.status === 'pending' ? (
                    <Button
                      onPress={() =>
                        router.push({
                          pathname: '/(app)/accountability/review',
                          params: { submissionId: partnerSub.id },
                        })
                      }
                    >
                      Review Submission
                    </Button>
                  ) : null}
                </View>
              )}
            </View>
          </Card>

          {/* Reports History link */}
          <Button onPress={() => router.push('/(app)/accountability/reports')}>
            {"View Report History \u2192"}
          </Button>
        </View>
      </ScrollView>

      {/* Pomodoro Modal */}
      {currentPlan ? (
        <PomodoroModal
          visible={!!pomodoroTask}
          task={pomodoroTask}
          planId={currentPlan.id}
          onClose={() => setPomodoroTask(null)}
        />
      ) : null}
    </Screen>
  );
}
