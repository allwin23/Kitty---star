import type { NotificationEventType, NotificationTemplate } from './types';

/** Dictionary of templates with multiple conversational variants for all 17 event types */
export const NOTIFICATION_TEMPLATES: Record<NotificationEventType, NotificationTemplate> = {
  SessionStarted: {
    priority: 'low',
    category: 'study',
    channel: 'in_app',
    actionUrl: '/(app)/pomodoro',
    titles: [
      '🔥 Deep Focus Mode Active!',
      '🧠 Lock In Time!',
      '⏱️ Focus Session Started',
      '🚀 Time to Crush Your Study Goal',
    ],
    bodies: [
      'You are in the zone! Put distractions away and dominate {taskTitle}.',
      'Timer is running for {taskTitle}. Let\'s build momentum together!',
      'Focus session started for {taskTitle}. Every minute moves you forward!',
      'Focus mode engaged. Stay sharp and power through!',
    ],
  },

  SessionEnded: {
    priority: 'medium',
    category: 'study',
    channel: 'both',
    actionUrl: '/(app)/pomodoro',
    titles: [
      '🎉 Focus Session Completed!',
      '💪 Great Focus Session!',
      '⭐ +{xpEarned} XP Earned!',
      '🏆 Session Complete!',
    ],
    bodies: [
      'Boom! You completed a {duration} min focus session on {taskTitle}. Earned +{xpEarned} XP!',
      'Awesome work! Another {duration} minutes of solid study logged for {taskTitle}.',
      'High five! You pushed through {duration} minutes on {taskTitle}. Keep the momentum going!',
      'Solid focus session done. Take a quick breather and admire your progress!',
    ],
  },

  GoalCompleted: {
    priority: 'high',
    category: 'study',
    channel: 'both',
    actionUrl: '/(app)/accountability',
    titles: [
      '✅ Task Accomplished!',
      '🎯 Target Hit!',
      '🌟 Goal Completed!',
      '🙌 One More Off the List!',
    ],
    bodies: [
      'You finished "{taskTitle}"! Brilliant work staying accountable today.',
      'Check! "{taskTitle}" is officially completed. Keep up the high energy!',
      'Task "{taskTitle}" completed! Step by step, you are mastering your study plan.',
      'Boom! "{taskTitle}" done. Progress feels amazing, doesn\'t it?',
    ],
  },

  GoalMissed: {
    priority: 'medium',
    category: 'study',
    channel: 'both',
    actionUrl: '/(app)/accountability',
    titles: [
      '💡 Unfinished Goal Alert',
      '🌱 Don\'t Stop Now!',
      '⏰ Reset & Keep Going',
      '📋 Task Still Pending',
    ],
    bodies: [
      '"{taskTitle}" wasn\'t completed today. You can carry it forward into tomorrow\'s plan!',
      'Missed a task today? No worries! Small daily steps lead to huge long-term wins.',
      '"{taskTitle}" is still waiting. Take 15 minutes now to finish strong!',
      'Progress isn\'t about perfection. Roll "{taskTitle}" over into tomorrow\'s study plan.',
    ],
  },

  PartnerStarted: {
    priority: 'medium',
    category: 'partner',
    channel: 'both',
    actionUrl: '/(app)/accountability',
    titles: [
      '👥 {partnerName} Started Studying!',
      '🔥 {partnerName} is Locked In!',
      '⚡ Study Partner Active!',
      '🤝 Join {partnerName} Now!',
    ],
    bodies: [
      '{partnerName} just started a focus session! Tap to join them in study mode.',
      '{partnerName} is studying right now. Jump in and crush your goals together!',
      'Your partner {partnerName} is getting work done! Join the study session.',
      '{partnerName} is in focus mode. Team up and double your productivity today!',
    ],
  },

  PartnerCompletedTask: {
    priority: 'medium',
    category: 'partner',
    channel: 'both',
    actionUrl: '/(app)/accountability',
    titles: [
      '🙌 {partnerName} Completed a Task!',
      '👏 Partner Milestone!',
      '🎉 {partnerName} is Crushing It!',
      '✨ Partner Progress Alert',
    ],
    bodies: [
      '{partnerName} just completed "{taskTitle}"! Send them some encouragement.',
      '{partnerName} completed another study task! Check out their live plan.',
      'Nice! {partnerName} finished "{taskTitle}". How is your progress coming along?',
      '{partnerName} is on fire! They just marked "{taskTitle}" as completed.',
    ],
  },

  WaterReminder: {
    priority: 'low',
    category: 'water',
    channel: 'both',
    actionUrl: '/(app)/water',
    titles: [
      '💧 Hydration Break!',
      '🥤 Time for a Glass of Water',
      '🌊 Refresh Your Brain',
      '💦 Stay Hydrated!',
    ],
    bodies: [
      'Hydrate for better focus! Take a quick sip of water now.',
      'Drinking water keeps your cognitive speed sharp. Log your intake now!',
      'Time for a water break! Your brain will thank you during your next study session.',
      'Fuel your focus with water! Tap to log a glass of water.',
    ],
  },

  WaterSkipped: {
    priority: 'low',
    category: 'water',
    channel: 'in_app',
    actionUrl: '/(app)/water',
    titles: [
      '⚠️ Hydration Target Falling Behind',
      '💧 Don\'t Forget Your Water Goal',
      '🥤 Hydration Alert',
      '🌊 Drink Water to Stay Alert',
    ],
    bodies: [
      'You haven\'t logged water in a while. Drink a glass to keep your energy high!',
      'Feeling fatigue? Dehydration lowers concentration. Take a sip!',
      'Your hydration target is low today. Log your water intake to catch up.',
      'Quick reminder: Stay hydrated so you don\'t burn out during study sessions.',
    ],
  },

  BreakReminder: {
    priority: 'medium',
    category: 'study',
    channel: 'both',
    actionUrl: '/(app)/pomodoro',
    titles: [
      '☕ Rest Time!',
      '🧘 Take a 5-Minute Break',
      '🌿 Recharge Your Energy',
      '⏸️ Pause & Breathe',
    ],
    bodies: [
      'Great focus session! Stand up, stretch, and relax your eyes for 5 minutes.',
      'Time for a break! Stepping away briefly improves memory retention.',
      'Rest your mind. A short breather now guarantees sharp focus on your next task.',
      'Take a 5-minute break. Walk around, stretch, or grab a drink of water!',
    ],
  },

  DailySummary: {
    priority: 'high',
    category: 'reports',
    channel: 'both',
    actionUrl: '/(app)/accountability/reports',
    titles: [
      '📊 Your Daily Study Summary',
      '📑 Today\'s Progress Report Ready',
      '🌟 Day Summary Available',
      '📈 See How You Did Today!',
    ],
    bodies: [
      'Your daily study report is ready! Tap to review your focus time and completed tasks.',
      'Great work today! Check out your daily summary and partner feedback.',
      'Today\'s report has been generated. See your XP earned and study streak!',
      'Review today\'s achievements in your daily report before planning tomorrow.',
    ],
  },

  WeeklySummary: {
    priority: 'high',
    category: 'reports',
    channel: 'both',
    actionUrl: '/(app)/statistics',
    titles: [
      '🏆 Weekly Study Performance Report',
      '📊 Your 7-Day Analytics Are Ready!',
      '🔥 Weekly Summary & Insights',
      '📈 Check Out Your Weekly Gains!',
    ],
    bodies: [
      'You studied {weeklyMinutes} mins this week! Tap to see your top subjects & performance.',
      'Weekly recap: See how much focus time you logged with {partnerName} this week!',
      'Your weekly analytics are live! Review your stats and unlock new achievements.',
      'Another week of growth logged! Tap to inspect your 7-day study breakdown.',
    ],
  },

  AchievementUnlocked: {
    priority: 'high',
    category: 'achievements',
    channel: 'both',
    actionUrl: '/(app)/achievements',
    titles: [
      '🏅 Achievement Unlocked!',
      '🎉 New Badge Earned!',
      '👑 Milestone Reached!',
      '⭐ New Achievement Alert!',
    ],
    bodies: [
      'Congratulations! You unlocked "{badgeTitle}". Tap to view your badge collection!',
      'Badge unlocked: "{badgeTitle}"! You earned bonus XP for this milestone.',
      'You did it! "{badgeTitle}" badge added to your trophy room. Wear it with pride!',
      'Awesome work! You unlocked "{badgeTitle}". Check out your new reward!',
    ],
  },

  StreakStarted: {
    priority: 'medium',
    category: 'social',
    channel: 'both',
    actionUrl: '/(app)/journey',
    titles: [
      '🔥 {streakDays}-Day Study Streak Active!',
      '⚡ You\'re on a Roll!',
      '🚀 Streak Extended to {streakDays} Days!',
      '💥 Study Streak Power-Up!',
    ],
    bodies: [
      'You are on a {streakDays}-day streak! Keep up the daily momentum to earn bonus XP.',
      '{streakDays} days in a row! Consistency is your super power. Keep going!',
      'Streak extended to {streakDays} days! Don\'t break the chain tomorrow.',
      'You\'re building a unstoppable study habit. {streakDays} days strong!',
    ],
  },

  StreakLost: {
    priority: 'urgent',
    category: 'social',
    channel: 'both',
    actionUrl: '/(app)/accountability',
    titles: [
      '💔 Streak Broken - Rebuild Today!',
      '🔥 Restart Your Streak Today',
      '💪 Comeback Time!',
      '⚡ Bounce Back Now!',
    ],
    bodies: [
      'Your study streak was reset. Complete 1 focus session today to start a fresh streak!',
      'Missed yesterday? No problem! The best time to restart your streak is right now.',
      'Don\'t get discouraged. Start a brand new streak today and build back stronger!',
      'Rebuild your streak today! 25 minutes of focus is all it takes to get back on track.',
    ],
  },

  FocusBroken: {
    priority: 'medium',
    category: 'study',
    channel: 'in_app',
    actionUrl: '/(app)/pomodoro',
    titles: [
      '⚠️ Focus Session Interrupted',
      '🧭 Regain Your Concentration',
      '⏱️ Timer Paused',
      '🎯 Refocus Your Mind',
    ],
    bodies: [
      'Your focus session was paused. Take a deep breath and jump right back in!',
      'Distracted? Reset your mind and resume your session on "{taskTitle}".',
      'Don\'t let a small interruption ruin your momentum. Tap to resume focus mode!',
      'Get back into the groove! You can still complete your focus session.',
    ],
  },

  AIRecommendation: {
    priority: 'high',
    category: 'ai_coach',
    channel: 'both',
    actionUrl: '/(app)/statistics',
    titles: [
      '🤖 AI Study Coach Tip',
      '💡 Smart Study Insight',
      '🧠 Personalized Recommendation',
      '✨ AI Insight for You',
    ],
    bodies: [
      '{aiMessage}',
      'AI Coach Tip: {aiMessage}',
      'Based on your study habits: {aiMessage}',
      'Smart Recommendation: {aiMessage}',
    ],
  },

  ExamApproaching: {
    priority: 'urgent',
    category: 'study',
    channel: 'both',
    actionUrl: '/(app)/journey',
    titles: [
      '🚨 {daysUntilExam} Days Until {examName}!',
      '⏰ Exam Countdown: {examName}',
      '📚 Countdown Alert: {examName}',
      '🎯 Final Prep Phase for {examName}',
    ],
    bodies: [
      '{examName} is only {daysUntilExam} days away! Plan your revision tasks now.',
      '{daysUntilExam} days left before {examName}. Stay focused and stick to your daily plan!',
      'Exam approaching in {daysUntilExam} days! Review your weak topics and practice PYQs today.',
      'Countdown alert: {daysUntilExam} days remaining until {examName}. You\'ve got this!',
    ],
  },

  PartnerConnected: {
    priority: 'high',
    category: 'partner',
    channel: 'both',
    actionUrl: '/(app)/home',
    titles: [
      '🤝 Partner Connected!',
      '🎉 Study Partner Linked!',
      '✨ Partner Joined Your Journey',
      '👥 Team Mode Activated!',
    ],
    bodies: [
      'You are now connected with your study partner! Track plans & study together.',
      'Study partner linked! Share daily goals and boost each other\'s momentum.',
      'Your partner is connected. Start a pomodoro focus session together!',
      'Partner linked successfully! Check off daily tasks to stay accountable.',
    ],
  },
};

