import { create } from 'zustand';

interface LocalSchedule {
  card_id: string;
  next_review: string;
  last_review: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
}

interface FlashcardState {
  localSchedules: Record<string, LocalSchedule>;
  reviewCardLocally: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  clearLocalSchedules: () => void;
}

export const useFlashcardStore = create<FlashcardState>((set) => ({
  localSchedules: {},
  reviewCardLocally: (cardId, rating) =>
    set((state) => {
      const existing = state.localSchedules[cardId] ?? {
        card_id: cardId,
        next_review: new Date().toISOString(),
        last_review: new Date().toISOString(),
        ease_factor: 2.5,
        interval_days: 0,
        repetitions: 0,
      };

      let ease = existing.ease_factor;
      let interval = existing.interval_days;
      let reps = existing.repetitions;

      if (rating === 'again') {
        ease = Math.max(1.3, ease - 0.2);
        interval = 0;
        reps = 0;
      } else if (rating === 'hard') {
        ease = Math.max(1.3, ease - 0.15);
        interval = reps === 0 ? 1 : reps === 1 ? 3 : Math.ceil(interval * 1.2);
        reps += 1;
      } else if (rating === 'good') {
        interval = reps === 0 ? 1 : reps === 1 ? 4 : Math.ceil(interval * ease);
        reps += 1;
      } else if (rating === 'easy') {
        ease = Math.min(3.0, ease + 0.15);
        interval = reps === 0 ? 4 : reps === 1 ? 8 : Math.ceil(interval * ease * 1.3);
        reps += 1;
      }

      const nextReview = new Date();
      if (interval === 0) {
        nextReview.setMinutes(nextReview.getMinutes() + 10); // review again in 10 minutes
      } else {
        nextReview.setDate(nextReview.getDate() + interval);
      }

      return {
        localSchedules: {
          ...state.localSchedules,
          [cardId]: {
            card_id: cardId,
            next_review: nextReview.toISOString(),
            last_review: new Date().toISOString(),
            ease_factor: ease,
            interval_days: interval,
            repetitions: reps,
          },
        },
      };
    }),
  clearLocalSchedules: () => set({ localSchedules: {} }),
}));
