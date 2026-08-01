import { create } from 'zustand';

export interface GrowthAnimState {
  queuedXp: number;
  queuedLevelUps: number;
  queuedStreakIncrements: number;
  queuedApprovedIncrements: number;
  queuedPomodoroIncrements: number;

  queueXp: (amount: number) => void;
  queueLevelUp: () => void;
  queueStreak: () => void;
  queueApproved: () => void;
  queuePomodoro: () => void;
  consumeQueue: () => {
    xp: number;
    levelUps: number;
    streakIncrements: number;
    approvedIncrements: number;
    pomodoroIncrements: number;
  };
}

export const useGrowthAnimStore = create<GrowthAnimState>((set, get) => ({
  queuedXp: 0,
  queuedLevelUps: 0,
  queuedStreakIncrements: 0,
  queuedApprovedIncrements: 0,
  queuedPomodoroIncrements: 0,

  queueXp: (amount) => set((s) => ({ queuedXp: s.queuedXp + amount })),
  queueLevelUp: () => set((s) => ({ queuedLevelUps: s.queuedLevelUps + 1 })),
  queueStreak: () => set((s) => ({ queuedStreakIncrements: s.queuedStreakIncrements + 1 })),
  queueApproved: () => set((s) => ({ queuedApprovedIncrements: s.queuedApprovedIncrements + 1 })),
  queuePomodoro: () => set((s) => ({ queuedPomodoroIncrements: s.queuedPomodoroIncrements + 1 })),

  consumeQueue: () => {
    const current = {
      xp: get().queuedXp,
      levelUps: get().queuedLevelUps,
      streakIncrements: get().queuedStreakIncrements,
      approvedIncrements: get().queuedApprovedIncrements,
      pomodoroIncrements: get().queuedPomodoroIncrements,
    };
    set({
      queuedXp: 0,
      queuedLevelUps: 0,
      queuedStreakIncrements: 0,
      queuedApprovedIncrements: 0,
      queuedPomodoroIncrements: 0,
    });
    return current;
  },
}));
