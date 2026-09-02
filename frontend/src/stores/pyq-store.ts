import { create } from 'zustand';

interface PyqState {
  activeAttemptId: string | null;
  currentQuestionIndex: number;
  userAnswers: Record<string, { selected: string | null; timeSpent: number }>;
  timeRemainingSeconds: number;
  testActive: boolean;

  setActiveAttempt: (id: string | null, durationMinutes: number) => void;
  selectOption: (questionId: string, option: string) => void;
  setQuestionIndex: (idx: number) => void;
  tickTimer: () => void;
  finishTest: () => void;
}

export const usePyqStore = create<PyqState>((set, get) => ({
  activeAttemptId: null,
  currentQuestionIndex: 0,
  userAnswers: {},
  timeRemainingSeconds: 15 * 60,
  testActive: false,

  setActiveAttempt: (id, durationMinutes) => {
    set({
      activeAttemptId: id,
      currentQuestionIndex: 0,
      userAnswers: {},
      timeRemainingSeconds: durationMinutes * 60,
      testActive: !!id,
    });
  },

  selectOption: (questionId, option) => {
    const current = get().userAnswers[questionId] || { selected: null, timeSpent: 0 };
    set({
      userAnswers: {
        ...get().userAnswers,
        [questionId]: {
          selected: option,
          timeSpent: current.timeSpent,
        },
      },
    });
  },

  setQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),

  tickTimer: () => {
    const { timeRemainingSeconds, testActive } = get();
    if (!testActive) return;
    if (timeRemainingSeconds <= 1) {
      set({ timeRemainingSeconds: 0, testActive: false });
    } else {
      set({ timeRemainingSeconds: timeRemainingSeconds - 1 });
    }
  },

  finishTest: () => set({ testActive: false }),
}));
