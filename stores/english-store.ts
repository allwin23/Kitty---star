import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import vocabularyData from '@/assets/data/vocabulary.json';

export interface Word {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
}

interface EnglishState {
  lastGeneratedDate: string | null;
  currentWords: Word[];
  usedWordIds: string[];
  writingParagraph: string;
  evaluation: any | null;
  _hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  initializeDailyWords: () => void;
  setWritingParagraph: (paragraph: string) => void;
  setEvaluation: (evalData: any | null) => void;
  resetDailyWords: () => void;
}

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
      _hasHydrated: false,

      setHasHydrated: (val: boolean) => set({ _hasHydrated: val }),

      initializeDailyWords: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { lastGeneratedDate, currentWords, usedWordIds } = get();

        // Already have 5 words for today — no change needed
        if (lastGeneratedDate === todayStr && currentWords.length === 5) return;

        const { selected, newUsedWordIds } = pickTodayWords(usedWordIds);

        set({
          lastGeneratedDate: todayStr,
          currentWords: selected,
          usedWordIds: newUsedWordIds,
          writingParagraph: '',
          evaluation: null,
        });
      },

      setWritingParagraph: (paragraph: string) => set({ writingParagraph: paragraph }),

      setEvaluation: (evalData: any | null) => set({ evaluation: evalData }),

      resetDailyWords: () => {
        // Clear used pool and immediately pick fresh words for today
        const { selected, newUsedWordIds } = pickTodayWords([]);
        const todayStr = new Date().toISOString().split('T')[0];
        set({
          lastGeneratedDate: todayStr,
          currentWords: selected,
          usedWordIds: newUsedWordIds,
          writingParagraph: '',
          evaluation: null,
        });
      },
    }),
    {
      name: 'english-learning-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        // Mark hydration complete so UI can wait before computing `todayWordIds`
        state?.setHasHydrated(true);
      },
    }
  )
);
