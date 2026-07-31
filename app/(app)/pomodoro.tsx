import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';

import { Button, Card, EmptyState, ErrorState, Loading, Screen } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';
import { getCurrentPlan } from '@/services/planner-read.service';
import { pomodoroService } from '@/services/backend';
import { useAuthStore, usePomodoroStore, type PomodoroSessionType } from '@/stores';
import { colors, radius, spacing, typography } from '@/theme';

const today = new Date().toISOString().slice(0, 10);

export default function PomodoroScreen() {
  const colorScheme = useColorScheme();
  const palette = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [completing, setCompleting] = useState(false);

  // Load today's live plan
  const currentPlanQ = useQuery({
    queryKey: queryKeys.currentPlan(today),
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      void currentPlanQ.refetch();
    }, [])
  );

  const currentPlan = currentPlanQ.data as {
    id: string;
    status: 'editing' | 'submitted';
    current_tasks: {
      id: string;
      title: string;
      estimated_minutes: number;
      completed_minutes: number;
      completed_pomodoros: number;
      status: 'pending' | 'completed';
      order: number;
    }[];
  } | null;

  const currentTasks = (currentPlan?.current_tasks ?? [])
    .slice()
    .sort((a, b) => a.order - b.order);

  // Get store values
  const {
    timerSeconds,
    isRunning,
    isPaused,
    durationMinutes,
    sessionType,
    selectedTaskId,
    startedAt,
    tick,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setSelectedTaskId,
    setSessionType,
    setDurationMinutes,
  } = usePomodoroStore();

  // Active task object
  const activeTask = currentTasks.find((t) => t.id === selectedTaskId);

  // Auto-reset selection if the selected task is completed or no longer exists
  useEffect(() => {
    if (selectedTaskId && currentPlan) {
      const task = currentTasks.find((t) => t.id === selectedTaskId);
      if (!task || task.status === 'completed') {
        setSelectedTaskId(null);
      }
    }
  }, [currentTasks, selectedTaskId, setSelectedTaskId, currentPlan]);



  // Complete pomodoro session mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!currentPlan) throw new Error('No active plan found');
      if (sessionType === 'focus' && !selectedTaskId) {
        throw new Error('A focus session requires a selected task');
      }

      const pStartedAt = startedAt ?? new Date(Date.now() - durationMinutes * 60000).toISOString();
      const pEndedAt = new Date().toISOString();

      return pomodoroService.complete({
        planId: currentPlan.id,
        taskId: sessionType === 'focus' ? selectedTaskId! : undefined,
        duration: durationMinutes,
        sessionType,
        startedAt: pStartedAt,
        endedAt: pEndedAt,
      });
    },
    onSuccess: () => {
      // Invalidate all affected queries to update stats, dashboard, reports, tasks in real-time
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

      // Clean up timer state
      resetTimer();

      const typeLabel =
        sessionType === 'focus'
          ? 'Focus session logged!'
          : sessionType === 'short_break'
          ? 'Short break finished!'
          : 'Long break finished!';

      if (Platform.OS === 'web') {
        window.alert(`Nice job! ${typeLabel}`);
      } else {
        Alert.alert('Session Complete! 🎉', typeLabel);
      }
    },
    onError: (e: Error) => {
      if (Platform.OS === 'web') {
        window.alert(`Failed to save session: ${e.message}`);
      } else {
        Alert.alert('Error completing session', e.message);
      }
    },
  });

  const handleComplete = useCallback(async (isAuto = false) => {
    if (completing) return;
    setCompleting(true);
    try {
      if (isAuto) {
        await completeMutation.mutateAsync();
      } else {
        const title = 'Complete session early?';
        const msg = 'Do you want to log this pomodoro now with the current active duration?';
        if (Platform.OS === 'web') {
          if (window.confirm(`${title}\n\n${msg}`)) {
            await completeMutation.mutateAsync();
          }
        } else {
          Alert.alert(title, msg, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Complete', onPress: () => void completeMutation.mutate() },
          ]);
        }
      }
    } finally {
      setCompleting(false);
    }
  }, [completing, completeMutation]);

  // Tick timer seconds every second
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, tick]);

  // Auto-complete session when timer runs down to 0
  useEffect(() => {
    if (isRunning && timerSeconds === 0) {
      const timer = setTimeout(() => {
        void handleComplete(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [timerSeconds, isRunning, handleComplete]);

  const handleStart = () => {
    if (sessionType === 'focus' && !selectedTaskId) {
      const msg = 'Please select a task from the list below before starting your focus session.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Select a task', msg);
      }
      return;
    }
    startTimer();
  };

  const handleReset = () => {
    const title = 'Reset timer?';
    const msg = 'Are you sure you want to discard this timer session?';
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}`)) {
        resetTimer();
      }
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => resetTimer() },
      ]);
    }
  };

  // Format seconds to MM:SS or HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Loading and error states
  if (currentPlanQ.isLoading) {
    return (
      <Screen centered>
        <Loading />
      </Screen>
    );
  }

  if (currentPlanQ.error) {
    return (
      <Screen centered>
        <ErrorState
          error={(currentPlanQ.error as Error).message}
          onRetry={() => void currentPlanQ.refetch()}
        />
      </Screen>
    );
  }

  if (!currentPlan) {
    return (
      <Screen centered>
        <View style={{ gap: spacing.md, alignItems: 'center', width: '100%', paddingHorizontal: spacing.xl }}>
          <EmptyState
            title="No active plan started"
            description="You must start today's plan on the Plan tab before you can use the Pomodoro timer."
          />
          <Button onPress={() => router.push('/(app)/accountability')}>
            Go to Plan tab
          </Button>
        </View>
      </Screen>
    );
  }

  if (currentTasks.length === 0) {
    return (
      <Screen centered>
        <View style={{ gap: spacing.md, alignItems: 'center', width: '100%', paddingHorizontal: spacing.xl }}>
          <EmptyState
            title="No tasks in plan"
            description="Add some tasks on the Plan tab first so you have something to focus on."
          />
          <Button onPress={() => router.push('/(app)/accountability')}>
            Go to Plan tab
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing.lg, paddingBottom: spacing['2xl'] }}>
          {/* Header & Mode Tabs */}
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.heading, { color: palette.text }]}>Study Timer</Text>

            <View style={[styles.tabsContainer, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              {(['focus', 'short_break', 'long_break'] as PomodoroSessionType[]).map((type) => {
                const isActive = sessionType === type;
                const label =
                  type === 'focus'
                    ? '🍅 Focus'
                    : type === 'short_break'
                    ? '☕ Short Break'
                    : '🌴 Long Break';

                return (
                  <Pressable
                    key={type}
                    disabled={isRunning}
                    onPress={() => setSessionType(type)}
                    style={[
                      styles.tabButton,
                      isActive && { backgroundColor: palette.background, shadowColor: '#000' },
                      isRunning && { opacity: 0.5 },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isActive ? palette.primary : palette.mutedText,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Timer Display Card */}
          <Card>
            <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
              {sessionType === 'focus' && (
                <Text style={{ color: palette.mutedText, fontSize: 14, fontWeight: '600' }}>
                  {activeTask
                    ? `Focusing on: "${activeTask.title}"`
                    : 'Select a task below to start focusing'}
                </Text>
              )}

              {/* Huge Timer */}
              <Text
                style={{
                  fontSize: 72,
                  fontWeight: '700',
                  color: isRunning && !isPaused ? palette.primary : palette.text,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatTime(timerSeconds)}
              </Text>

              {/* Session Controls */}
              <View style={{ flexDirection: 'row', gap: spacing.md, width: '100%', marginTop: spacing.sm }}>
                {!isRunning ? (
                  <Pressable
                    onPress={handleStart}
                    style={[
                      styles.controlButton,
                      { backgroundColor: palette.primary, flex: 2 },
                      sessionType === 'focus' && !selectedTaskId && { opacity: 0.5 },
                    ]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Start</Text>
                  </Pressable>
                ) : (
                  <>
                    {isPaused ? (
                      <Pressable
                        onPress={resumeTimer}
                        style={[styles.controlButton, { backgroundColor: palette.primary, flex: 1 }]}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Resume</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={pauseTimer}
                        style={[styles.controlButton, { backgroundColor: '#e2e8f0', flex: 1 }]}
                      >
                        <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>Pause</Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={handleReset}
                      style={[styles.controlButton, { backgroundColor: '#fef2f2', borderColor: palette.danger, borderWidth: 1, flex: 1 }]}
                    >
                      <Text style={{ color: palette.danger, fontWeight: '700', fontSize: 16 }}>Reset</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </Card>

          {/* Duration Chips Settings */}
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text style={{ color: palette.text, fontWeight: '700', fontSize: 15 }}>
                Select Session Duration (Minutes)
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
                {[1, 25, 30, 45, 50, 60].map((mins) => {
                  const isSel = durationMinutes === mins;
                  return (
                    <Pressable
                      key={mins}
                      disabled={isRunning}
                      onPress={() => setDurationMinutes(mins)}
                      style={[
                        styles.durationChip,
                        {
                          borderColor: isSel ? palette.primary : palette.border,
                          backgroundColor: isSel ? palette.primary : palette.surface,
                        },
                        isRunning && { opacity: 0.5 },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: '700',
                          color: isSel ? '#ffffff' : palette.text,
                          fontSize: 13,
                        }}
                      >
                        {mins}m
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Card>

          {/* Today's Live Task List */}
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: 16 }}>
              Today{"'"}s Focus Tasks
            </Text>
            <Text style={{ color: palette.mutedText, fontSize: 13 }}>
              Select one task to allocate your focus session. Tasks complete automatically when study time requirements are met.
            </Text>

            <View style={{ gap: spacing.md }}>
              {currentPlan.status === 'submitted' ? (
                <EmptyState
                  title="Day Submitted"
                  description="You have already submitted today's plan to your partner. Study tasks cannot be modified."
                />
              ) : (
                currentTasks.map((task) => {
                  const isCompleted = task.status === 'completed';
                  const isSelected = selectedTaskId === task.id;

                  // Pomodoro stats
                  const estMins = task.estimated_minutes;
                  const compMins = task.completed_minutes;

                  // 1 pomodoro = 25 minutes
                  const estPomodoros = Math.ceil(estMins / 25);
                  const completedPomodoros = task.completed_pomodoros;
                  const remainingPomodoros = Math.max(0, estPomodoros - completedPomodoros);

                  // Progress percent
                  const progressPct = Math.min(100, Math.round((compMins / estMins) * 100));

                  // Determine task state styling
                  let stateLabel = 'Not Started';
                  let badgeColor: string = palette.mutedText;
                  let badgeBg: string = palette.surface;

                  if (isCompleted) {
                    stateLabel = 'Completed';
                    badgeColor = '#16a34a';
                    badgeBg = '#f0fdf4';
                  } else if (completedPomodoros > 0) {
                    stateLabel = 'In Progress';
                    badgeColor = palette.primary;
                    badgeBg = '#e0e7ff';
                  }

                  const handleSelectTask = () => {
                    if (isCompleted) return;
                    if (isRunning && sessionType === 'focus') return;
                    setSelectedTaskId(isSelected ? null : task.id);
                  };

                  return (
                    <Pressable
                      key={task.id}
                      disabled={isCompleted || (isRunning && sessionType === 'focus')}
                      onPress={handleSelectTask}
                      style={[
                        styles.taskCard,
                        {
                          backgroundColor: isSelected ? '#f5f3ff' : palette.surface,
                          borderColor: isSelected
                            ? palette.primary
                            : isCompleted
                            ? '#d1fae5'
                            : palette.border,
                        },
                        isCompleted && { opacity: 0.75 },
                      ]}
                    >
                      <View style={{ gap: spacing.xs }}>
                        {/* Title & Badge */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text
                            style={[
                              styles.taskTitle,
                              { color: palette.text },
                              isCompleted && { textDecorationLine: 'line-through', color: '#94a3b8' },
                            ]}
                            numberOfLines={1}
                          >
                            {task.title}
                          </Text>

                          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: badgeColor }}>
                              {stateLabel}
                            </Text>
                          </View>
                        </View>

                        {/* Pomodoro stats details */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                          <Text style={{ fontSize: 13, color: palette.mutedText }}>
                            🍅 {completedPomodoros} / {estPomodoros} Completed
                          </Text>
                          {!isCompleted && remainingPomodoros > 0 && (
                            <Text style={{ fontSize: 13, color: palette.mutedText, fontWeight: '600' }}>
                              {remainingPomodoros} Remaining
                            </Text>
                          )}
                        </View>

                        {/* Progress Bar */}
                        <View style={{ height: 6, backgroundColor: palette.border, borderRadius: radius.full, marginTop: 4, overflow: 'hidden' }}>
                          <View
                            style={{
                              width: `${progressPct}%`,
                              height: '100%',
                              backgroundColor: isCompleted ? '#10b981' : palette.primary,
                              borderRadius: radius.full,
                            }}
                          />
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  controlButton: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  durationChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
});
