export const queryKeys = {
  // Planner / Accountability
  draft: (date: string) => ['draft', date] as const,
  initialPlan: (date: string) => ['initial-plan', date] as const,
  currentPlan: (date: string) => ['current-plan', date] as const,
  partnerPlan: (date: string) => ['partner-plan', date] as const,
  partnerSubmission: ['partner-submission'] as const,
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
};
