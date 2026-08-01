/**
 * Companion Presentation Engine Types
 * Supports synchronized Bulletin Board & Mascot, Priority Queueing, Emotion Engine,
 * Message Randomization, and Extensibility (Skins, Leveling, LLM, Celebrations)
 */

export type CompanionEventType =
  | 'XPEarned'
  | 'PartnerCompletedTask'
  | 'WelcomeBack'
  | 'GoodNight'
  | 'WaterBreak'
  | 'PomodoroComplete'
  | 'DailyGoalAchieved'
  | 'GiftUnlocked'
  | 'StreakSaved'
  | 'ExamTomorrow'
  | 'MissionFailed'
  | 'AchievementEarned'
  | 'ChallengeAccepted'
  | 'FriendOnline'
  | 'WeeklyReportReady'
  | 'NewDecorationAvailable'
  | 'AIInsightReady'
  | 'Login'
  | 'Logout'
  | 'LongStudy'
  | 'FocusMode'
  | 'NoStudyToday'
  | 'Morning';

export type CompanionPriority = 'critical' | 'high' | 'normal' | 'low';

export type MascotAnimationPose =
  | 'celebrate'
  | 'wave'
  | 'wave_goodbye'
  | 'hold_bottle'
  | 'cheer'
  | 'sleeping'
  | 'quiet_studying'
  | 'jump'
  | 'confetti'
  | 'serious'
  | 'concerned'
  | 'sleep'
  | 'stretch'
  | 'idle'
  | 'happy'
  | 'surprised';

export type MascotEmotionState =
  | 'happy'
  | 'excited'
  | 'focused'
  | 'sleepy'
  | 'serious'
  | 'concerned'
  | 'celebratory'
  | 'calm';

export type VoiceMood = 'excited' | 'calm' | 'serious' | 'playful' | 'cozy' | 'sympathetic';

export type CompanionPersonalityMode = 'cheerful' | 'strict_coach' | 'zen_master' | 'playful_buddy';

export interface CompanionEventPayload {
  eventType: CompanionEventType;
  priority: CompanionPriority;
  payload?: {
    xpAmount?: number;
    partnerName?: string;
    taskTitle?: string;
    subject?: string;
    streakDays?: number;
    examName?: string;
    badgeTitle?: string;
    duration?: number;
    customText?: string;
    [key: string]: any;
  };
  timestamp: number;
  cooldown?: number; // ms before same event can retrigger
  animation?: MascotAnimationPose;
  voiceMood?: VoiceMood;
  messagePool?: string[];
}

export interface AnnouncementItem {
  id: string;
  eventType: CompanionEventType;
  priority: CompanionPriority;
  title: string;
  message: string;
  icon: string;
  xpBonus?: number;
  animation: MascotAnimationPose;
  emotion: MascotEmotionState;
  voiceMood: VoiceMood;
  hasCelebration: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface CompanionMascotState {
  name: string;
  level: number;
  xp: number;
  activeSkin: string; // 'classic_cat' | 'golden_kitty' | 'space_explorer' | 'cyber_cat'
  unlockedSkins: string[];
  activeDecoration: string; // 'none' | 'party_hat' | 'scholar_cap' | 'study_desk'
  personalityMode: CompanionPersonalityMode;
  currentEmotion: MascotEmotionState;
  currentAnimation: MascotAnimationPose;
}
