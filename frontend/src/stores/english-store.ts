import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import vocabularyData from '@/data/vocabulary.json';

export interface Word {
  id: string;
  word: string;
  meaning: string;
  partOfSpeech: string;
  synonyms: string[];
  antonyms: string[];
  example: string;
}

interface EnglishStore {
  currentWords: Word[];
  lastAssignedDate: string | null;
  writingParagraph: string;
  evaluation: any | null;
  initializeDailyWords: () => void;
  setWritingParagraph: (para: string) => void;
  setEvaluation: (evalData: any) => void;
  resetDailyWords: () => void;
}

export const useEnglishStore = create<EnglishStore>()(
  persist(
    (set, get) => ({
      currentWords: [],
      lastAssignedDate: null,
      writingParagraph: '',
      evaluation: null,

      initializeDailyWords: () => {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { lastAssignedDate, currentWords } = get();

        if (lastAssignedDate === todayStr && currentWords.length > 0) {
          return;
        }

        // Pick 3 random words
        const all = vocabularyData as Word[];
        const shuffled = [...all].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        set({
          currentWords: selected,
          lastAssignedDate: todayStr,
          writingParagraph: '',
          evaluation: null,
        });
      },

      setWritingParagraph: (para: string) => set({ writingParagraph: para }),
      setEvaluation: (evalData: any) => set({ evaluation: evalData }),
      resetDailyWords: () => {
        set({ lastAssignedDate: null });
        get().initializeDailyWords();
      },
    }),
    {
      name: 'kitty-english-store',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : (null as any))),
    },
  ),
);
