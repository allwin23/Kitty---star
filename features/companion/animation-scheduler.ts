import { CompanionEmotionEngine } from './emotion-engine';
import { CompanionBus } from './event-bus';
import { CompanionMessageGenerator } from './message-generator';
import { CompanionNotificationQueue } from './notification-queue';
import type {
  AnnouncementItem,
  CompanionEventPayload,
  MascotAnimationPose,
  MascotEmotionState,
} from './types';

export interface SynchronizationState {
  activeAnnouncement: AnnouncementItem | null;
  typingText: string;
  isTyping: boolean;
  mascotPose: MascotAnimationPose;
  mascotEmotion: MascotEmotionState;
  showCelebration: boolean;
  queueCount: number;
}

type SyncListener = (state: SynchronizationState) => void;

export class AnimationScheduler {
  private queue = new CompanionNotificationQueue();
  private listeners: Set<SyncListener> = new Set();
  private isProcessing = false;
  private timerRef: ReturnType<typeof setTimeout> | null = null;
  private typingTimerRef: ReturnType<typeof setInterval> | null = null;

  private currentState: SynchronizationState = {
    activeAnnouncement: null,
    typingText: '',
    isTyping: false,
    mascotPose: 'idle',
    mascotEmotion: CompanionEmotionEngine.getAmbientEmotion(),
    showCelebration: false,
    queueCount: 0,
  };

  constructor() {
    // Subscribe to all events on CompanionBus
    CompanionBus.on('*', (event) => {
      this.handleIncomingEvent(event);
    });
  }

  /** Subscribe UI components to state updates */
  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.currentState); // Immediate emit
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Ingest an event, evaluate emotions, generate copy, and enqueue */
  private handleIncomingEvent(event: CompanionEventPayload) {
    const reaction = CompanionEmotionEngine.evaluateReaction(event.eventType);
    const message = CompanionMessageGenerator.generateMessage(event.eventType, event.payload || {});

    const iconMap: Record<string, string> = {
      XPEarned: '⭐',
      PartnerCompletedTask: '👥',
      WelcomeBack: '👋',
      Login: '🔑',
      Logout: '👋',
      GoodNight: '🌙',
      WaterBreak: '💧',
      PomodoroComplete: '🍅',
      DailyGoalAchieved: '🎯',
      GiftUnlocked: '🎁',
      StreakSaved: '🔥',
      ExamTomorrow: '🚨',
      MissionFailed: '💔',
      AchievementEarned: '🏆',
      ChallengeAccepted: '🚀',
      FriendOnline: '⚡',
      WeeklyReportReady: '📊',
      NewDecorationAvailable: '🎨',
      AIInsightReady: '🤖',
      FocusMode: '🤫',
      LongStudy: '🛋️',
      NoStudyToday: '🌱',
      Morning: '🌅',
    };

    const titleMap: Record<string, string> = {
      XPEarned: `+${event.payload?.xpAmount || 50} XP`,
      PartnerCompletedTask: `Partner Completed ${event.payload?.subject || 'Task'}`,
      WelcomeBack: 'Welcome back!',
      Login: 'Welcome back!',
      Logout: 'Good Night!',
      GoodNight: 'Good Night',
      WaterBreak: 'Water Break',
      PomodoroComplete: 'Pomodoro Complete',
      DailyGoalAchieved: 'Daily Goal Achieved',
      GiftUnlocked: 'Gift Unlocked',
      StreakSaved: 'Streak Saved',
      ExamTomorrow: 'Exam Tomorrow',
      MissionFailed: 'Mission Failed',
      AchievementEarned: 'Achievement Earned',
      ChallengeAccepted: 'Challenge Accepted',
      FriendOnline: 'Friend Online',
      WeeklyReportReady: 'Weekly Report Ready',
      NewDecorationAvailable: 'New Decoration Available',
      AIInsightReady: 'AI Insight Ready',
    };

    const item: AnnouncementItem = {
      id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventType: event.eventType,
      priority: event.priority,
      title: titleMap[event.eventType] || event.eventType,
      message,
      icon: iconMap[event.eventType] || '✨',
      xpBonus: event.payload?.xpAmount,
      animation: event.animation || reaction.animation,
      emotion: reaction.emotion,
      voiceMood: event.voiceMood || reaction.voiceMood,
      hasCelebration:
        event.eventType === 'AchievementEarned' ||
        event.eventType === 'DailyGoalAchieved' ||
        event.eventType === 'GiftUnlocked' ||
        event.eventType === 'PomodoroComplete',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000, // 60s expiration
    };

    const { shouldInterrupt } = this.queue.enqueue(item);

    if (shouldInterrupt) {
      this.cancelCurrentPresentation();
      this.processNext();
    } else if (!this.isProcessing) {
      this.processNext();
    }
  }

  /** Process next announcement in queue */
  private processNext() {
    const item = this.queue.dequeue();

    if (!item) {
      this.isProcessing = false;
      this.updateState({
        activeAnnouncement: null,
        typingText: '',
        isTyping: false,
        mascotPose: 'idle',
        mascotEmotion: CompanionEmotionEngine.getAmbientEmotion(),
        showCelebration: false,
        queueCount: 0,
      });
      return;
    }

    this.isProcessing = true;

    // 1. Initial State: Start Entrance & Pose
    this.updateState({
      activeAnnouncement: item,
      typingText: '',
      isTyping: true,
      mascotPose: item.animation,
      mascotEmotion: item.emotion,
      showCelebration: item.hasCelebration,
      queueCount: this.queue.getQueueLength(),
    });

    // 2. Typing Effect Animation
    this.startTypingEffect(item.message, () => {
      // 3. Post-Typing Display Hold Phase (hold for at least 10 seconds)
      const holdTimeMs = Math.max(10000, item.message.length * 80);

      this.timerRef = setTimeout(() => {
        // Dismiss current & transition to next
        this.processNext();
      }, holdTimeMs);
    });
  }

  /** Animated character-by-character typing effect */
  private startTypingEffect(fullText: string, onComplete: () => void) {
    if (this.typingTimerRef) clearInterval(this.typingTimerRef);

    let charIndex = 0;
    const intervalMs = 25; // 25ms per char

    this.typingTimerRef = setInterval(() => {
      charIndex++;
      const currentSub = fullText.substring(0, charIndex);

      this.updateState({
        typingText: currentSub,
        isTyping: charIndex < fullText.length,
      });

      if (charIndex >= fullText.length) {
        if (this.typingTimerRef) clearInterval(this.typingTimerRef);
        onComplete();
      }
    }, intervalMs);
  }

  /** Cancel active presentation on critical event interrupt */
  private cancelCurrentPresentation() {
    if (this.timerRef) clearTimeout(this.timerRef);
    if (this.typingTimerRef) clearInterval(this.typingTimerRef);
    this.isProcessing = false;
  }

  /** Dismiss active announcement manually */
  public dismissActive() {
    this.cancelCurrentPresentation();
    this.processNext();
  }

  private updateState(partial: Partial<SynchronizationState>) {
    this.currentState = { ...this.currentState, ...partial };
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentState);
      } catch (err) {
        console.error('[AnimationScheduler] Listener error:', err);
      }
    });
  }

  public getCurrentState(): SynchronizationState {
    return this.currentState;
  }
}

export const CompanionScheduler = new AnimationScheduler();
