import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CardSchedule {
  interval: number;
  repetition: number;
  efactor: number;
  nextReviewDate: string;
}

interface FlashcardStore {
  localSchedules: Record<string, CardSchedule>;
  reviewCardLocally: (cardId: string, rating: number) => void;
}

export const useFlashcardStore = create<FlashcardStore>()(
  persist(
    (set, get) => ({
      localSchedules: {},
      reviewCardLocally: (cardId: string, rating: number) => {
        const existing = get().localSchedules[cardId] || {
          interval: 0,
          repetition: 0,
          efactor: 2.5,
          nextReviewDate: new Date().toISOString(),
        };

        let { interval, repetition, efactor } = existing;

        if (rating >= 3) {
          if (repetition === 0) interval = 1;
          else if (repetition === 1) interval = 6;
          else interval = Math.round(interval * efactor);
          repetition += 1;
        } else {
          repetition = 0;
          interval = 1;
        }

        efactor = Math.max(1.3, efactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)));

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + interval);

        set({
          localSchedules: {
            ...get().localSchedules,
            [cardId]: {
              interval,
              repetition,
              efactor,
              nextReviewDate: nextDate.toISOString(),
            },
          },
        });
      },
    }),
    {
      name: 'kitty-flashcard-schedules',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? window.localStorage : (null as any))),
    },
  ),
);
