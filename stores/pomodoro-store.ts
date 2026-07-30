import { create } from 'zustand';

type PomodoroStore = Record<string, never>;

export const usePomodoroStore = create<PomodoroStore>(() => ({}));
