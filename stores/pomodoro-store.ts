import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PomodoroSessionType = 'focus' | 'short_break' | 'long_break';

interface PomodoroState {
  durationMinutes: number;
  timerSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  sessionType: PomodoroSessionType;
  selectedTaskId: string | null;
  startedAt: string | null;
  targetEndTime: number | null;
  isFullScreen: boolean;
  scheduledNotifId: string | null;
  hasAutoOpened: boolean;

  // Actions
  setDurationMinutes: (mins: number) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setSessionType: (type: PomodoroSessionType) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  setTimerSeconds: (seconds: number) => void;
  setFullScreen: (full: boolean) => void;
  setHasAutoOpened: (autoOpened: boolean) => void;
  setScheduledNotifId: (id: string | null) => void;
  syncBackgroundTime: () => void;
  checkAndLogExpiredTimer: () => Promise<void>;
}

const getStorage = () => AsyncStorage;

export const usePomodoroStore = create<PomodoroState>()(
  persist(
    (set, get) => ({
      durationMinutes: 25,
      timerSeconds: 25 * 60,
      isRunning: false,
      isPaused: false,
      sessionType: 'focus',
      selectedTaskId: null,
      startedAt: null,
      targetEndTime: null,
      isFullScreen: false,
      scheduledNotifId: null,
      hasAutoOpened: false,

      setDurationMinutes: (mins) =>
        set((state) => {
          if (state.isRunning) return {};
          return {
            durationMinutes: mins,
            timerSeconds: mins * 60,
          };
        }),

      setSelectedTaskId: (taskId) =>
        set((state) => {
          if (state.isRunning && state.sessionType === 'focus') return {};
          return { selectedTaskId: taskId };
        }),

      setSessionType: (type) =>
        set((state) => {
          if (state.isRunning) return {};
          let defaultMins = 25;
          if (type === 'short_break') defaultMins = 5;
          if (type === 'long_break') defaultMins = 15;

          return {
            sessionType: type,
            durationMinutes: defaultMins,
            timerSeconds: defaultMins * 60,
          };
        }),

      startTimer: () =>
        set((state) => {
          if (state.isRunning) return {};
          const targetEndTime = Date.now() + state.timerSeconds * 1000;
          return {
            isRunning: true,
            isPaused: false,
            startedAt: new Date().toISOString(),
            targetEndTime,
            hasAutoOpened: false,
          };
        }),

      pauseTimer: () =>
        set((state) => {
          if (!state.isRunning || state.isPaused) return {};
          let remaining = state.timerSeconds;
          if (state.targetEndTime) {
            remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          }
          return {
            isPaused: true,
            timerSeconds: remaining,
            targetEndTime: null,
          };
        }),

      resumeTimer: () =>
        set((state) => {
          if (!state.isRunning || !state.isPaused) return {};
          const targetEndTime = Date.now() + state.timerSeconds * 1000;
          return {
            isPaused: false,
            targetEndTime,
          };
        }),

      resetTimer: () =>
        set((state) => ({
          isRunning: false,
          isPaused: false,
          timerSeconds: state.durationMinutes * 60,
          startedAt: null,
          targetEndTime: null,
          isFullScreen: false,
          scheduledNotifId: null,
          hasAutoOpened: false,
        })),

      tick: () =>
        set((state) => {
          if (!state.isRunning || state.isPaused) return {};

          let remaining = state.timerSeconds - 1;
          if (state.targetEndTime) {
            remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          }

          if (remaining <= 0) {
            return {
              timerSeconds: 0,
              targetEndTime: null,
            };
          }
          return { timerSeconds: remaining };
        }),

      setTimerSeconds: (seconds) =>
        set((state) => {
          if (state.isRunning) return {};
          return { timerSeconds: seconds };
        }),

      setFullScreen: (full) => set({ isFullScreen: full }),

      setHasAutoOpened: (autoOpened) => set({ hasAutoOpened: autoOpened }),

      setScheduledNotifId: (id) => set({ scheduledNotifId: id }),

      syncBackgroundTime: () => {
        const { isRunning, isPaused, targetEndTime, durationMinutes, checkAndLogExpiredTimer } = get();
        if (isRunning && !isPaused && targetEndTime) {
          const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
          if (remaining <= 0) {
            void checkAndLogExpiredTimer();
          } else {
            set({ timerSeconds: remaining });
          }
        }
        // Safety: if timer expired while in background, auto-reset to prevent crash loop
        if (isRunning && !isPaused && !targetEndTime) {
          set({
            isRunning: false,
            isPaused: false,
            timerSeconds: durationMinutes * 60,
            startedAt: null,
            targetEndTime: null,
            isFullScreen: false,
            scheduledNotifId: null,
            hasAutoOpened: false,
          });
        }
      },

      checkAndLogExpiredTimer: async () => {
        const {
          isRunning,
          isPaused,
          targetEndTime,
          sessionType,
          selectedTaskId,
          startedAt,
          durationMinutes,
          resetTimer,
          scheduledNotifId,
        } = get();
        if (!isRunning || isPaused || !targetEndTime) return;

        const now = Date.now();
        if (now < targetEndTime) return;

        // Set running state to false and targetEndTime to null immediately to prevent duplicate runs
        set({
          isRunning: false,
          isPaused: false,
          targetEndTime: null,
        });

        try {
          const { getCurrentPlan } = await import('@/services/planner-read.service');
          const { pomodoroService } = await import('@/services/backend');
          const { todayIso } = await import('@/lib/supabase-helpers');
          const { queryClient } = await import('@/lib/query-client');
          const { queryKeys } = await import('@/lib/query-keys');
          const { focusLockSyncService } = await import('@/lib/focus-lock-sync');
          const { useChromeBlockerStore } = await import('./chrome-blocker-store');
          const { useGrowthAnimStore } = await import('./growth-anim-store');
          const Notifications = await import('expo-notifications');
          const { Platform, Alert } = await import('react-native');

          const today = todayIso();
          let targetPlan = (await getCurrentPlan(today)) as any;

          if (!targetPlan) {
            // Try auto-creating today's plan if draft exists
            try {
              const { plannerService } = await import('@/services/backend');
              await plannerService.createDailyPlans(today);
              targetPlan = (await getCurrentPlan(today)) as any;
            } catch (e) {
              // Ignore
            }
          }

          if (!targetPlan) {
            console.warn('[PomodoroStore] No active plan found for today.');
            if (scheduledNotifId && Platform.OS !== 'web') {
              try {
                await Notifications.cancelScheduledNotificationAsync(scheduledNotifId);
              } catch (e) {}
            }
            resetTimer();
            return;
          }

          let finalTaskId = selectedTaskId;
          if (sessionType === 'focus' && !finalTaskId && targetPlan.current_tasks.length > 0) {
            const firstTask =
              targetPlan.current_tasks.find((t: any) => t.status !== 'completed') ||
              targetPlan.current_tasks[0];
            if (firstTask) {
              finalTaskId = firstTask.id;
              set({ selectedTaskId: finalTaskId });
            }
          }

          const loggedDuration = durationMinutes;
          const pStartedAt = startedAt ?? new Date(now - loggedDuration * 60000).toISOString();
          const pEndedAt = new Date(targetEndTime).toISOString();

          await pomodoroService.complete({
            planId: targetPlan.id,
            taskId: sessionType === 'focus' ? finalTaskId || targetPlan.current_tasks[0]?.id : undefined,
            duration: loggedDuration,
            sessionType,
            startedAt: pStartedAt,
            endedAt: pEndedAt,
          });

          // Handle focus sync if enabled
          const isChromeSyncEnabled = useChromeBlockerStore.getState().isChromeSyncEnabled;
          if (sessionType === 'focus' && isChromeSyncEnabled) {
            try {
              await focusLockSyncService.completeFocusLockSession();
            } catch (e) {
              console.error('[PomodoroStore] Failed to sync session completion to Supabase:', e);
            }
          }

          // Trigger growth xp
          try {
            useGrowthAnimStore.getState().queuePomodoro();
            useGrowthAnimStore.getState().queueXp(2);
          } catch (e) {}

          // Emit global notification event if possible
          try {
            const { useAuthStore } = await import('./auth-store');
            const user = useAuthStore.getState().user;
            if (user?.id) {
              const { EventBus } = await import('@/features/notifications/event-bus');
              const activeTask = targetPlan.current_tasks.find((t: any) => t.id === finalTaskId);
              EventBus.emit({
                type: sessionType === 'focus' ? 'SessionEnded' : 'BreakReminder',
                userId: user.id,
                targetId: `pomo-${Date.now()}`,
                data: {
                  taskTitle: activeTask?.title || 'Study Task',
                  duration: loggedDuration,
                  xpEarned: 2,
                },
              });
            }
          } catch (e) {}

          if (scheduledNotifId && Platform.OS !== 'web') {
            try {
              await Notifications.cancelScheduledNotificationAsync(scheduledNotifId);
            } catch (e) {}
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

          // Invalidate queries to update tasks list, dashboard, stats, achievements
          void queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.reports });
          void queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
          void queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
          void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });

        } catch (error) {
          console.error('[PomodoroStore] Error auto-logging background pomodoro completion:', error);
          if (scheduledNotifId) {
            try {
              const Notifications = await import('expo-notifications');
              const { Platform } = await import('react-native');
              if (Platform.OS !== 'web') {
                await Notifications.cancelScheduledNotificationAsync(scheduledNotifId);
              }
            } catch (e) {}
          }
          resetTimer();
        }
      },
    }),
    {
      name: 'pomodoro-timer-storage',
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({
        durationMinutes: state.durationMinutes,
        timerSeconds: state.timerSeconds,
        isRunning: state.isRunning,
        isPaused: state.isPaused,
        sessionType: state.sessionType,
        selectedTaskId: state.selectedTaskId,
        startedAt: state.startedAt,
        targetEndTime: state.targetEndTime,
        scheduledNotifId: state.scheduledNotifId,
        hasAutoOpened: state.hasAutoOpened,
      }),
      onRehydrateStorage: () => (state) => {
        // On app startup: if the persisted state has isRunning=true but timerSeconds<=0,
        // it means the app was killed mid-session after the timer expired. Log the completed session.
        if (state && state.isRunning && state.timerSeconds <= 0) {
          setTimeout(() => {
            void usePomodoroStore.getState().checkAndLogExpiredTimer();
          }, 200);
        }
        // Also check: if targetEndTime is in the past, compute remaining and reset if expired
        if (state && state.isRunning && !state.isPaused && state.targetEndTime) {
          const remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          if (remaining <= 0) {
            setTimeout(() => {
              void usePomodoroStore.getState().checkAndLogExpiredTimer();
            }, 200);
          } else {
            usePomodoroStore.setState({ timerSeconds: remaining });
          }
        }
      },
    },
  ),
);
