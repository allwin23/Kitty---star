import type { CompanionEventType, CompanionPersonalityMode } from './types';

/** Dictionary of contextual message pools per event type */
const MESSAGE_POOLS: Record<CompanionEventType, string[]> = {
  WelcomeBack: [
    'Welcome back.',
    'Ready to continue?',
    "Let's make today count.",
    'Good to see you again.',
    "Back already? Let's crush it!",
  ],
  Login: [
    'Welcome back.',
    'Ready to continue?',
    "Let's make today count.",
    'Good to see you again.',
    'Back already?',
  ],
  Logout: [
    'Rest up! See you soon.',
    'Great effort today.',
    'Goodbye for now! Take care.',
    'Catch you later, scholar!',
  ],
  XPEarned: [
    '+{xpAmount} XP added to your total!',
    'Level up energy! Earned +{xpAmount} XP.',
    'Boom! +{xpAmount} XP in the bag.',
    'Your dedication paid off with +{xpAmount} XP.',
  ],
  PomodoroComplete: [
    'Fantastic focus.',
    'Another session done.',
    'You stayed locked in.',
    'Momentum maintained.',
    '25 minutes of pure productivity!',
  ],
  WaterBreak: [
    'Hydration break?',
    'Time for some water.',
    'Stretch and drink.',
    'Recharge before continuing.',
    'Fuel your brain with water!',
  ],
  PartnerCompletedTask: [
    '{partnerName} finished {subject}.',
    'Your partner just completed a task.',
    '{partnerName} is making progress.',
    'Your teammate just leveled up.',
    '{partnerName} marked another goal as complete!',
  ],
  DailyGoalAchieved: [
    'Daily targets smashed!',
    "100% of today's plan complete!",
    'Unstoppable daily momentum!',
    "You mastered today's study plan.",
  ],
  GiftUnlocked: [
    'Surprise! A mystery gift was unlocked.',
    'Bonus reward unlocked for your hard work!',
    'Check your inventory! New item available.',
  ],
  StreakSaved: [
    'Streak saved! {streakDays} days strong.',
    'You kept the fire burning! {streakDays}-day streak.',
    'Daily chain preserved! {streakDays} consecutive days.',
  ],
  ExamTomorrow: [
    'Exam countdown: Stay calm & focused.',
    "Final review time! You've got this.",
    "Trust your preparation for tomorrow's test.",
  ],
  MissionFailed: [
    "Don't worry, every setback is a setup for a comeback.",
    'Reset and try again tomorrow!',
    "Progress isn't always linear. Keep pushing.",
  ],
  AchievementEarned: [
    'Achievement unlocked: {badgeTitle}!',
    'New trophy added to your showcase!',
    'Milestone accomplished! Badge unlocked.',
  ],
  ChallengeAccepted: ['Challenge accepted! Show what you can do.', 'Game on! Focus mode engaged.'],
  FriendOnline: [
    '{partnerName} is online and studying now!',
    'Your study partner just checked in.',
  ],
  WeeklyReportReady: [
    'Your 7-day study report is ready to view.',
    'Check out your weekly analytics and progress gains!',
  ],
  NewDecorationAvailable: [
    'New mascot skin & decoration ready to equip!',
    'Personalize your companion in settings.',
  ],
  AIInsightReady: [
    'AI Coach has a personalized insight for you!',
    'Smart recommendation available in stats.',
  ],
  GoodNight: ['Good night! Sleep well and recharge.', "Rest your brain for tomorrow's gains."],
  LongStudy: [
    "You've been studying for a while. Take a breather!",
    "Impressive stamina! Don't forget to stretch.",
  ],
  FocusMode: ['Shh... Deep focus mode active.', 'Distractions off. Brain on.'],
  NoStudyToday: [
    'No study session logged yet today. Take 15 mins now!',
    'Keep your streak alive with a quick session.',
  ],
  Morning: [
    'Good morning! Stretch and start your day strong.',
    "Rise and shine! Ready for today's study goal?",
  ],
};

/** Anti-repetition sliding memory cache */
const recentlyUsedMessages = new Set<string>();
const MAX_MEMORY = 25;

export class CompanionMessageGenerator {
  /** Generate non-repetitive, contextual announcement message */
  public static generateMessage(
    eventType: CompanionEventType,
    payload: Record<string, any> = {},
    personalityMode: CompanionPersonalityMode = 'cheerful',
  ): string {
    const pool = payload.messagePool || MESSAGE_POOLS[eventType] || MESSAGE_POOLS.WelcomeBack;

    // Filter out messages shown recently
    const unusedMessages = pool.filter((msg: string) => !recentlyUsedMessages.has(msg));
    const selectedTemplate =
      unusedMessages.length > 0
        ? unusedMessages[Math.floor(Math.random() * unusedMessages.length)]
        : pool[Math.floor(Math.random() * pool.length)];

    // Interpolate placeholders: {xpAmount}, {partnerName}, {subject}, {taskTitle}, {streakDays}, {badgeTitle}
    const finalMessage = selectedTemplate.replace(/\{(\w+)\}/g, (_: string, key: string) => {
      if (payload[key] !== undefined && payload[key] !== null) {
        return String(payload[key]);
      }
      if (key === 'xpAmount') return '50';
      if (key === 'partnerName') return payload.partnerName || 'Your partner';
      if (key === 'subject') return payload.subject || 'study task';
      if (key === 'taskTitle') return payload.taskTitle || 'task';
      if (key === 'streakDays') return String(payload.streakDays || 3);
      if (key === 'badgeTitle') return payload.badgeTitle || 'Scholar Badge';
      return '';
    });

    // Record in history memory
    recentlyUsedMessages.add(selectedTemplate);
    if (recentlyUsedMessages.size > MAX_MEMORY) {
      const oldest = recentlyUsedMessages.values().next().value;
      if (oldest) recentlyUsedMessages.delete(oldest);
    }

    // Apply personality mode flavor if applicable
    if (personalityMode === 'strict_coach') {
      return finalMessage.replace(/\!/g, '. Focus!');
    } else if (personalityMode === 'zen_master') {
      return `☯ ${finalMessage}`;
    }

    return finalMessage;
  }
}
