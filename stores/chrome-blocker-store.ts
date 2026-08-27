import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ChromeBlockerState {
  isChromeSyncEnabled: boolean;
  blockedCategories: string[];
  customDomains: string[];
  strictMode: boolean;
  activeSessionId: string | null;
  studyEmail: string;
  
  setChromeSyncEnabled: (enabled: boolean) => void;
  setBlockedCategories: (categories: string[]) => void;
  setCustomDomains: (domains: string[]) => void;
  setStrictMode: (strict: boolean) => void;
  setActiveSessionId: (id: string | null) => void;
  setStudyEmail: (email: string) => void;
}

const getStorage = () => AsyncStorage;

export const useChromeBlockerStore = create<ChromeBlockerState>()(
  persist(
    (set) => ({
      isChromeSyncEnabled: false,
      blockedCategories: ['social', 'video'],
      customDomains: [],
      strictMode: false,
      activeSessionId: null,
      studyEmail: '',

      setChromeSyncEnabled: (enabled) => set({ isChromeSyncEnabled: enabled }),
      setBlockedCategories: (categories) => set({ blockedCategories: categories }),
      setCustomDomains: (domains) => set({ customDomains: domains }),
      setStrictMode: (strict) => set({ strictMode: strict }),
      setActiveSessionId: (id) => set({ activeSessionId: id }),
      setStudyEmail: (email) => set({ studyEmail: email }),
    }),
    {
      name: 'chrome-blocker-storage',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);
