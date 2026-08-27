import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Notifications from 'expo-notifications';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  CheckSquare,
  Clock,
  Coffee,
  Flame,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  Target,
  Timer,
} from 'lucide-react-native';

import { Button, Card, EmptyState, ErrorState, HeaderTitleCard, Loading, Screen } from '@/components/ui';
import { queryKeys } from '@/lib/query-keys';
import { getCurrentPlan } from '@/services/planner-read.service';
import { pomodoroService, plannerService } from '@/services/backend';
import { useAuthStore, usePomodoroStore, type PomodoroSessionType } from '@/stores';
import { useGrowthAnimStore } from '@/stores/growth-anim-store';
import { EventBus } from '@/features/notifications/event-bus';
import { palette, radius, spacing } from '@/theme';

import { todayIso } from '@/lib/supabase-helpers';

/** Schedule local push notification when timer completes */
const scheduleLocalFinishNotification = async (
  taskTitle: string,
  sessionType: PomodoroSessionType,
  seconds: number
) => {
  try {
    if (Platform.OS === 'web') return null;
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== 'granted') return null;
    }

    const title =
      sessionType === 'focus' ? '🍅 Pomodoro Focus Complete!' : '☕ Break Finished!';
    const body =
      sessionType === 'focus'
        ? `Great job! You finished your focus session for "${taskTitle}".`
        : 'Break time is over! Ready to jump back into focus?';

    const notifId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.floor(seconds)),
      },
    });
    return notifId;
  } catch (err) {
    console.warn('[Pomodoro] Local notification schedule error:', err);
    return null;
  }
};

/** Cancel scheduled local notification */
const cancelLocalNotification = async (notifId: string | null) => {
  if (!notifId || Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notifId);
  } catch (err) {
    // Ignored
  }
};

/** Aesthetic Flip Clock Digit Card Display for Full-Screen Mode */
function AestheticFlipClock({ seconds, isPaused }: { seconds: number; isPaused: boolean }) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const hrsStr = hrs > 0 ? pad(hrs) : null;
  const minsStr = pad(mins);
  const secsStr = pad(secs);

  return (
    <View style={flipStyles.clockContainer}>
      {hrsStr ? (
        <>
          <View style={flipStyles.flipCard}>
            <View style={flipStyles.splitLine} />
            <Text style={flipStyles.flipText}>{hrsStr}</Text>
          </View>
          <Text style={flipStyles.colonText}>:</Text>
        </>
      ) : null}

      <View style={flipStyles.flipCard}>
        <View style={flipStyles.splitLine} />
        <Text style={flipStyles.flipText}>{minsStr}</Text>
      </View>

      <Text style={[flipStyles.colonText, isPaused && { opacity: 0.5 }]}>:</Text>

      <View style={flipStyles.flipCard}>
        <View style={flipStyles.splitLine} />
        <Text style={flipStyles.flipText}>{secsStr}</Text>
      </View>
    </View>
  );
}

const flipStyles = StyleSheet.create({
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 18,
  },
  flipCard: {
    width: 95,
    height: 105,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    borderColor: 'rgba(232, 77, 114, 0.35)',
    borderWidth: 1.5,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 4,
  },
  splitLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#000000',
    opacity: 0.4,
    zIndex: 5,
  },
  flipText: {
    fontSize: 50,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: "'Martian Mono', monospace",
    letterSpacing: -1,
  },
  colonText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#E84D72',
    marginHorizontal: 2,
  },
});

