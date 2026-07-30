import { create } from 'zustand';

type SettingsStore = Record<string, never>;

export const useSettingsStore = create<SettingsStore>(() => ({}));
