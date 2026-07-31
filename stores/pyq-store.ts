import { create } from 'zustand';

interface PyqState {
  usedQuestionIds: string[];
  addUsedQuestionIds: (ids: string[]) => void;
  clearUsedQuestionIds: () => void;
}

export const usePyqStore = create<PyqState>((set) => ({
  usedQuestionIds: [],
  addUsedQuestionIds: (ids) =>
    set((state) => ({
      usedQuestionIds: Array.from(new Set([...state.usedQuestionIds, ...ids])),
    })),
  clearUsedQuestionIds: () => set({ usedQuestionIds: [] }),
}));
