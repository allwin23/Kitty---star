export type CompanionTag = '[TOOL]' | '[NOTIFICATION]' | '[PARTNER]' | '[ROUTINE]' | '[IDLE]';

export interface CatScenario {
  id: string;
  eventType: string;
  tag: CompanionTag;
  headline: string;
  subtext: string;
  imageKey: string;
  imageUri?: string; // High-res generated or fallback URI
  validFromHour?: number; // e.g. 13 for 1 PM
  validToHour?: number;   // e.g. 14 for 2 PM
}

export const CAT_SCENARIOS: Record<string, CatScenario> = {
  ToolPomodoroStarted: {
    id: 'pomo-start',
    eventType: 'ToolPomodoroStarted',
    tag: '[TOOL]',
    headline: 'Focus Mode Activated',
    subtext: 'Timer started! Stay focused and eliminate all study distractions.',
    imageKey: 'cat_studying_pomodoro',
  },
  ToolPomodoroCompleted: {
    id: 'pomo-complete',
    eventType: 'ToolPomodoroCompleted',
    tag: '[TOOL]',
    headline: 'Pomodoro Session Completed',
    subtext: 'Great work finishing your study session! Focus logged to stats.',
    imageKey: 'cat_studying_pomodoro',
  },
  ToolWaterLogged: {
    id: 'water-logged',
    eventType: 'ToolWaterLogged',
    tag: '[TOOL]',
    headline: 'Hydration Logged',
    subtext: 'Refreshing water intake recorded! Keeping your body & brain sharp.',
    imageKey: 'cat_drinking_water',
  },
  ToolEnglishCompleted: {
    id: 'english-completed',
    eventType: 'ToolEnglishCompleted',
    tag: '[TOOL]',
    headline: 'English Writing Evaluated',
    subtext: 'AI writing feedback ready! Vocabulary level and grammar updated.',
    imageKey: 'cat_studying_pomodoro',
  },
  ToolPyqCompleted: {
    id: 'pyq-completed',
    eventType: 'ToolPyqCompleted',
    tag: '[TOOL]',
    headline: 'PYQ Practice Complete',
    subtext: 'Previous year question test finished! Practice makes perfect.',
    imageKey: 'cat_studying_pomodoro',
  },
  ToolFlashcardRevised: {
    id: 'flashcard-revised',
    eventType: 'ToolFlashcardRevised',
    tag: '[TOOL]',
    headline: 'Flashcards Revised',
    subtext: 'Spaced repetition revision finished! Memory retention boosted.',
    imageKey: 'cat_studying_pomodoro',
  },
  ToolTaskCompleted: {
    id: 'task-completed',
    eventType: 'ToolTaskCompleted',
    tag: '[TOOL]',
    headline: 'Task Checked Off',
    subtext: 'Daily goal completed! Progression added to your growth score.',
    imageKey: 'cat_studying_pomodoro',
  },
  NotificationAlert: {
    id: 'notif-alert',
    eventType: 'NotificationAlert',
    tag: '[NOTIFICATION]',
    headline: 'New Notification Received',
    subtext: 'You have a new update! Tap notifications to view details.',
    imageKey: 'cat_studying_pomodoro',
  },
  PartnerStartedFocus: {
    id: 'partner-start',
    eventType: 'PartnerStartedFocus',
    tag: '[PARTNER]',
    headline: 'Partner Focus Session',
    subtext: 'Your study partner just started focusing! Join them in study mode.',
    imageKey: 'cat_studying_pomodoro',
  },
  PartnerCompletedTask: {
    id: 'partner-task',
    eventType: 'PartnerCompletedTask',
    tag: '[PARTNER]',
    headline: 'Partner Task Completed',
    subtext: 'Your study partner completed a task! Keep up the team momentum.',
    imageKey: 'cat_studying_pomodoro',
  },
  PartnerSentAward: {
    id: 'partner-award',
    eventType: 'PartnerSentAward',
    tag: '[PARTNER]',
    headline: 'Partner Award Received',
    subtext: 'Your study partner sent you an award badge! Trophy added to gallery.',
    imageKey: 'cat_studying_pomodoro',
  },
  PartnerSubmittedProof: {
    id: 'partner-proof',
    eventType: 'PartnerSubmittedProof',
    tag: '[PARTNER]',
    headline: 'Daily Proof Submitted',
    subtext: 'Your study partner submitted daily proof for your review.',
    imageKey: 'cat_studying_pomodoro',
  },
  RoutineMorning: {
    id: 'routine-morning',
    eventType: 'RoutineMorning',
    tag: '[ROUTINE]',
    headline: 'Good Morning!',
    subtext: 'Time to wake up, stretch, and allocate today’s focus goals ☀️',
    imageKey: 'cat_studying_pomodoro',
    validFromHour: 6,
    validToHour: 10,
  },
  RoutineLunch: {
    id: 'routine-lunch',
    eventType: 'RoutineLunch',
    tag: '[ROUTINE]',
    headline: 'Lunch Break Time',
    subtext: 'Time to have lunch and recharge your energy! 🍲',
    imageKey: 'cat_studying_pomodoro',
    validFromHour: 13,
    validToHour: 14,
  },
  RoutineEvening: {
    id: 'routine-evening',
    eventType: 'RoutineEvening',
    tag: '[ROUTINE]',
    headline: 'Afternoon Tea Break',
    subtext: 'Take a short breather, grab tea, and stretch a bit ☕',
    imageKey: 'cat_studying_pomodoro',
    validFromHour: 17,
    validToHour: 19,
  },
  RoutineNight: {
    id: 'routine-night',
    eventType: 'RoutineNight',
    tag: '[ROUTINE]',
    headline: 'Cozy Night Hours',
    subtext: 'Quiet time for rest. Get good sleep for tomorrow’s goals 🌙',
    imageKey: 'cat_studying_pomodoro',
    validFromHour: 22,
    validToHour: 5,
  },
  IdleDefault: {
    id: 'idle-default',
    eventType: 'IdleDefault',
    tag: '[IDLE]',
    headline: 'Companion Active',
    subtext: 'Stay steady! Small steps every day lead to great achievements 🐾',
    imageKey: 'cat_studying_pomodoro',
  },
};

export const DYNAMIC_IDLE_POOL: CatScenario[] = [
  {
    id: 'idle-1',
    eventType: 'IdleTip1',
    tag: '[IDLE]',
    headline: 'Study Tip #1',
    subtext: 'Break study goals into 25-minute pomodoro focus sprints 🧠',
    imageKey: 'cat_studying_pomodoro',
  },
  {
    id: 'idle-2',
    eventType: 'IdleTip2',
    tag: '[IDLE]',
    headline: 'Hydration Goal',
    subtext: 'Drink water regularly during study sessions to stay alert 💧',
    imageKey: 'cat_drinking_water',
  },
  {
    id: 'idle-3',
    eventType: 'IdleTip3',
    tag: '[IDLE]',
    headline: 'Spaced Repetition',
    subtext: 'Review flashcards daily for long-term memory retention 📚',
    imageKey: 'cat_studying_pomodoro',
  },
  {
    id: 'idle-4',
    eventType: 'IdleTip4',
    tag: '[IDLE]',
    headline: 'Partner Support',
    subtext: 'Check in on your study partner’s daily tasks and cheer them on 🤝',
    imageKey: 'cat_studying_pomodoro',
  },
  {
    id: 'idle-5',
    eventType: 'IdleTip5',
    tag: '[IDLE]',
    headline: 'Thangooooooooo',
    subtext: 'i love u kuttty maaa',
    imageKey: 'cat_studying_pomodoro',
  },
];
