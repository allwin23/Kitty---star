export const queryKeys = {
  // Planner / Accountability
  draft: (date: string) => ['draft', date] as const,
  initialPlan: (date: string) => ['initial-plan', date] as const,
  currentPlan: (date: string) => ['current-plan', date] as const,
  partnerPlan: (date: string) => ['partner-plan', date] as const,
  partnerSubmission: ['partner-submission'] as const,
  partnerProfile: ['partner-profile'] as const,
  mySubmission: (date: string) => ['my-submission', date] as const,
  reports: ['reports'] as const,
  report: (id: string) => ['report', id] as const,
  userStats: ['user-stats'] as const,
  achievements: ['achievements'] as const,
  notifications: ['notifications'] as const,

  // Activity
  activityToday: ['activity', 'today'] as const,
  activityWeekly: ['activity', 'weekly'] as const,

  // Water
  waterToday: ['water', 'today'] as const,

  // Mascot
  mascotFeed: ['mascot', 'feed'] as const,
  mascotUnread: ['mascot', 'unread'] as const,

  // ── Statistics dashboard ───────────────────────────────────────────────────
  statsUserStats: (userId: string) => ['stats', 'user-stats', userId] as const,
  statsAchievements: (userId: string) => ['stats', 'achievements', userId] as const,
  statsDailyActivity: (userId: string, filter: string) =>
    ['stats', 'daily-activity', userId, filter] as const,
  statsReports: (userId: string, filter: string) =>
    ['stats', 'reports', userId, filter] as const,
  statsPYQ: (userId: string) => ['stats', 'pyq', userId] as const,
  statsPYQAttempts: (userId: string, filter: string) =>
    ['stats', 'pyq-attempts', userId, filter] as const,
  statsVocabulary: (userId: string) => ['stats', 'vocabulary', userId] as const,
  statsGrammar: (userId: string) => ['stats', 'grammar', userId] as const,
  statsGrammarAttempts: (userId: string, filter: string) =>
    ['stats', 'grammar-attempts', userId, filter] as const,
  statsWater: (userId: string, filter: string) =>
    ['stats', 'water', userId, filter] as const,
  statsFlashcardSchedule: (userId: string) =>
    ['stats', 'flashcard-schedule', userId] as const,
  statsFlashcardReviews: (userId: string, filter: string) =>
    ['stats', 'flashcard-reviews', userId, filter] as const,
  statsPartnerId: ['stats', 'partner-id'] as const,

  // ── XP Journey Feature ───────────────────────────────────────────────────────
  journey: (userId: string) => ['journey', userId] as const,
  journeyMilestones: (journeyId: string) => ['journey-milestones', journeyId] as const,
  journeyChallenges: (journeyId: string) => ['journey-challenges', journeyId] as const,
  journeyEvents: (journeyId: string) => ['journey-events', journeyId] as const,
};
