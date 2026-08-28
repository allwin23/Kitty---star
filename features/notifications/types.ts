/**
 * Notification System Type Definitions
 * Support for 17 App Action Event Types, Priorities, Channels, AI Brain & Preferences
 */

export type NotificationEventType =
  | 'SessionStarted'
  | 'SessionEnded'
  | 'GoalCompleted'
  | 'GoalMissed'
  | 'PartnerStarted'
  | 'PartnerCompletedTask'
  | 'WaterReminder'
  | 'WaterSkipped'
  | 'BreakReminder'
  | 'DailySummary'
  | 'WeeklySummary'
  | 'AchievementUnlocked'
  | 'StreakStarted'
  | 'StreakLost'
  | 'FocusBroken'
  | 'AIRecommendation'
  | 'ExamApproaching'
  | 'PartnerConnected';

export type NotificationPriority = 'urgent' | 'high' | 'medium' | 'low';

export type NotificationCategory =
  'study' | 'partner' | 'water' | 'achievements' | 'ai_coach' | 'reports' | 'social';

export type NotificationChannel = 'push' | 'in_app' | 'both';

export interface AppNotificationEventPayload {
  type: NotificationEventType;
  userId: string;
  targetId?: string;
  priority?: NotificationPriority;
  category?: NotificationCategory;
  data?: Record<string, any>;
  timestamp?: number;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  in_app_enabled: boolean;
  partner_enabled: boolean;
  water_reminders_enabled: boolean;
  study_reminders_enabled: boolean;
  ai_coaching_enabled: boolean;
  daily_reports_enabled: boolean;
  weekly_reports_enabled: boolean;
  achievement_enabled: boolean;
  social_activity_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // "HH:mm" e.g., "22:00"
  quiet_hours_end: string; // "HH:mm" e.g., "07:00"
  relevance_threshold: number; // 0.0 - 1.0
}

export interface AIBrainEvaluationContext {
  userId: string;
  eventType: NotificationEventType;
  studyConsistencyScore?: number; // 0.0 - 1.0
  currentStreakDays?: number;
  inactivityHours?: number;
  daysUntilExam?: number;
  partnerProgressPercent?: number;
  unfinishedGoalsCount?: number;
  recentNotificationCount24h?: number;
  userPeakStudyHour?: number; // 0-23
}

export interface AIRelevanceDecision {
  shouldSend: boolean;
  relevanceScore: number; // 0.0 - 1.0
  reason: string;
  recommendedPriority: NotificationPriority;
  recommendedChannel: NotificationChannel;
  fatigueApplied: boolean;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  priority: NotificationPriority;
  category: NotificationCategory;
  channel: NotificationChannel;
  relevance_score: number;
  data: Record<string, any>;
  action_url?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationTemplate {
  titles: string[];
  bodies: string[];
  priority: NotificationPriority;
  category: NotificationCategory;
  channel: NotificationChannel;
  actionUrl?: string;
}