export default function PomodoroScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [completing, setCompleting] = useState(false);
  const today = todayIso();

  // Load today's live plan
  const currentPlanQ = useQuery({
    queryKey: queryKeys.currentPlan(today),
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  useFocusEffect(
    useCallback(() => {
      void currentPlanQ.refetch();
      usePomodoroStore.getState().syncBackgroundTime();
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
    isFullScreen,
    scheduledNotifId,
    hasAutoOpened,
    tick,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setSelectedTaskId,
    setSessionType,
    setDurationMinutes,
    setFullScreen,
    setHasAutoOpened,
    setScheduledNotifId,
    syncBackgroundTime,
  } = usePomodoroStore();

  // Active task object
  const activeTask = currentTasks.find((t) => t.id === selectedTaskId);

  // Auto-select first active pending task if none selected, or reset if completed/removed
  useEffect(() => {
    if (currentPlan && currentTasks.length > 0) {
      const activePending = currentTasks.find((t) => t.status !== 'completed');
      if (selectedTaskId) {
        const task = currentTasks.find((t) => t.id === selectedTaskId);
        if (!task || task.status === 'completed') {
          setSelectedTaskId(activePending?.id ?? null);
        }
      } else if (activePending) {
        setSelectedTaskId(activePending.id);
      }
    }
  }, [currentTasks, selectedTaskId, setSelectedTaskId, currentPlan]);

  // AppState listener for background / inactive app time sync
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncBackgroundTime();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [syncBackgroundTime]);

  // 3-Second delay timer -> automatically open Full-Screen Running View ONLY ONCE per session
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    if (isRunning && !isPaused && !hasAutoOpened && !isFullScreen) {
      timeout = setTimeout(() => {
        setFullScreen(true);
        setHasAutoOpened(true);
      }, 3000);
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isRunning, isPaused, hasAutoOpened, isFullScreen, setFullScreen, setHasAutoOpened]);

  // User explicit "Run in Background" handler
  const handleRunInBackground = () => {
    setFullScreen(false);
    setHasAutoOpened(true);
  };

  // Keep screen active (prevent screen timeout) when in Full-Screen View
  useEffect(() => {
    if (Platform.OS !== 'web' && isFullScreen) {
      void activateKeepAwakeAsync('pomodoro-keep-awake-tag').catch(() => {});
    } else if (Platform.OS !== 'web') {
      void deactivateKeepAwake('pomodoro-keep-awake-tag').catch(() => {});
    }
    return () => {
      if (Platform.OS !== 'web') {
        void deactivateKeepAwake('pomodoro-keep-awake-tag').catch(() => {});
      }
    };
  }, [isFullScreen]);

  // Complete pomodoro session mutation
  const completeMutation = useMutation({
    mutationFn: async () => {
      let targetPlan = currentPlan;
      if (!targetPlan) {
        // Try fetching active plan directly
        targetPlan = (await getCurrentPlan(today)) as typeof currentPlan;
        if (!targetPlan) {
          // Try auto-creating today's plan if draft exists
          try {
            await plannerService.createDailyPlans(today);
            targetPlan = (await getCurrentPlan(today)) as typeof currentPlan;
          } catch (e) {
            // Ignored, will throw fallback error below
          }
        }
      }

      if (!targetPlan) throw new Error('No active plan found for today.');
      if (sessionType === 'focus' && !selectedTaskId && targetPlan.current_tasks.length > 0) {
        // Auto-fallback to first task if none explicitly selected
        const firstTask = targetPlan.current_tasks.find((t) => t.status !== 'completed') || targetPlan.current_tasks[0];
        if (firstTask) setSelectedTaskId(firstTask.id);
      }

      const elapsedSeconds = durationMinutes * 60 - timerSeconds;
      const loggedDuration =
        timerSeconds === 0 ? durationMinutes : Math.max(1, Math.floor(elapsedSeconds / 60));

      const pStartedAt = startedAt ?? new Date(Date.now() - loggedDuration * 60000).toISOString();
      const pEndedAt = new Date().toISOString();

      return pomodoroService.complete({
        planId: targetPlan.id,
        taskId: sessionType === 'focus' ? selectedTaskId || targetPlan.current_tasks[0]?.id : undefined,
        duration: loggedDuration,
        sessionType,
        startedAt: pStartedAt,
        endedAt: pEndedAt,
      });
    },
    onSuccess: async () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
      void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      const mins = Math.max(1, durationMinutes);
      useGrowthAnimStore.getState().queuePomodoro();
      useGrowthAnimStore.getState().queueXp(mins * 2);
      if (user?.id) {
        EventBus.emit({
          type: sessionType === 'focus' ? 'SessionEnded' : 'BreakReminder',
          userId: user.id,
          targetId: `pomo-${Date.now()}`,
          data: {
            taskTitle: activeTask?.title || 'Study Task',
            duration: mins,
            xpEarned: mins * 2,
          },
        });
      }

      if (scheduledNotifId) {
        await cancelLocalNotification(scheduledNotifId);
      }

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
        Alert.alert('Session Complete! 🍅', typeLabel);
      }
    },
    onError: (e: Error) => {
      if (scheduledNotifId) {
        void cancelLocalNotification(scheduledNotifId);
      }
      resetTimer();
      if (Platform.OS === 'web') {
        window.alert(`Failed to save session: ${e.message}`);
      } else {
        Alert.alert('Session Reset', `Could not log session: ${e.message}`);
      }
    },
  });

  const handleComplete = useCallback(
    async (isAuto = false) => {
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
    },
    [completing, completeMutation]
  );

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

  const handleStart = async () => {
    if (sessionType === 'focus' && !selectedTaskId) {
      const msg = 'Please select a task from the list below before starting your focus session.';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Select a task', msg);
      }
      return;
    }
    if (user?.id) {
      EventBus.emit({
        type: 'SessionStarted',
        userId: user.id,
        targetId: `start-${Date.now()}`,
        data: {
          taskTitle: activeTask?.title || 'Study Session',
        },
      });
    }
    startTimer();

    // Schedule local device notification for session completion
    const notifId = await scheduleLocalFinishNotification(
      activeTask?.title || 'Study Session',
      sessionType,
      timerSeconds
    );
    setScheduledNotifId(notifId);
  };

  const handlePause = async () => {
    pauseTimer();
    if (scheduledNotifId) {
      await cancelLocalNotification(scheduledNotifId);
      setScheduledNotifId(null);
    }
  };

  const handleResume = async () => {
    resumeTimer();
    const notifId = await scheduleLocalFinishNotification(
      activeTask?.title || 'Study Session',
      sessionType,
      timerSeconds
    );
    setScheduledNotifId(notifId);
  };

  const handleReset = async () => {
    const title = 'Reset timer?';
    const msg = 'Are you sure you want to discard this timer session?';
    const performReset = async () => {
      if (scheduledNotifId) {
        await cancelLocalNotification(scheduledNotifId);
      }
      resetTimer();
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${msg}`)) {
        void performReset();
      }
    } else {
      Alert.alert(title, msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => void performReset() },
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
          <Button variant="white" size="lg" onPress={() => router.push('/(app)/accountability')}>
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
          <Button variant="white" size="lg" onPress={() => router.push('/(app)/accountability')}>
            Go to Plan tab
          </Button>
        </View>
      </Screen>
    );
  }

  const totalDurationSecs = Math.max(1, durationMinutes * 60);
  const progressPct = Math.min(100, Math.max(0, ((totalDurationSecs - timerSeconds) / totalDurationSecs) * 100));

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

            {/* Background running mini banner */}
            {isRunning && !isFullScreen && (
              <Pressable
                onPress={() => setFullScreen(true)}
                style={styles.runningBanner}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={styles.livePulseDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                      Timer Running in Background ({formatTime(timerSeconds)})
                    </Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: 11, fontWeight: '600' }}>
                      Tap to open full-screen mode & keep screen active
                    </Text>
                  </View>
                </View>
                <Maximize2 size={16} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>
            )}

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
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  fontSize: 56,
                  fontWeight: '800',
                  color: isRunning && !isPaused ? palette.danger : palette.textPrimary,
                  fontFamily: "'Martian Mono', monospace",
                  letterSpacing: -1,
                  textAlign: 'center',
                }}
              >
                {formatTime(timerSeconds)}
              </Text>

              {/* Session Controls */}
              <View style={{ flexDirection: 'row', gap: spacing[12], width: '100%', marginTop: spacing[8] }}>
                {!isRunning ? (
                  <Pressable
                    disabled={sessionType === 'focus' && !selectedTaskId}
                    onPress={handleStart}
                    style={({ pressed }) => [
                      styles.primaryActionBtn,
                      sessionType === 'focus' && !selectedTaskId && { opacity: 0.5 },
                      pressed && { opacity: 0.88 },
                    ]}
                  >
                    <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Start Session</Text>
                  </Pressable>
                ) : (
                  <>
                    {isPaused ? (
                      <Pressable
                        onPress={handleResume}
                        style={({ pressed }) => [
                          styles.primaryActionBtn,
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        <Play size={18} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                        <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Resume</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={handlePause}
                        style={({ pressed }) => [
                          styles.secondaryActionBtn,
                          pressed && { opacity: 0.88 },
                        ]}
                      >
                        <Pause size={18} color={palette.danger} strokeWidth={2.4} />
                        <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 16 }}>Pause</Text>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={handleReset}
                      style={({ pressed }) => [
                        styles.destructiveActionBtn,
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <RotateCcw size={18} color="#FFFFFF" strokeWidth={2.2} />
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Reset</Text>
                    </Pressable>
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
                {[1, 25, 30, 45, 50, 55, 60].map((mins) => {
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
                const overtimeMins = compMins > estMins ? compMins - estMins : 0;
                const completedPomodoros = task.completed_pomodoros;

                const taskProgressPct = Math.min(100, Math.round((compMins / estMins) * 100));

                let stateLabel = 'Not Started';
                let badgeColor: string = palette.textSecondary;
                let badgeBg: string = 'rgba(255, 243, 245, 0.85)';

                if (isCompleted) {
                  stateLabel = 'Completed';
                  badgeColor = '#047857';
                  badgeBg = '#D1FAE5';
                } else if (overtimeMins > 0) {
                  stateLabel = `Overtime (+${overtimeMins}m)`;
                  badgeColor = '#D97706';
                  badgeBg = '#FEF3C7';
                } else if (compMins > 0) {
                  stateLabel = 'In Progress';
                  badgeColor = palette.danger;
                  badgeBg = 'rgba(240, 115, 146, 0.15)';
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
                      isSelected && styles.selectedTaskCard,
                      isCompleted && { opacity: 0.65 },
                    ]}
                  >
                    <View style={{ gap: spacing[8] }}>
                      {/* Title & Badge */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text
                          style={[
                            styles.taskTitle,
                            isCompleted && { textDecorationLine: 'line-through', color: palette.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {task.title}
                        </Text>

                        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {stateLabel === 'Completed' ? (
                              <CheckCircle2 size={11} color={badgeColor} strokeWidth={2.4} />
                            ) : overtimeMins > 0 ? (
                              <Flame size={11} color={badgeColor} strokeWidth={2.4} />
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
                          <Text style={{ fontSize: 13, color: palette.textSecondary, fontWeight: '600' }}>
                            {completedPomodoros} session{completedPomodoros === 1 ? '' : 's'} ({compMins}/{estMins}m)
                          </Text>
                        </View>

                        {overtimeMins > 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Flame size={13} color="#D97706" strokeWidth={2.4} />
                            <Text style={{ fontSize: 13, color: '#D97706', fontWeight: '800' }}>
                              +{overtimeMins}m Overtime
                            </Text>
                          </View>
                        ) : !isCompleted && remainingMins > 0 ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Clock size={13} color={palette.textSecondary} strokeWidth={2} />
                            <Text style={{ fontSize: 13, color: palette.textSecondary, fontWeight: '600' }}>
                              {remainingMins}m remaining
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
                            width: `${taskProgressPct}%`,
                            height: '100%',
                            backgroundColor: isCompleted ? '#10B981' : overtimeMins > 0 ? '#F59E0B' : palette.danger,
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

      {/* ──────────────────────────────────────────────────────────────────────── */}
      {/* FULL-SCREEN RUNNING TIMER VIEW MODAL */}
      {/* ──────────────────────────────────────────────────────────────────────── */}
      <Modal visible={isFullScreen} animationType="slide" transparent={false} statusBarTranslucent>
        <View style={styles.fullScreenContainer}>
          {/* Top Header Bar */}
          <View style={styles.fullScreenHeaderRow}>
            <Pressable
              onPress={handleRunInBackground}
              style={styles.runInBackgroundBtnTop}
            >
              <ArrowLeft size={16} color="#FFFFFF" strokeWidth={2.4} />
              <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>
                Run in Background
              </Text>
            </Pressable>
          </View>

          {/* Main Hero Content */}
          <View style={styles.fullScreenCenterContent}>
            {/* Session Type Pill */}
            <View style={styles.fullScreenSessionPill}>
              <Text style={{ color: '#E84D72', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {sessionType === 'focus' ? '🍅 FOCUS SESSION' : sessionType === 'short_break' ? '☕ SHORT BREAK' : '🌴 LONG BREAK'}
              </Text>
            </View>

            {/* Task Title */}
            {sessionType === 'focus' && activeTask && (
              <Text style={styles.fullScreenTaskTitle} numberOfLines={2}>
                {activeTask.title}
              </Text>
            )}

            {/* Aesthetic Flip Clock Display */}
            <AestheticFlipClock seconds={timerSeconds} isPaused={isPaused} />

            {/* Live LED Status & Subtitle */}
            <View style={styles.liveLedRow}>
              <View style={[styles.livePulseDot, { backgroundColor: isPaused ? '#F59E0B' : '#10B981' }]} />
              <Text style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 }}>
                {isPaused ? 'TIMER PAUSED' : 'LIVE TIMER RUNNING'}
              </Text>
            </View>

            {/* Progress bar line */}
            <View style={[styles.fullScreenProgressBarTrack, { marginTop: 12 }]}>
              <View style={[styles.fullScreenProgressBarFill, { width: `${progressPct}%` }]} />
            </View>
          </View>

          {/* Bottom Actions: Clean Pause/Resume & Reset Only */}
          <View style={styles.fullScreenBottomContainer}>
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {isPaused ? (
                <Pressable onPress={handleResume} style={[styles.fsMainActionBtn, { backgroundColor: palette.cherryBloom }]}>
                  <Play size={20} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Resume</Text>
                </Pressable>
              ) : (
                <Pressable onPress={handlePause} style={[styles.fsMainActionBtn, { backgroundColor: 'rgba(255, 243, 245, 0.95)', borderColor: 'rgba(232, 77, 114, 0.40)', borderWidth: 1.5 }]}>
                  <Pause size={20} color={palette.danger} strokeWidth={2.4} />
                  <Text style={{ color: palette.danger, fontWeight: '800', fontSize: 16 }}>Pause</Text>
                </Pressable>
              )}

              <Pressable onPress={handleReset} style={[styles.fsMainActionBtn, { backgroundColor: palette.danger }]}>
                <RotateCcw size={20} color="#FFFFFF" strokeWidth={2.2} />
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 16 }}>Reset</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    elevation: 3,
  },
  runningBanner: {
    backgroundColor: '#E84D72',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 6,
  },
  livePulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
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
  primaryActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#C73A57',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  secondaryActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF3F5',
    borderColor: 'rgba(232, 77, 114, 0.40)',
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  destructiveActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D94C61',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },

  /* FULL-SCREEN RUNNING TIMER STYLES */
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#150A10',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  fullScreenHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  runInBackgroundBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keepAwakeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 114, 182, 0.15)',
    borderColor: 'rgba(244, 114, 182, 0.30)',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fullScreenCenterContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginVertical: 12,
  },
  fullScreenSessionPill: {
    backgroundColor: 'rgba(232, 77, 114, 0.18)',
    borderColor: 'rgba(232, 77, 114, 0.40)',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  fullScreenTaskTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  timerRingOuter: {
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(232, 77, 114, 0.10)',
    borderWidth: 3,
    borderColor: 'rgba(232, 77, 114, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  timerRingInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingHorizontal: 12,
  },
  liveLedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fullScreenClockText: {
    fontSize: 46,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  fullScreenProgressBarTrack: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fullScreenProgressBarFill: {
    height: '100%',
    backgroundColor: '#E84D72',
    borderRadius: 3,
  },
  fullScreenBottomContainer: {
    gap: 12,
    width: '100%',
  },
  fsMainActionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fsSecondaryActionBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.20)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runInBackgroundMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderRadius: 26,
    height: 50,
  },
});
