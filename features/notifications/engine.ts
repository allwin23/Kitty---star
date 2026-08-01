import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { AINotificationBrain } from './ai-brain';
import { EventBus } from './event-bus';
import { generateNotificationContent } from './templates';
import { useNotificationStore } from '@/stores/notification-store';
import type {
  AIBrainEvaluationContext,
  AppNotificationEventPayload,
  NotificationCategory,
  NotificationChannel,
  NotificationPreferences,
  NotificationPriority,
  NotificationRecord,
} from './types';

// Configure default expo notification behavior
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  // Ignored on unsupported web environments
}

/** In-memory sliding window cache for deduplication & anti-spam rate limiting */
const deduplicationCache = new Map<string, number>(); // Hash -> timestamp
const userNotificationHistory = new Map<string, number[]>(); // userId -> Array of timestamps

const DEDUPLICATION_WINDOW_MS = 10 * 60 * 1000; // 10 minutes sliding window
const MAX_NOTIFICATIONS_PER_HOUR = 6;

export class NotificationEngine {
  private static isInitialized = false;

  /** Initialize event bus subscription and notification handlers */
  public static initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to all events emitted on EventBus
    EventBus.on('*', async (eventPayload) => {
      await this.processEvent(eventPayload);
    });

    console.log('[NotificationEngine] Centralized Event-Driven Engine Initialized');
  }

  /** Request push notification permissions */
  public static async requestPushPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        if ('Notification' in window) {
          const perm = await window.Notification.requestPermission();
          return perm === 'granted';
        }
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('[NotificationEngine] Permission request failed:', err);
      return false;
    }
  }

  /** Core Event Processing Pipeline */
  public static async processEvent(event: AppNotificationEventPayload): Promise<NotificationRecord | null> {
    try {
      const { type, userId, data = {}, priority: explicitPriority } = event;
      if (!userId) return null;

      // 1. Fetch User Preferences
      const prefs = await this.getUserPreferences(userId);

      // 2. Category & Preference Filter Check
      const content = generateNotificationContent(type, data);
      const category = event.category || content.category;
      if (!this.checkCategoryPreference(category, prefs)) {
        console.log(`[NotificationEngine] Event ${type} blocked by user preference for category: ${category}`);
        return null;
      }

      // 3. Quiet Hours Check (Urgent priority bypasses quiet hours)
      const priority = explicitPriority || content.priority;
      if (priority !== 'urgent' && this.isQuietHours(prefs)) {
        console.log(`[NotificationEngine] Non-urgent event ${type} suppressed due to Quiet Hours`);
        return null;
      }

      // 4. Deduplication Check (Action events use 15s window, passive alerts use 10m window)
      const now = Date.now();
      const isUserAction = [
        'SessionStarted',
        'SessionEnded',
        'GoalCompleted',
        'WaterReminder',
        'AchievementUnlocked',
        'PartnerStarted',
        'PartnerCompletedTask',
      ].includes(type);

      const dedupWindow = isUserAction ? 15 * 1000 : DEDUPLICATION_WINDOW_MS;
      const dedupHash = `${userId}:${type}:${event.targetId || (isUserAction ? Math.floor(now / 15000) : '')}`;
      const lastSent = deduplicationCache.get(dedupHash);
      if (lastSent && now - lastSent < dedupWindow) {
        console.log(`[NotificationEngine] Duplicate event ${type} suppressed within dedup window`);
        return null;
      }

      // 5. Anti-Spam Rate Limiter (Non-urgent events)
      if (priority !== 'urgent' && this.isRateLimited(userId)) {
        console.log(`[NotificationEngine] Event ${type} suppressed due to hourly rate limiting (max ${MAX_NOTIFICATIONS_PER_HOUR}/hr)`);
        return null;
      }

      // 6. AI Brain Evaluation
      const recentCount = this.getRecent24hCount(userId);
      const aiContext: AIBrainEvaluationContext = {
        userId,
        eventType: type,
        recentNotificationCount24h: recentCount,
        studyConsistencyScore: data.studyConsistencyScore,
        currentStreakDays: data.currentStreakDays,
        inactivityHours: data.inactivityHours,
        daysUntilExam: data.daysUntilExam,
        partnerProgressPercent: data.partnerProgressPercent,
        unfinishedGoalsCount: data.unfinishedGoalsCount,
      };

      const aiDecision = AINotificationBrain.evaluate(type, aiContext, prefs.relevance_threshold);
      if (!aiDecision.shouldSend) {
        console.log(`[NotificationEngine] Event ${type} suppressed by AI Brain score: ${aiDecision.relevanceScore} < ${prefs.relevance_threshold}. Reason: ${aiDecision.reason}`);
        return null;
      }

      // Record in deduplication and rate-limiting history
      deduplicationCache.set(dedupHash, now);
      this.recordNotificationTimestamp(userId, now);

      // 7. Multi-Channel Dispatch
      let record: NotificationRecord | null = null;

      // Channel A: In-App Database Storage & Local Cache
      if (prefs.in_app_enabled) {
        record = await this.saveNotificationToDatabase({
          user_id: userId,
          type,
          title: content.title,
          body: content.body,
          priority: aiDecision.recommendedPriority,
          category,
          channel: aiDecision.recommendedChannel,
          relevance_score: aiDecision.relevanceScore,
          data,
          action_url: content.actionUrl,
        });

        if (record) {
          useNotificationStore.setState((state) => ({
            notifications: [record!, ...state.notifications.filter((n) => n.id !== record!.id)],
            unreadCount: state.unreadCount + 1,
          }));
        }

        // Invalidate React Query cache so UI updates in real-time
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      }

      // Channel B: Push Notification Dispatch (Lock screen)
      if (prefs.push_enabled && (aiDecision.recommendedChannel === 'push' || aiDecision.recommendedChannel === 'both')) {
        await this.dispatchPushNotification({
          title: content.title,
          body: content.body,
          data: { ...data, type, actionUrl: content.actionUrl },
          priority: aiDecision.recommendedPriority,
        });
      }

      return record;
    } catch (err) {
      console.error('[NotificationEngine] Error processing event:', err);
      return null;
    }
  }

  /** Dispatch Push Notification via Expo Notifications or Web Notification API */
  public static async dispatchPushNotification({
    title,
    body,
    data,
    priority,
  }: {
    title: string;
    body: string;
    data: Record<string, any>;
    priority: string;
  }) {
    try {
      if (Platform.OS === 'web') {
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(title, { body, icon: '/favicon.ico', data });
        }
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: priority === 'urgent' || priority === 'high' ? Notifications.AndroidNotificationPriority.HIGH : Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });
    } catch (err) {
      console.warn('[NotificationEngine] Push dispatch warning:', err);
    }
  }

  /** Schedule a delayed notification reminder */
  public static async scheduleDelayedReminder(
    event: AppNotificationEventPayload,
    delaySeconds: number,
  ) {
    if (Platform.OS === 'web') {
      setTimeout(async () => {
        await this.processEvent(event);
      }, delaySeconds * 1000);
      return;
    }

    try {
      const content = generateNotificationContent(event.type, event.data || {});
      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: { ...event.data, type: event.type },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, Math.floor(delaySeconds)),
          repeats: false,
        },
      });
    } catch (err) {
      console.warn('[NotificationEngine] Schedule delayed reminder fallback:', err);
      setTimeout(async () => {
        await this.processEvent(event);
      }, delaySeconds * 1000);
    }
  }

  /** Check if category is enabled in user preferences */
  private static checkCategoryPreference(
    category: NotificationCategory,
    prefs: NotificationPreferences,
  ): boolean {
    switch (category) {
      case 'partner':
        return prefs.partner_enabled;
      case 'water':
        return prefs.water_reminders_enabled;
      case 'study':
        return prefs.study_reminders_enabled;
      case 'ai_coach':
        return prefs.ai_coaching_enabled;
      case 'reports':
        return prefs.daily_reports_enabled || prefs.weekly_reports_enabled;
      case 'achievements':
        return prefs.achievement_enabled;
      case 'social':
        return prefs.social_activity_enabled;
      default:
        return true;
    }
  }

  /** Check if current time falls within Quiet Hours */
  private static isQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quiet_hours_enabled) return false;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = prefs.quiet_hours_start.split(':').map(Number);
    const [endH, endM] = prefs.quiet_hours_end.split(':').map(Number);

    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins <= endMins;
    } else {
      // Overnight range e.g., 22:00 to 07:00
      return currentMins >= startMins || currentMins <= endMins;
    }
  }

  /** Check rate limit for non-urgent notifications */
  private static isRateLimited(userId: string): boolean {
    const timestamps = userNotificationHistory.get(userId) || [];
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = timestamps.filter((t) => t > oneHourAgo);
    return recent.length >= MAX_NOTIFICATIONS_PER_HOUR;
  }

  private static getRecent24hCount(userId: string): number {
    const timestamps = userNotificationHistory.get(userId) || [];
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    return timestamps.filter((t) => t > twentyFourHoursAgo).length;
  }

  private static recordNotificationTimestamp(userId: string, timestamp: number) {
    if (!userNotificationHistory.has(userId)) {
      userNotificationHistory.set(userId, []);
    }
    const list = userNotificationHistory.get(userId)!;
    list.push(timestamp);
    // Keep last 100 timestamps
    if (list.length > 100) {
      userNotificationHistory.set(userId, list.slice(list.length - 100));
    }
  }

  /** Fetch or initialize notification preferences from Supabase */
  public static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await (supabase as any).rpc('get_or_create_notification_preferences', {
        p_user_id: userId,
      });

      if (!error && data) {
        return data as unknown as NotificationPreferences;
      }
    } catch (e) {
      // Fall through to defaults
    }

    // Default Fallback
    return {
      user_id: userId,
      push_enabled: true,
      in_app_enabled: true,
      partner_enabled: true,
      water_reminders_enabled: true,
      study_reminders_enabled: true,
      ai_coaching_enabled: true,
      daily_reports_enabled: true,
      weekly_reports_enabled: true,
      achievement_enabled: true,
      social_activity_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      relevance_threshold: 0.6,
    };
  }

  /** Save notification to Supabase database (with local fallback record guarantee) */
  private static async saveNotificationToDatabase(notif: {
    user_id: string;
    type: string;
    title: string;
    body: string;
    priority: NotificationPriority;
    category: NotificationCategory;
    channel: NotificationChannel;
    relevance_score: number;
    data: Record<string, any>;
    action_url?: string;
  }): Promise<NotificationRecord> {
    const fallbackRecord: NotificationRecord = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: notif.user_id,
      type: notif.type,
      title: notif.title,
      body: notif.body,
      priority: notif.priority,
      category: notif.category,
      channel: notif.channel,
      relevance_score: notif.relevance_score,
      data: notif.data,
      action_url: notif.action_url,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    try {
      const payloadData = {
        ...(notif.data || {}),
        priority: notif.priority,
        category: notif.category,
        channel: notif.channel,
        relevance_score: notif.relevance_score,
        action_url: notif.action_url,
      };

      const { data, error } = await (supabase.from('notifications') as any)
        .insert({
          user_id: notif.user_id,
          type: notif.type,
          title: notif.title,
          body: notif.body,
          data: payloadData,
        })
        .select()
        .single();

      if (!error && data) {
        return {
          id: data.id,
          user_id: data.user_id,
          type: data.type,
          title: data.title,
          body: data.body,
          priority: notif.priority,
          category: notif.category,
          channel: notif.channel,
          relevance_score: notif.relevance_score,
          data: data.data || payloadData,
          action_url: notif.action_url,
          created_at: data.created_at || fallbackRecord.created_at,
          read_at: data.read_at || null,
        };
      } else if (error) {
        console.warn('[NotificationEngine] DB insert error, using local fallback:', error.message);
      }
    } catch (err) {
      console.warn('[NotificationEngine] DB insert fallback to local record:', err);
    }

    return fallbackRecord;
  }
}

// Auto-initialize engine on import
NotificationEngine.initialize();
