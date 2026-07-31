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
}

export const usePomodoroStore = create<PomodoroState>((set) => ({
  durationMinutes: 25,
  timerSeconds: 25 * 60,
  isRunning: false,
  isPaused: false,
  sessionType: 'focus',
  selectedTaskId: null,
  startedAt: null,

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
        // Keep selectedTaskId but it is only active during 'focus'
      };
    }),

  startTimer: () =>
    set((state) => {
      if (state.isRunning) return {};
      return {
        isRunning: true,
        isPaused: false,
        startedAt: new Date().toISOString(),
      };
    }),

  pauseTimer: () =>
    set((state) => {
      if (!state.isRunning || state.isPaused) return {};
      return { isPaused: true };
    }),

  resumeTimer: () =>
    set((state) => {
      if (!state.isRunning || !state.isPaused) return {};
      return { isPaused: false };
    }),

  resetTimer: () =>
    set((state) => ({
      isRunning: false,
      isPaused: false,
      timerSeconds: state.durationMinutes * 60,
      startedAt: null,
    })),

  tick: () =>
    set((state) => {
      if (!state.isRunning || state.isPaused) return {};
      const nextSeconds = state.timerSeconds - 1;
      if (nextSeconds <= 0) {
        return {
          timerSeconds: 0,
        };
      }
      return { timerSeconds: nextSeconds };
    }),

  setTimerSeconds: (seconds) =>
    set((state) => {
      if (state.isRunning) return {};
      return { timerSeconds: seconds };
    }),
}));
