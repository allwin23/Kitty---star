import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  Coffee,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Sun,
  Target,
  Timer,
} from 'lucide-react-native';

import { Button, Card, EmptyState, ErrorState, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';
import { getCurrentPlan } from '@/services/planner-read.service';
import { pomodoroService } from '@/services/backend';
import { useAuthStore, usePomodoroStore, type PomodoroSessionType } from '@/stores';
import { palette, radius, spacing } from '@/theme';

const today = new Date().toISOString().slice(0, 10);

export default function PomodoroScreen() {
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
    }, [currentPlanQ])
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

      const elapsedSeconds = durationMinutes * 60 - timerSeconds;
      const loggedDuration =
        timerSeconds === 0 ? durationMinutes : Math.max(1, Math.floor(elapsedSeconds / 60));

      const pStartedAt = startedAt ?? new Date(Date.now() - loggedDuration * 60000).toISOString();
      const pEndedAt = new Date().toISOString();

      return pomodoroService.complete({
        planId: currentPlan.id,
        taskId: sessionType === 'focus' ? selectedTaskId! : undefined,
        duration: loggedDuration,
        sessionType,
        startedAt: pStartedAt,
        endedAt: pEndedAt,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      void queryClient.invalidateQueries({ queryKey: ['stats'] });
      void queryClient.invalidateQueries({ queryKey: ['journey'] });

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
        Alert.alert('Session Complete!', typeLabel);
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
        <View style={{ gap: spacing[16], alignItems: 'center', width: '100%', paddingHorizontal: spacing[24] }}>
          <EmptyState
            title="No active plan started"
            description="You must start today's plan on the Plan tab before you can use the Pomodoro timer."
          />
          <Button variant="primary" onPress={() => router.push('/(app)/accountability')}>
            Go to Plan tab
          </Button>
        </View>
      </Screen>
    );
  }

  if (currentTasks.length === 0) {
    return (
      <Screen centered>
        <View style={{ gap: spacing[16], alignItems: 'center', width: '100%', paddingHorizontal: spacing[24] }}>
          <EmptyState
            title="No tasks in plan"
            description="Add some tasks on the Plan tab first so you have something to focus on."
          />
          <Button variant="primary" onPress={() => router.push('/(app)/accountability')}>
            Go to Plan tab
          </Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ gap: spacing[24], paddingBottom: 120 }}>
          {/* Header & Mode Tabs */}
          <View style={{ gap: spacing[16] }}>
            <HeaderTitleCard
              title="Study Timer"
              subtitle="Stay focused and track your study sessions"
            />

            <View style={styles.tabsContainer}>
              {(['focus', 'short_break', 'long_break'] as PomodoroSessionType[]).map((type) => {
                const isActive = sessionType === type;
                const IconComponent =
                  type === 'focus'
                    ? Timer
                    : type === 'short_break'
                    ? Coffee
                    : Sun;

                const labelText =
                  type === 'focus'
                    ? 'Focus'
                    : type === 'short_break'
                    ? 'Short Break'
                    : 'Long Break';

                return (
                  <Pressable
                    key={type}
                    disabled={isRunning}
                    onPress={() => setSessionType(type)}
                    style={[
                      styles.tabButton,
                      isActive && styles.activeTabButton,
                      isRunning && { opacity: 0.5 },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <IconComponent
                        size={15}
                        color={isActive ? palette.danger : palette.textSecondary}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: isActive ? palette.danger : palette.textSecondary,
                        }}
                      >
                        {labelText}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Timer Display Card */}
          <Card>
            <View style={{ alignItems: 'center', gap: spacing[16], paddingVertical: spacing[12] }}>
              {sessionType === 'focus' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Target size={16} color={palette.danger} strokeWidth={2.4} />
                  <Text style={{ color: palette.textSecondary, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                    {activeTask
                      ? `Focusing on: "${activeTask.title}"`
                      : 'Select a task below to start focusing'}
                  </Text>
                </View>
              )}

              {/* Huge Timer */}
              <Text
                style={{
                  fontSize: 72,
                  fontWeight: '800',
                  color: isRunning && !isPaused ? palette.danger : palette.textPrimary,
                  fontFamily: "'Martian Mono', monospace",
                  letterSpacing: -1,
                }}
              >
                {formatTime(timerSeconds)}
              </Text>

              {/* Session Controls */}
              <View style={{ flexDirection: 'row', gap: spacing[12], width: '100%', marginTop: spacing[8] }}>
                {!isRunning ? (
                  <Button
                    variant="primary"
                    size="lg"
                    onPress={handleStart}
                    disabled={sessionType === 'focus' && !selectedTaskId}
                    style={{ flex: 1 }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Start Session</Text>
                    </View>
                  </Button>
                ) : (
                  <>
                    {isPaused ? (
                      <Button variant="primary" size="lg" onPress={resumeTimer} style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Resume</Text>
                        </View>
                      </Button>
                    ) : (
                      <Button variant="secondary" size="lg" onPress={pauseTimer} style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Pause size={18} color={palette.danger} strokeWidth={2.4} />
                          <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 16 }}>Pause</Text>
                        </View>
                      </Button>
                    )}

                    <Button variant="destructive" size="lg" onPress={handleReset} style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <RotateCcw size={18} color="#FFFFFF" strokeWidth={2.2} />
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Reset</Text>
                      </View>
                    </Button>
                  </>
                )}
              </View>
            </View>
          </Card>

          {/* Duration Chips Settings */}
          <Card>
            <View style={{ gap: spacing[12] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color={palette.danger} strokeWidth={2.4} />
                <Text style={styles.sectionHeaderTitle}>
                  SELECT SESSION DURATION
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing[8], flexWrap: 'wrap' }}>
                {[1, 25, 30, 45, 50, 60].map((mins) => {
                  const isSel = durationMinutes === mins;
                  return (
                    <Pressable
                      key={mins}
                      disabled={isRunning}
                      onPress={() => setDurationMinutes(mins)}
                      style={[
                        styles.durationChip,
                        isSel && styles.activeDurationChip,
                        isRunning && { opacity: 0.5 },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: '800',
                          color: isSel ? '#FFFFFF' : palette.textPrimary,
                          fontSize: 14,
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

          {/* Glass Card for Today's Focus Tasks Header & Description */}
          <Card>
            <View style={{ gap: spacing[8] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckSquare size={18} color={palette.danger} strokeWidth={2.4} />
                <Text style={styles.sectionHeaderTitle}>
                  TODAY'S FOCUS TASKS
                </Text>
              </View>
              <Text style={{ color: palette.textSecondary, fontSize: 13, lineHeight: 18, fontWeight: '500' }}>
                Select a task to allocate your focus session. Tasks update automatically when study time is logged.
              </Text>
            </View>
          </Card>

          {/* Today's Live Task List Items */}
          <View style={{ gap: spacing[12] }}>
            {currentPlan.status === 'submitted' ? (
              <EmptyState
                title="Day Submitted"
                description="You have already submitted today's plan to your partner."
              />
            ) : (
              currentTasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const isSelected = selectedTaskId === task.id;

                const estMins = task.estimated_minutes;
                const compMins = task.completed_minutes;
                const remainingMins = Math.max(0, estMins - compMins);
                const completedPomodoros = task.completed_pomodoros;

                const progressPct = Math.min(100, Math.round((compMins / estMins) * 100));

                let stateLabel = 'Not Started';
                let badgeColor: string = palette.textSecondary;
                let badgeBg: string = 'rgba(255, 243, 245, 0.85)';

                if (isCompleted || compMins >= estMins) {
                  stateLabel = 'Completed';
                  badgeColor = '#047857';
                  badgeBg = '#D1FAE5';
                } else if (compMins > 0) {
                  stateLabel = 'In Progress';
                  badgeColor = palette.danger;
                  badgeBg = 'rgba(240, 115, 146, 0.15)';
                }

                const handleSelectTask = () => {
                  if (isCompleted || compMins >= estMins) return;
                  if (isRunning && sessionType === 'focus') return;
                  setSelectedTaskId(isSelected ? null : task.id);
                };

                return (
                  <Pressable
                    key={task.id}
                    disabled={isCompleted || compMins >= estMins || (isRunning && sessionType === 'focus')}
                    onPress={handleSelectTask}
                    style={[
                      styles.taskCard,
                      isSelected && styles.selectedTaskCard,
                      (isCompleted || compMins >= estMins) && { opacity: 0.65 },
                    ]}
                  >
                    <View style={{ gap: spacing[8] }}>
                      {/* Title & Badge */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.taskTitle,
                            (isCompleted || compMins >= estMins) && { textDecorationLine: 'line-through', color: palette.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>

                        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {stateLabel === 'Completed' ? (
                              <CheckCircle2 size={11} color={badgeColor} strokeWidth={2.4} />
                            ) : stateLabel === 'In Progress' ? (
                              <Flame size={11} color={badgeColor} strokeWidth={2.4} />
                            ) : (
                              <Clock size={11} color={badgeColor} strokeWidth={2} />
                            )}
                            <Text style={{ fontSize: 11, fontWeight: '800', color: badgeColor }}>
                              {stateLabel}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Pomodoro stats details */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Timer size={14} color={palette.danger} strokeWidth={2.2} />
                          <Text style={{ fontSize: 13, color: palette.textSecondary, fontWeight: '500' }}>
                            {completedPomodoros} session{completedPomodoros === 1 ? '' : 's'} ({compMins}m / {estMins}m)
                          </Text>
                        </View>

                        {!isCompleted && remainingMins > 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} color={palette.textSecondary} strokeWidth={2} />
                            <Text style={{ fontSize: 13, color: palette.textSecondary, fontWeight: '600' }}>
                              {remainingMins} min remaining
                            </Text>
                          </View>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={13} color="#047857" strokeWidth={2.4} />
                            <Text style={{ fontSize: 13, color: '#047857', fontWeight: '800' }}>
                              Goal Met
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Progress Bar */}
                      <View style={{ height: 6, backgroundColor: 'rgba(250, 215, 224, 0.7)', borderRadius: radius.full, marginTop: 4, overflow: 'hidden' }}>
                        <View
                          style={{
                            width: `${progressPct}%`,
                            height: '100%',
                            backgroundColor: isCompleted ? '#10B981' : palette.danger,
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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: palette.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: radius.button,
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing[8],
    alignItems: 'center',
    borderRadius: radius.button,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  durationChip: {
    borderRadius: radius.input,
    borderWidth: 1.5,
    borderColor: 'rgba(250, 215, 224, 0.85)',
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDurationChip: {
    backgroundColor: palette.danger,
    borderColor: palette.danger,
  },
  taskCard: {
    backgroundColor: 'rgba(255, 243, 245, 0.85)',
    borderColor: 'rgba(250, 215, 224, 0.85)',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: spacing[16],
    shadowColor: palette.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  selectedTaskCard: {
    borderColor: palette.danger,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 245, 247, 0.95)',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: spacing[8],
    color: palette.textPrimary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
