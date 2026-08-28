import type { CompanionEventPayload, CompanionEventType } from './types';
import { useCompanionQueueStore } from './companion-queue-store';

type CompanionEventCallback = (event: CompanionEventPayload) => void | Promise<void>;

class CompanionEventBus {
  private listeners: Map<CompanionEventType | '*', Set<CompanionEventCallback>> = new Map();
  private cooldownTracker: Map<string, number> = new Map();

  /** Emit a companion event to all registered listeners & scheduler */
  public emit(event: Omit<CompanionEventPayload, 'timestamp'> & { timestamp?: number }) {
    const fullEvent: CompanionEventPayload = {
      timestamp: Date.now(),
      cooldown: 5000, // 5 seconds default cooldown
      ...event,
    };

    // Cooldown check for non-critical events
    if (fullEvent.priority !== 'critical' && fullEvent.cooldown) {
      const lastTriggered = this.cooldownTracker.get(fullEvent.eventType) || 0;
      if (Date.now() - lastTriggered < fullEvent.cooldown) {
        console.log(
          `[CompanionEventBus] Event ${fullEvent.eventType} suppressed by cooldown (${fullEvent.cooldown}ms)`,
        );
        return;
      }
    }

    this.cooldownTracker.set(fullEvent.eventType, Date.now());

    // Type-specific listeners
    const typeListeners = this.listeners.get(fullEvent.eventType);
    if (typeListeners) {
      typeListeners.forEach((cb) => {
        try {
          void cb(fullEvent);
        } catch (err) {
          console.error(`[CompanionEventBus] Error in listener for ${fullEvent.eventType}:`, err);
        }
      });
    }

    // Wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((cb) => {
        try {
          void cb(fullEvent);
        } catch (err) {
          console.error('[CompanionEventBus] Error in wildcard listener:', err);
        }
      });
    }
  }

  /** Subscribe to a companion event type */
  public on(eventType: CompanionEventType | '*', callback: CompanionEventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.off(eventType, callback);
    };
  }

  public off(eventType: CompanionEventType | '*', callback: CompanionEventCallback) {
    const list = this.listeners.get(eventType);
    if (list) {
      list.delete(callback);
      if (list.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  public clearAll() {
    this.listeners.clear();
    this.cooldownTracker.clear();
  }
}

export const CompanionBus = new CompanionEventBus();

// Auto-forward companion and app events into CompanionQueueStore
CompanionBus.on('*', (event) => {
  try {
    const mapType: Record<string, string> = {
      WaterBreak: 'ToolWaterLogged',
      DailyGoalAchieved: 'ToolTaskCompleted',
      XPEarned: 'ToolPyqCompleted',
      MascotTap: 'IdleDefault',
    };
    const targetKey = mapType[event.eventType] || event.eventType;
    useCompanionQueueStore.getState().enqueueEvent(targetKey, {
      subtext: (event.payload as any)?.customText,
    });
  } catch (e) {
    console.warn('[CompanionBus] Queue forward error:', e);
  }
});
