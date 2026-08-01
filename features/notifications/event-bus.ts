import type { AppNotificationEventPayload, NotificationEventType } from './types';
import { useCompanionQueueStore } from '@/features/companion/companion-queue-store';

type EventCallback = (event: AppNotificationEventPayload) => void | Promise<void>;

class CentralEventBus {
  private listeners: Map<NotificationEventType | '*', Set<EventCallback>> = new Map();

  /** Emit an app event to all registered listeners and the Notification Engine */
  public emit(eventPayload: Omit<AppNotificationEventPayload, 'timestamp'> & { timestamp?: number }) {
    const fullPayload: AppNotificationEventPayload = {
      timestamp: Date.now(),
      ...eventPayload,
    };

    // Specific event listeners
    const typeListeners = this.listeners.get(fullPayload.type);
    if (typeListeners) {
      typeListeners.forEach((callback) => {
        try {
          void callback(fullPayload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for ${fullPayload.type}:`, err);
        }
      });
    }

    // Global wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => {
        try {
          void callback(fullPayload);
        } catch (err) {
          console.error(`[EventBus] Error in wildcard listener:`, err);
        }
      });
    }
  }

  /** Subscribe to a specific notification event type or '*' for all events */
  public on(eventType: NotificationEventType | '*', callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /** Unsubscribe a listener */
  public off(eventType: NotificationEventType | '*', callback: EventCallback) {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.delete(callback);
      if (typeListeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /** Remove all listeners */
  public clearAll() {
    this.listeners.clear();
  }
}

export const EventBus = new CentralEventBus();

// Auto-forward app notification events into CompanionQueueStore
EventBus.on('*', (event) => {
  try {
    const mapType: Record<string, string> = {
      SessionStarted: 'ToolPomodoroStarted',
      SessionEnded: 'ToolPomodoroCompleted',
      GoalCompleted: 'ToolTaskCompleted',
      WaterReminder: 'ToolWaterLogged',
      AchievementUnlocked: 'PartnerSentAward',
    };
    const targetKey = mapType[event.type] || 'NotificationAlert';
    useCompanionQueueStore.getState().enqueueEvent(targetKey);
  } catch (e) {
    console.warn('[EventBus] Forward error:', e);
  }
});
