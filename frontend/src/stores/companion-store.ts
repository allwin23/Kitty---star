import { create } from 'zustand';

export interface CompanionScenario {
  id: string;
  tag: '[TOOL]' | '[NOTIFICATION]' | '[PARTNER]' | '[ROUTINE]' | '[IDLE]';
  headline: string;
  subtext: string;
  imageSrc: string;
  emotion: 'happy' | 'focused' | 'proud' | 'sleepy' | 'strict';
}

const DEFAULT_SCENARIOS: CompanionScenario[] = [
  {
    id: 'welcome-cat',
    tag: '[ROUTINE]',
    headline: 'Welcome back to StudyPartner!',
    subtext: 'Kitty is ready to study with you today. What are your focus goals?',
    imageSrc: '/assets/images/companion/cat_studying_pomodoro.png',
    emotion: 'happy',
  },
  {
    id: 'focus-cat',
    tag: '[TOOL]',
    headline: 'Deep Work Session',
    subtext: 'Time to put distractions aside and lock in for a 25-minute Pomodoro sprint.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 174940.png',
    emotion: 'focused',
  },
  {
    id: 'partner-cat',
    tag: '[PARTNER]',
    headline: 'Partner Accountability Check',
    subtext: 'Study together, submit your daily evidence, and keep the streak burning!',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 175031.png',
    emotion: 'proud',
  },
  {
    id: 'hydration-cat',
    tag: '[ROUTINE]',
    headline: 'Hydration Reminder',
    subtext: 'Stay hydrated while you study. Log your water intake to keep your mind energized.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 174946.png',
    emotion: 'happy',
  },
  {
    id: 'flashcard-cat',
    tag: '[TOOL]',
    headline: 'Spaced Repetition SM-2',
    subtext: 'Quick flashcard revisions solidify memories right before you forget them.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 175012.png',
    emotion: 'focused',
  },
  {
    id: 'writing-cat',
    tag: '[TOOL]',
    headline: 'Daily English & AI Writing',
    subtext: 'Practice grammar quizzes and write sample essays evaluated by Gemini AI.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 174956.png',
    emotion: 'happy',
  },
  {
    id: 'practice-cat',
    tag: '[TOOL]',
    headline: 'PYQ Mock Exams',
    subtext: 'Timed previous year question simulations give you genuine exam stamina.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 175001.png',
    emotion: 'strict',
  },
  {
    id: 'urge-cat',
    tag: '[ROUTINE]',
    headline: 'Dopamine Detox & Urge Control',
    subtext: 'Feeling distracted? Roll the 3D dice for a quick reset exercise.',
    imageSrc: '/assets/images/companion/Screenshot 2026-08-01 180447.png',
    emotion: 'happy',
  },
];

interface CompanionStore {
  activeScenario: CompanionScenario;
  scenarioIndex: number;
  scenarios: CompanionScenario[];
  nextScenario: () => void;
  prevScenario: () => void;
  setScenarioByTag: (tag: CompanionScenario['tag']) => void;
}

export const useCompanionStore = create<CompanionStore>((set, get) => ({
  activeScenario: DEFAULT_SCENARIOS[0],
  scenarioIndex: 0,
  scenarios: DEFAULT_SCENARIOS,

  nextScenario: () => {
    const { scenarios, scenarioIndex } = get();
    const nextIdx = (scenarioIndex + 1) % scenarios.length;
    set({
      scenarioIndex: nextIdx,
      activeScenario: scenarios[nextIdx],
    });
  },

  prevScenario: () => {
    const { scenarios, scenarioIndex } = get();
    const prevIdx = (scenarioIndex - 1 + scenarios.length) % scenarios.length;
    set({
      scenarioIndex: prevIdx,
      activeScenario: scenarios[prevIdx],
    });
  },

  setScenarioByTag: (tag) => {
    const { scenarios } = get();
    const match = scenarios.find((s) => s.tag === tag);
    if (match) {
      const idx = scenarios.indexOf(match);
      set({ activeScenario: match, scenarioIndex: idx });
    }
  },
}));
