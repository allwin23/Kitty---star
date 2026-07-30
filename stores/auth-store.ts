import { create } from 'zustand';

type AuthStore = Record<string, never>;

export const useAuthStore = create<AuthStore>(() => ({}));
