/**
 * Accountability Screen
 *
 * Sections:
 *  1. Prior Planning — create/edit tomorrow's draft
 *  2. Initial Plan Snapshot — read-only, auto-populated when day starts
 *  3. Live Todo List — edit today's current_tasks
 *  4. Partner Submission — partner's pending submission (if any)
 */
import { useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { format, addDays } from 'date-fns';

import { plannerService } from '@/services/backend';
import { getDraft, getInitialPlan, getCurrentPlan, getPartnerSubmission } from '@/services/planner-read.service';
import { queryKeys } from '@/lib/query-keys';
import { useAuthStore } from '@/stores';
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
import { colors, spacing, typography } from '@/theme';

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

  const [pomodoroTask, setPomodoroTask] = useState<TodoTask | null>(null);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ─── Queries ────────────────────────────────────────────────────────────────

  const draftQ = useQuery({
    queryKey: queryKeys.draft(tomorrow),
    queryFn: () => getDraft(tomorrow),
    enabled: !!user,
  });

  const initialPlanQ = useQuery({
    queryKey: queryKeys.initialPlan(today),
    queryFn: () => getInitialPlan(today),
    enabled: !!user,
  });

  const currentPlanQ = useQuery({
    queryKey: queryKeys.currentPlan(today),
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  const partnerQ = useQuery({
    queryKey: queryKeys.partnerSubmission,
    queryFn: getPartnerSubmission,
    enabled: !!user,
  });

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.draft(tomorrow) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.initialPlan(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.partnerSubmission });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    invalidateAll();
    setRefreshing(false);
  };

  // ─── Draft / Prior Planning mutations ───────────────────────────────────────

  // The draft tasks are saved as a complete snapshot via create_draft RPC
  // which replaces all draft tasks atomically.
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

  // ─── Start Today button (duplicate draft → daily plans) ─────────────────────

  const startDayMutation = useMutation({
    mutationFn: () => plannerService.createDailyPlans(today),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.initialPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
    },
    onError: (e: Error) => Alert.alert('Error starting day', e.message),
  });

  // ─── Live Todo mutations ─────────────────────────────────────────────────────

  const currentPlan = currentPlanQ.data as {
    id: string;
    status: 'editing' | 'submitted';
    current_tasks: {
      id: string; title: string; estimated_minutes: number;
      completed_minutes: number; completed_pomodoros: number;
      status: 'pending' | 'completed'; order: number;
    }[];
  } | null;

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
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      // We update title only — status is guard-protected for progress, but
      // manually setting status directly is allowed via plannerService.updateTask
      await plannerService.updateTask(task.id, {
        title: task.title,
        estimated_minutes: task.estimated_minutes,
        order: task.order,
      });
      // The DB trigger sets status based on completed_minutes vs estimated_minutes.
      // To manually mark complete, we set completed_minutes = estimated_minutes.
      // To mark pending, set completed_minutes = 0. This is the only supported path.
      const mins = newStatus === 'completed' ? task.estimated_minutes : 0;
      // We can't set completed_minutes directly — it's guard-protected (only via pomodoro).
      // So we use Alert to inform the user.
      Alert.alert(
        'Tip',
        newStatus === 'completed'
          ? 'Task status is set automatically based on completed Pomodoros. Finish a pomodoro to mark progress.'
          : 'Task status resets when you record a new pomodoro.',
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
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

  // ─── Partner submission ──────────────────────────────────────────────────────

  const partnerSub = partnerQ.data as {
    id: string;
    submitted_at: string;
    status: string;
    profiles?: { full_name: string | null; avatar_url: string | null } | null;
    current_plans?: { current_tasks: { title: string; status: string }[] } | null;
  } | null;

  // ─── Render ──────────────────────────────────────────────────────────────────

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

          {/* ─── Section 1: Prior Planning ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle>Prior Planning</SectionTitle>
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>
                  For {format(addDays(new Date(), 1), 'dd MMM')}
                </Text>
              </View>

              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Plan tomorrow's tasks. This becomes your Initial Plan at day start.
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
                <Text style={{ color: palette.mutedText, fontSize: 12 }}>Saving…</Text>
              ) : null}
            </View>
          </Card>

          {/* ─── Section 2: Initial Plan Snapshot ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <SectionTitle>Initial Plan (Today)</SectionTitle>
              <Text style={{ color: palette.mutedText, fontSize: 13 }}>
                Read-only snapshot created at day start. Your partner compares this against your submission.
              </Text>

              {initialPlanQ.isLoading ? (
                <Loading />
              ) : initialPlanQ.error ? (
                <ErrorState
                  error={(initialPlanQ.error as Error).message}
                  onRetry={() => void initialPlanQ.refetch()}
                />
              ) : initialTasks.length === 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <EmptyState
                    title="No plan yet"
                    description="Start today from your prior planning draft."
                  />
                  {draftTasks.length > 0 && !currentPlan ? (
                    <Button
                      disabled={startDayMutation.isPending}
                      onPress={() => void startDayMutation.mutateAsync()}
                    >
                      {startDayMutation.isPending ? 'Starting…' : 'Start Today'}
                    </Button>
                  ) : null}
                </View>
              ) : (
                <TodoList tasks={initialTasks} readOnly />
              )}
            </View>
          </Card>

          {/* ─── Section 3: Live Todo ─── */}
          <Card>
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <SectionTitle>Today's Tasks</SectionTitle>
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

              {currentPlanQ.isLoading ? (
                <Loading />
              ) : currentPlanQ.error ? (
                <ErrorState
                  error={(currentPlanQ.error as Error).message}
                  onRetry={() => void currentPlanQ.refetch()}
                />
              ) : !currentPlan ? (
                <EmptyState
                  title="Not started"
                  description="Create a prior planning draft and press Start Today."
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
              {currentPlan && currentPlan.status === 'editing' && currentTasks.length > 0 ? (
                <Button
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/accountability/submit',
                      params: { planId: currentPlan.id },
                    })
                  }
                >
                  Submit To Partner →
                </Button>
              ) : null}
            </View>
          </Card>

          {/* ─── Section 4: Partner Submission ─── */}
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
                  description="Your partner hasn't submitted today's plan yet."
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
                      · {t.title} {t.status === 'completed' ? '✓' : ''}
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
