import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';
import vocabularyData from '@/assets/data/vocabulary.json';
import { useAuthStore } from './auth-store';

export interface Word {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
}

interface UserState {
  lastGeneratedDate: string | null;
  currentWords: Word[];
  usedWordIds: string[];
  writingParagraph: string;
  evaluation: any | null;
}

interface EnglishState extends UserState {
  userStates: Record<string, UserState>;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  initializeDailyWords: () => void;
  setWritingParagraph: (paragraph: string) => void;
  setEvaluation: (evalData: any | null) => void;
  resetDailyWords: () => void;
  syncUser: (userId: string | null) => void;
}

const defaultUserState: UserState = {
  lastGeneratedDate: null,
  currentWords: [],
  usedWordIds: [],
  writingParagraph: '',
  evaluation: null,
};

function pickTodayWords(usedWordIds: string[]): { selected: Word[]; newUsedWordIds: string[] } {
  const available = vocabularyData.filter((w) => !usedWordIds.includes(w.id));
  let selected: Word[] = [];

  if (available.length >= 5) {
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    selected = shuffled.slice(0, 5);
  } else {
    // Pool exhausted — use whatever's left, then refill from the full set (excluding just-picked)
    selected = [...available];
    const remainingNeeded = 5 - selected.length;
    const refillPool = vocabularyData.filter((w) => !selected.some((s) => s.id === w.id));
    const shuffled = [...refillPool].sort(() => 0.5 - Math.random());
    selected = [...selected, ...shuffled.slice(0, remainingNeeded)];
  }

  const newUsedWordIds = Array.from(new Set([...usedWordIds, ...selected.map((w) => w.id)]));
  return { selected, newUsedWordIds };
}

export const useEnglishStore = create<EnglishState>()(
  persist(
    (set, get) => ({
      lastGeneratedDate: null,
      currentWords: [],
      usedWordIds: [],
      writingParagraph: '',
      evaluation: null,
      userStates: {},
      _hasHydrated: false,

      setHasHydrated: (val: boolean) => set({ _hasHydrated: val }),

      initializeDailyWords: () => {
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const { lastGeneratedDate, currentWords, usedWordIds, userStates = {} } = get();

        // Already have 5 words for today — no change needed
        if (lastGeneratedDate === todayStr && currentWords.length === 5) return;

        const { selected, newUsedWordIds } = pickTodayWords(usedWordIds);

        const updatedUserState = {
          lastGeneratedDate: todayStr,
          currentWords: selected,
          usedWordIds: newUsedWordIds,
          writingParagraph: '',
          evaluation: null,
        };

        set({
          ...updatedUserState,
          userStates: {
            ...userStates,
            [userId]: updatedUserState,
          },
        });
      },

      setWritingParagraph: (paragraph: string) => {
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        const { userStates = {} } = get();
        const currentUserState = userStates[userId] || {
          lastGeneratedDate: get().lastGeneratedDate,
          currentWords: get().currentWords,
          usedWordIds: get().usedWordIds,
          writingParagraph: get().writingParagraph,
          evaluation: get().evaluation,
        };

        const updatedUserState = {
          ...currentUserState,
          writingParagraph: paragraph,
        };

        set({
          writingParagraph: paragraph,
          userStates: {
            ...userStates,
            [userId]: updatedUserState,
          },
        });
      },

      setEvaluation: (evalData: any | null) => {
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        const { userStates = {} } = get();
        const currentUserState = userStates[userId] || {
          lastGeneratedDate: get().lastGeneratedDate,
          currentWords: get().currentWords,
          usedWordIds: get().usedWordIds,
          writingParagraph: get().writingParagraph,
          evaluation: get().evaluation,
        };

        const updatedUserState = {
          ...currentUserState,
          evaluation: evalData,
        };

        set({
          evaluation: evalData,
          userStates: {
            ...userStates,
            [userId]: updatedUserState,
          },
        });
      },

      resetDailyWords: () => {
        const userId = useAuthStore.getState().user?.id || 'anonymous';
        const { userStates = {} } = get();
        const { selected, newUsedWordIds } = pickTodayWords([]);
        const todayStr = new Date().toISOString().split('T')[0];

        const updatedUserState = {
          lastGeneratedDate: todayStr,
          currentWords: selected,
          usedWordIds: newUsedWordIds,
          writingParagraph: '',
          evaluation: null,
        };

        set({
          ...updatedUserState,
          userStates: {
            ...userStates,
            [userId]: updatedUserState,
          },
        });
      },

      syncUser: (userId: string | null) => {
        const targetId = userId || 'anonymous';
        const { userStates = {} } = get();
        const userState = userStates[targetId] || defaultUserState;

        set({
          lastGeneratedDate: userState.lastGeneratedDate,
          currentWords: userState.currentWords,
          usedWordIds: userState.usedWordIds,
          writingParagraph: userState.writingParagraph,
          evaluation: userState.evaluation,
        });
      },
    }),
    {
      name: 'english-learning-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete so UI can wait before computing `todayWordIds`
        state?.setHasHydrated(true);
        if (state) {
          const userId = useAuthStore.getState().user?.id || null;
          state.syncUser(userId);
        }
      },
    }
  )
);

// Subscribe to auth changes to dynamically sync the English store for the logged-in user
useAuthStore.subscribe((state) => {
  const userId = state.user?.id || null;
  useEnglishStore.getState().syncUser(userId);
});