/** History set of recently chosen copy to prevent repeating identical messages */
const recentCopyHistory = new Set<string>();
const MAX_HISTORY = 30;

/** Select a randomized, contextual, non-repetitive copy for a given event */
export function generateNotificationContent(
  eventType: NotificationEventType,
  params: Record<string, any> = {},
): { title: string; body: string; priority: any; category: any; channel: any; actionUrl?: string } {
  const template = NOTIFICATION_TEMPLATES[eventType] || NOTIFICATION_TEMPLATES.SessionStarted;

  // Function to format variables inside string: {varName} -> value
  const interpolate = (str: string): string => {
    return str.replace(/\{(\w+)\}/g, (_, key) => {
      if (params[key] !== undefined && params[key] !== null) {
        return String(params[key]);
      }
      // Fallbacks
      if (key === 'taskTitle') return 'study task';
      if (key === 'partnerName') return 'your partner';
      if (key === 'duration') return '25';
      if (key === 'xpEarned') return '20';
      if (key === 'streakDays') return '3';
      if (key === 'examName') return 'Upcoming Exam';
      if (key === 'daysUntilExam') return '7';
      if (key === 'weeklyMinutes') return '150';
      if (key === 'badgeTitle') return 'Master Scholar';
      if (key === 'aiMessage') return 'Try reviewing PYQ questions to boost memory retention!';
      return '';
    });
  };

  // Filter out recent titles/bodies to prevent repetition
  const unusedTitles = template.titles.filter((t) => !recentCopyHistory.has(t));
  const chosenTitleRaw = unusedTitles.length > 0
    ? unusedTitles[Math.floor(Math.random() * unusedTitles.length)]
    : template.titles[Math.floor(Math.random() * template.titles.length)];

  const unusedBodies = template.bodies.filter((b) => !recentCopyHistory.has(b));
  const chosenBodyRaw = unusedBodies.length > 0
    ? unusedBodies[Math.floor(Math.random() * unusedBodies.length)]
    : template.bodies[Math.floor(Math.random() * template.bodies.length)];

  // Track in history
  recentCopyHistory.add(chosenTitleRaw);
  recentCopyHistory.add(chosenBodyRaw);
  if (recentCopyHistory.size > MAX_HISTORY) {
    const firstItem = recentCopyHistory.values().next().value;
    if (firstItem) recentCopyHistory.delete(firstItem);
  }

  return {
    title: interpolate(chosenTitleRaw),
    body: interpolate(chosenBodyRaw),
    priority: template.priority,
    category: template.category,
    channel: template.channel,
    actionUrl: template.actionUrl,
  };
}

/** Hook for future LLM-generated personalized messages */
export async function generateLLMMessage(
  eventType: NotificationEventType,
  userProfile: { fullName?: string; targetExam?: string },
  recentStats: { streakDays?: number; studyHoursThisWeek?: number },
): Promise<{ title: string; body: string } | null> {
  // If an AI integration endpoint is available, invoke here.
  // Fallback to template generator
  return null;
}
