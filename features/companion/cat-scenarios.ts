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
    imageKey: 'Screenshot 2026-08-01 174940',
  },
  ToolWaterLogged: {
    id: 'water-logged',
    eventType: 'ToolWaterLogged',
    tag: '[TOOL]',
    headline: 'Hydration Logged',
    subtext: 'Refreshing water intake recorded! Keeping your body & brain sharp.',
    imageKey: 'Screenshot 2026-08-01 174946',
  },
  ToolEnglishCompleted: {
    id: 'english-completed',
    eventType: 'ToolEnglishCompleted',
    tag: '[TOOL]',
    headline: 'English Writing Evaluated',
    subtext: 'AI writing feedback ready! Vocabulary level and grammar updated.',
    imageKey: 'Screenshot 2026-08-01 174956',
  },
  ToolPyqCompleted: {
    id: 'pyq-completed',
    eventType: 'ToolPyqCompleted',
    tag: '[TOOL]',
    headline: 'PYQ Practice Complete',
    subtext: 'Previous year question test finished! Practice makes perfect.',
    imageKey: 'Screenshot 2026-08-01 175001',
  },
  ToolFlashcardRevised: {
    id: 'flashcard-revised',
    eventType: 'ToolFlashcardRevised',
    tag: '[TOOL]',
    headline: 'Flashcards Revised',
    subtext: 'Spaced repetition revision finished! Memory retention boosted.',
    imageKey: 'Screenshot 2026-08-01 175012',
  },
  ToolTaskCompleted: {
    id: 'task-completed',
    eventType: 'ToolTaskCompleted',
    tag: '[TOOL]',
    headline: 'Task Checked Off',
    subtext: 'Daily goal completed! Progression added to your growth score.',
    imageKey: 'Screenshot 2026-08-01 175017',
  },
  NotificationAlert: {
    id: 'notif-alert',
    eventType: 'NotificationAlert',
    tag: '[NOTIFICATION]',
    headline: 'New Notification Received',
    subtext: 'You have a new update! Tap notifications to view details.',
    imageKey: 'Screenshot 2026-08-01 175024',
  },
  PartnerStartedFocus: {
    id: 'partner-start',
    eventType: 'PartnerStartedFocus',
    tag: '[PARTNER]',
    headline: 'Partner Focus Session',
    subtext: 'Your study partner just started focusing! Join them in study mode.',
    imageKey: 'Screenshot 2026-08-01 175031',
  },
  PartnerCompletedTask: {
    id: 'partner-task',
    eventType: 'PartnerCompletedTask',
    tag: '[PARTNER]',
    headline: 'Partner Task Completed',
    subtext: 'Your study partner completed a task! Keep up the team momentum.',
    imageKey: 'Screenshot 2026-08-01 175038',
  },
  PartnerSentAward: {
    id: 'partner-award',
    eventType: 'PartnerSentAward',
    tag: '[PARTNER]',
    headline: 'Partner Award Received',
    subtext: 'Your study partner sent you an award badge! Trophy added to gallery.',
    imageKey: 'Screenshot 2026-08-01 175038',
  },
  PartnerSubmittedProof: {
    id: 'partner-proof',
    eventType: 'PartnerSubmittedProof',
    tag: '[PARTNER]',
    headline: 'Daily Proof Submitted',
    subtext: 'Your study partner submitted daily proof for your review.',
    imageKey: 'Screenshot 2026-08-01 175038',
  },
  RoutineMorning: {
    id: 'routine-morning',
    eventType: 'RoutineMorning',
    tag: '[ROUTINE]',
    headline: 'Good Morning!',
    subtext: 'Time to wake up, stretch, and allocate today’s focus goals ☀️',
    imageKey: 'Screenshot 2026-08-01 180441',
    validFromHour: 6,
    validToHour: 10,
  },
  RoutineLunch: {
    id: 'routine-lunch',
    eventType: 'RoutineLunch',
    tag: '[ROUTINE]',
    headline: 'Lunch Break Time',
    subtext: 'Time to have lunch and recharge your energy! 🍲',
    imageKey: 'Screenshot 2026-08-01 180447',
    validFromHour: 13,
    validToHour: 14,
  },
  RoutineEvening: {
    id: 'routine-evening',
    eventType: 'RoutineEvening',
    tag: '[ROUTINE]',
    headline: 'Afternoon Tea Break',
    subtext: 'Take a short breather, grab tea, and stretch a bit ☕',
    imageKey: 'Screenshot 2026-08-01 180453',
    validFromHour: 17,
    validToHour: 19,
  },
  RoutineNight: {
    id: 'routine-night',
    eventType: 'RoutineNight',
    tag: '[ROUTINE]',
    headline: 'Cozy Night Hours',
    subtext: 'Quiet time for rest. Get good sleep for tomorrow’s goals 🌙',
    imageKey: 'Screenshot 2026-08-01 180458',
    validFromHour: 22,
    validToHour: 5,
  },
  IdleDefault: {
    id: 'idle-default',
    eventType: 'IdleDefault',
    tag: '[IDLE]',
    headline: 'Companion Active',
    subtext: 'Stay steady! Small steps every day lead to great achievements 🐾',
    imageKey: 'Screenshot 2026-08-01 180504',
  },
};

export const DYNAMIC_IDLE_POOL: CatScenario[] = [
  {
    id: 'idle-1',
    eventType: 'IdleTip1',
    tag: '[IDLE]',
    headline: 'Papa ',
    subtext: 'I luv u thangameeyyyy ',
    imageKey: 'Screenshot 2026-08-01 180514',
  },
  {
    id: 'idle-2',
    eventType: 'IdleTip2',
    tag: '[IDLE]',
    headline: 'love u kuttyyy maaa',
    subtext: '😘😘😘😘😘😘😘😘',
    imageKey: 'cat_drinking_water',
  },
  {
    id: 'idle-3',
    eventType: 'IdleTip3',
    tag: '[IDLE]',
    headline: 'En patyyyyyyyyy',
    subtext: '🤗🤗🤗🤗🤗🤗🤗🤗🤗🤗🤗🤗',
    imageKey: 'ChatGPT Image Aug 1, 2026, 06_05_38 PM',
  },
  {
    id: 'idle-4',
    eventType: 'IdleTip4',
    tag: '[IDLE]',
    headline: 'En Vairameyyyyy',
    subtext: 'enaku unna romab pidikum baby ',
    imageKey: 'ChatGPT Image Aug 1, 2026, 06_05_38 PM',
  },
  {
    id: 'idle-5',
    eventType: 'IdleTip5',
    tag: '[IDLE]',
    headline: 'Thangooooooooo',
    subtext: 'i love u kuttty maaa',
    imageKey: 'ChatGPT Image Aug 1, 2026, 06_05_38 PM',
  },
];
