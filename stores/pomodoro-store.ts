import { create } from 'zustand';

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
  setScheduledNotifId: (id: string | null) => void;
  syncBackgroundTime: () => void;
}

export const usePomodoroStore = create<PomodoroState>((set, get) => ({
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

  setScheduledNotifId: (id) => set({ scheduledNotifId: id }),

  syncBackgroundTime: () => {
    const { isRunning, isPaused, targetEndTime } = get();
    if (isRunning && !isPaused && targetEndTime) {
      const remaining = Math.max(0, Math.ceil((targetEndTime - Date.now()) / 1000));
      set({ timerSeconds: remaining });
    }
  },
}));
