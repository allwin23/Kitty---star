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
  initializeDailyWords: () => void;
  setWritingParagraph: (paragraph: string) => void;
  setEvaluation: (evalData: any | null) => void;
  resetDailyWords: () => void;
}

export const useEnglishStore = create<EnglishState>()(
  persist(
    (set, get) => ({
      lastGeneratedDate: null,
      currentWords: [],
      usedWordIds: [],
      writingParagraph: '',
      evaluation: null,

      initializeDailyWords: () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const { lastGeneratedDate, currentWords, usedWordIds } = get();

        // If today's words are already generated and contain 5 words, keep them
        if (lastGeneratedDate === todayStr && currentWords.length === 5) {
          return;
        }

        // Rotate words
        let available = vocabularyData.filter((w) => !usedWordIds.includes(w.id));
        let selected: Word[] = [];

        if (available.length >= 5) {
          const shuffled = [...available].sort(() => 0.5 - Math.random());
          selected = shuffled.slice(0, 5);
        } else {
          selected = [...available];
          const remainingNeeded = 5 - selected.length;
          
          // Clear usedWordIds (starting a new rotation cycle) but exclude the ones we just picked
          const remainingPool = vocabularyData.filter(
            (w) => !selected.some((s) => s.id === w.id)
          );
          const shuffledRemaining = [...remainingPool].sort(() => 0.5 - Math.random());
          selected = [...selected, ...shuffledRemaining.slice(0, remainingNeeded)];
        }

        const newUsedWordIds = Array.from(
          new Set([...usedWordIds, ...selected.map((w) => w.id)])
        );

        set({
          lastGeneratedDate: todayStr,
          currentWords: selected,
          usedWordIds: newUsedWordIds,
          writingParagraph: '', // Reset paragraph for the new day
          evaluation: null, // Reset evaluation
        });
      },

      setWritingParagraph: (paragraph: string) => {
        set({ writingParagraph: paragraph });
      },

      setEvaluation: (evalData: any | null) => {
        set({ evaluation: evalData });
      },

      resetDailyWords: () => {
        // Force reset and regenerate today's words
        set({ usedWordIds: [] });
        const { initializeDailyWords } = get();
        initializeDailyWords();
      },
    }),
    {
      name: 'english-learning-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
