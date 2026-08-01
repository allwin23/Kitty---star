import type {
  AIBrainEvaluationContext,
  AIRelevanceDecision,
  NotificationEventType,
  NotificationPriority,
} from './types';

/**
 * AI Notification Brain Engine
 * Evaluates study consistency, current streak, inactivity, exam countdowns, partner progress,
 * notification fatigue, time of day, and unfinished goals to compute a 0.0 - 1.0 relevance score.
 */
export class AINotificationBrain {
  /**
   * Evaluate relevance score for an event against current user context.
   */
  public static evaluate(
    eventType: NotificationEventType,
    ctx: AIBrainEvaluationContext,
    threshold: number = 0.6,
  ): AIRelevanceDecision {
    // 1. Urgent events always bypass threshold
    if (eventType === 'StreakLost' || eventType === 'ExamApproaching') {
      return {
        shouldSend: true,
        relevanceScore: 0.98,
        reason: 'Urgent event priority override',
        recommendedPriority: 'urgent',
        recommendedChannel: 'both',
        fatigueApplied: false,
      };
    }

    let score = 0.5; // Base score
    const factors: string[] = [];

    // Factor A: Study Consistency & Inactivity
    const inactivityHours = ctx.inactivityHours ?? 0;
    if (inactivityHours > 24 && eventType === 'SessionStarted') {
      score += 0.25;
      factors.push('High inactivity recovery boost (+0.25)');
    } else if (inactivityHours > 48) {
      score += 0.3;
      factors.push('Critical inactivity recovery boost (+0.3)');
    }

    // Factor B: Current Streak Factor
    const streak = ctx.currentStreakDays ?? 0;
    if (streak > 3 && (eventType === 'StreakStarted' || eventType === 'GoalCompleted')) {
      score += 0.2;
      factors.push(`Streak preservation bonus (+0.2, streak=${streak})`);
    }

    // Factor C: Exam Approaching Urgency
    const daysUntilExam = ctx.daysUntilExam ?? 999;
    if (daysUntilExam <= 14) {
      score += 0.25;
      factors.push(`Exam countdown urgency (+0.25, exam in ${daysUntilExam}d)`);
    } else if (daysUntilExam <= 30) {
      score += 0.15;
      factors.push(`Exam preparation phase (+0.15, exam in ${daysUntilExam}d)`);
    }

    // Factor D: Partner Activity Context
    if (eventType === 'PartnerStarted' || eventType === 'PartnerCompletedTask') {
      const partnerProgress = ctx.partnerProgressPercent ?? 0;
      if (partnerProgress > 50) {
        score += 0.2;
        factors.push(`Partner progress motivation (+0.2)`);
      } else {
        score += 0.15;
        factors.push('Partner active (+0.15)');
      }
    }

    // Factor E: Unfinished Goals Weight
    const unfinishedGoals = ctx.unfinishedGoalsCount ?? 0;
    if (unfinishedGoals > 0 && (eventType === 'GoalMissed' || eventType === 'BreakReminder')) {
      score += 0.15;
      factors.push(`Pending goals impact (+0.15, count=${unfinishedGoals})`);
    }

    // Factor F: Time of Day Suitability
    const currentHour = new Date().getHours();
    const peakHour = ctx.userPeakStudyHour ?? 19; // Default 7 PM peak
    const hourDiff = Math.abs(currentHour - peakHour);
    if (hourDiff <= 2) {
      score += 0.15;
      factors.push(`Peak study hour match (+0.15)`);
    }

    // Factor G: Notification Fatigue Penalty (Sliding Window Dampening)
    const recentNotifs24h = ctx.recentNotificationCount24h ?? 0;
    let fatigueApplied = false;
    if (recentNotifs24h > 12) {
      score -= 0.35;
      fatigueApplied = true;
      factors.push(`High notification fatigue penalty (-0.35, recent=${recentNotifs24h})`);
    } else if (recentNotifs24h > 6) {
      score -= 0.18;
      fatigueApplied = true;
      factors.push(`Moderate notification fatigue penalty (-0.18, recent=${recentNotifs24h})`);
    }

    // Normalize final score between 0.0 and 1.0
    const finalScore = Math.max(0.0, Math.min(1.0, Math.round(score * 100) / 100));
    const shouldSend = finalScore >= threshold;

    let priority: NotificationPriority = 'medium';
    if (finalScore >= 0.85) priority = 'high';
    else if (finalScore < 0.5) priority = 'low';

    return {
      shouldSend,
      relevanceScore: finalScore,
      reason: factors.join(' | ') || 'Standard evaluation',
      recommendedPriority: priority,
      recommendedChannel: finalScore >= 0.75 ? 'both' : 'in_app',
      fatigueApplied,
    };
  }
}
