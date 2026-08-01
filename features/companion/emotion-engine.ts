import type {
  CompanionEventType,
  MascotAnimationPose,
  MascotEmotionState,
  VoiceMood,
} from './types';

export interface EmotionReaction {
  emotion: MascotEmotionState;
  animation: MascotAnimationPose;
  voiceMood: VoiceMood;
  intensity: number; // 0.0 to 1.0
  durationMs: number;
}

/**
 * Mascot Emotion Engine
 * Maps companion events & context into visual poses, emotional states, and voice moods.
 */
export class CompanionEmotionEngine {
  /** Map an event to its corresponding mascot reaction */
  public static evaluateReaction(eventType: CompanionEventType): EmotionReaction {
    switch (eventType) {
      case 'XPEarned':
      case 'DailyGoalAchieved':
        return {
          emotion: 'celebratory',
          animation: 'celebrate',
          voiceMood: 'excited',
          intensity: 0.9,
          durationMs: 4000,
        };

      case 'PartnerCompletedTask':
      case 'FriendOnline':
        return {
          emotion: 'excited',
          animation: 'cheer',
          voiceMood: 'playful',
          intensity: 0.8,
          durationMs: 4000,
        };

      case 'WelcomeBack':
      case 'Login':
        return {
          emotion: 'happy',
          animation: 'wave',
          voiceMood: 'excited',
          intensity: 0.75,
          durationMs: 3500,
        };

      case 'Logout':
      case 'GoodNight':
        return {
          emotion: 'sleepy',
          animation: 'wave_goodbye',
          voiceMood: 'cozy',
          intensity: 0.7,
          durationMs: 3500,
        };

      case 'WaterBreak':
        return {
          emotion: 'calm',
          animation: 'hold_bottle',
          voiceMood: 'cozy',
          intensity: 0.6,
          durationMs: 4000,
        };

      case 'PomodoroComplete':
        return {
          emotion: 'celebratory',
          animation: 'celebrate',
          voiceMood: 'excited',
          intensity: 0.85,
          durationMs: 4500,
        };

      case 'GiftUnlocked':
      case 'NewDecorationAvailable':
        return {
          emotion: 'excited',
          animation: 'jump',
          voiceMood: 'playful',
          intensity: 0.95,
          durationMs: 4000,
        };

      case 'AchievementEarned':
      case 'StreakSaved':
        return {
          emotion: 'celebratory',
          animation: 'confetti',
          voiceMood: 'excited',
          intensity: 1.0,
          durationMs: 5000,
        };

      case 'ExamTomorrow':
        return {
          emotion: 'serious',
          animation: 'serious',
          voiceMood: 'serious',
          intensity: 0.9,
          durationMs: 4500,
        };

      case 'MissionFailed':
      case 'NoStudyToday':
        return {
          emotion: 'concerned',
          animation: 'concerned',
          voiceMood: 'sympathetic',
          intensity: 0.7,
          durationMs: 4000,
        };

      case 'LongStudy':
        return {
          emotion: 'sleepy',
          animation: 'sleeping',
          voiceMood: 'cozy',
          intensity: 0.8,
          durationMs: 5000,
        };

      case 'FocusMode':
        return {
          emotion: 'focused',
          animation: 'quiet_studying',
          voiceMood: 'calm',
          intensity: 0.85,
          durationMs: 4000,
        };

      case 'Morning':
        return {
          emotion: 'happy',
          animation: 'stretch',
          voiceMood: 'cozy',
          intensity: 0.7,
          durationMs: 4000,
        };

      default:
        return {
          emotion: 'happy',
          animation: 'idle',
          voiceMood: 'calm',
          intensity: 0.5,
          durationMs: 3000,
        };
    }
  }

  /** Compute ambient emotion based on time of day */
  public static getAmbientEmotion(): MascotEmotionState {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) return 'sleepy';
    if (hour >= 6 && hour < 9) return 'calm';
    if (hour >= 9 && hour < 18) return 'happy';
    return 'focused';
  }
}
