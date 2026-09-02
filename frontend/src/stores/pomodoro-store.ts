import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { pomodoroService } from '@/services/backend';
import { getCurrentPlan } from '@/services/planner-read.service';
import { todayIso } from '@/lib/supabase-helpers';
import { playChime } from '@/lib/audio';
import { sendWebNotification } from '@/lib/notifications';
import { requestScreenWakeLock, releaseScreenWakeLock } from '@/lib/wake-lock';
import confetti from 'canvas-confetti';

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
  soundEnabled: boolean;
  completedPomodorosToday: number;

  // Actions
  setDurationMinutes: (mins: number) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  setSessionType: (type: PomodoroSessionType) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setFullScreen: (full: boolean) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  tick: () => void;
  syncBackgroundTime: () => void;
  completeCurrentSession: () => Promise<void>;
}

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
      soundEnabled: true,
      completedPomodorosToday: 0,

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
          let mins = 25;
          if (type === 'short_break') mins = 5;
          if (type === 'long_break') mins = 15;
          return {
            sessionType: type,
            durationMinutes: mins,
            timerSeconds: mins * 60,
          };
        }),

      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setFullScreen: (full) => set({ isFullScreen: full }),

      startTimer: () => {
        const state = get();
        if (state.isRunning) return;

        const targetEndTime = Date.now() + state.timerSeconds * 1000;
        set({
          isRunning: true,
          isPaused: false,
          startedAt: new Date().toISOString(),
          targetEndTime,
        });

        if (state.sessionType === 'focus') {
          void requestScreenWakeLock();
        }
      },

      pauseTimer: () => {
        const state = get();
        if (!state.isRunning || state.isPaused) return;

        let remaining = state.timerSeconds;
        if (state.targetEndTime) {
          remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
        }

        set({
          isPaused: true,
          timerSeconds: remaining,
          targetEndTime: null,
        });

        void releaseScreenWakeLock();
      },

      resumeTimer: () => {
        const state = get();
        if (!state.isRunning || !state.isPaused) return;

        const targetEndTime = Date.now() + state.timerSeconds * 1000;
        set({
          isPaused: false,
          targetEndTime,
        });

        if (state.sessionType === 'focus') {
          void requestScreenWakeLock();
        }
      },

      resetTimer: () => {
        const state = get();
        void releaseScreenWakeLock();
        set({
          isRunning: false,
          isPaused: false,
          timerSeconds: state.durationMinutes * 60,
          startedAt: null,
          targetEndTime: null,
        });
      },

      tick: () => {
        const state = get();
        if (!state.isRunning || state.isPaused) return;

        let remaining = state.timerSeconds - 1;
        if (state.targetEndTime) {
          remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
        }

        if (remaining <= 0) {
          void get().completeCurrentSession();
        } else {
          set({ timerSeconds: remaining });
        }
      },

      syncBackgroundTime: () => {
        const state = get();
        if (state.isRunning && !state.isPaused && state.targetEndTime) {
          const remaining = Math.max(0, Math.ceil((state.targetEndTime - Date.now()) / 1000));
          if (remaining <= 0) {
            void get().completeCurrentSession();
          } else {
            set({ timerSeconds: remaining });
          }
        }
      },

      completeCurrentSession: async () => {
        const state = get();
        void releaseScreenWakeLock();

        // Sound & Notifications
        if (state.soundEnabled) {
          if (state.sessionType === 'focus') {
            playChime('pomodoroComplete');
          } else {
            playChime('breakComplete');
          }
        }

        if (state.sessionType === 'focus') {
          sendWebNotification('🍅 Pomodoro Focus Complete!', {
            body: 'Amazing focus! Your study block is logged. Time for a well-deserved break.',
          });
          try {
            confetti({
              particleCount: 80,
              spread: 60,
              origin: { y: 0.6 },
            });
          } catch {
            // Ignore if in headless
          }
        } else {
          sendWebNotification('☕ Break Finished!', {
            body: 'Break time is over! Ready to get back into the study groove?',
          });
        }

        // Auto-log to backend
        try {
          const today = todayIso();
          const plan = await getCurrentPlan(today);
          if (plan?.id) {
            await pomodoroService.complete({
              planId: plan.id,
              taskId: state.selectedTaskId ?? undefined,
              duration: state.durationMinutes,
              sessionType: state.sessionType,
              startedAt: state.startedAt ?? new Date().toISOString(),
              endedAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('[PomodoroStore] Complete backend log warning:', err);
        }

        // Auto transition session
        const nextType: PomodoroSessionType = state.sessionType === 'focus' ? 'short_break' : 'focus';
        const nextMins = nextType === 'focus' ? 25 : 5;

        set({
          isRunning: false,
          isPaused: false,
          sessionType: nextType,
          durationMinutes: nextMins,
          timerSeconds: nextMins * 60,
          startedAt: null,
          targetEndTime: null,
          completedPomodorosToday:
            state.sessionType === 'focus'
              ? state.completedPomodorosToday + 1
              : state.completedPomodorosToday,
        });
      },
    }),
    {
      name: 'kitty-star-pomodoro',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : (null as any))),
      partialize: (state) => ({
        durationMinutes: state.durationMinutes,
        sessionType: state.sessionType,
        selectedTaskId: state.selectedTaskId,
        soundEnabled: state.soundEnabled,
        completedPomodorosToday: state.completedPomodorosToday,
      }),
    },
  ),
);
