import { create } from 'zustand';

type PlannerStore = Record<string, never>;

export const usePlannerStore = create<PlannerStore>(() => ({}));
