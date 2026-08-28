import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Question {
  id: string;
  year: number;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  answer: number; // 1-indexed option index
  image?: string;
}

interface PyqQuestionsState {
  customQuestions: Question[];
  deletedSubjects: string[];
  addCustomQuestions: (questions: Question[]) => void;
  deleteSubjectQuestions: (subject: string) => void;
  deleteQuestion: (id: string) => void;
  clearCustomQuestions: () => void;
  deleteSubject: (subjectName: string) => void;
  restoreDeletedSubjects: () => void;
}

export const usePyqQuestionsStore = create<PyqQuestionsState>()(
  persist(
    (set) => ({
      customQuestions: [],
      deletedSubjects: [],
      addCustomQuestions: (newQuestions) =>
        set((state) => {
          // Avoid duplicate question IDs
          const existingIds = new Set(state.customQuestions.map((q) => q.id));
          const filteredNew = newQuestions.filter((q) => !existingIds.has(q.id));
          return {
            customQuestions: [...state.customQuestions, ...filteredNew],
          };
        }),
      deleteSubjectQuestions: (subjectName) =>
        set((state) => ({
          customQuestions: state.customQuestions.filter(
            (q) => q.subject.toLowerCase() !== subjectName.toLowerCase(),
          ),
        })),
      deleteQuestion: (id) =>
        set((state) => ({
          customQuestions: state.customQuestions.filter((q) => q.id !== id),
        })),
      clearCustomQuestions: () => set({ customQuestions: [] }),
      deleteSubject: (subjectName) =>
        set((state) => {
          // 1. Remove it from custom questions if it was an uploaded one
          const remainingCustom = state.customQuestions.filter(
            (q) => q.subject.toLowerCase() !== subjectName.toLowerCase(),
          );
          // 2. Add it to the list of deleted subjects
          const normalized = subjectName.trim();
          const existingDeleted = new Set(state.deletedSubjects.map((s) => s.toLowerCase()));
          const newDeletedList = [...state.deletedSubjects];
          if (!existingDeleted.has(normalized.toLowerCase())) {
            newDeletedList.push(normalized);
          }
          return {
            customQuestions: remainingCustom,
            deletedSubjects: newDeletedList,
          };
        }),
      restoreDeletedSubjects: () => set({ deletedSubjects: [] }),
    }),
    {
      name: 'pyq-custom-questions-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
