import type { AnnouncementItem, CompanionPriority } from './types';

const PRIORITY_ORDER: Record<CompanionPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

export class CompanionNotificationQueue {
  private queue: AnnouncementItem[] = [];
  private activeAnnouncement: AnnouncementItem | null = null;
  private deduplicationSet: Set<string> = new Set();

  /** Push new item into priority queue */
  public enqueue(item: AnnouncementItem): { shouldInterrupt: boolean } {
    // 1. Event Deduplication check
    const dedupKey = `${item.eventType}:${item.title}`;
    if (this.deduplicationSet.has(dedupKey) && item.priority !== 'critical') {
      console.log(`[CompanionNotificationQueue] Duplicate item ${dedupKey} rejected`);
      return { shouldInterrupt: false };
    }
    this.deduplicationSet.add(dedupKey);
    setTimeout(() => this.deduplicationSet.delete(dedupKey), 15000); // 15s dedup window

    // 2. Check if critical item should interrupt current active item
    if (
      this.activeAnnouncement &&
      PRIORITY_ORDER[item.priority] > PRIORITY_ORDER[this.activeAnnouncement.priority] &&
      item.priority === 'critical'
    ) {
      console.log(
        `[CompanionNotificationQueue] CRITICAL event ${item.eventType} interrupting current announcement ${this.activeAnnouncement.eventType}`,
      );
      // Push interrupted active item back to front of queue if not expired
      if (this.activeAnnouncement.expiresAt > Date.now()) {
        this.queue.unshift(this.activeAnnouncement);
      }
      this.activeAnnouncement = item;
      return { shouldInterrupt: true };
    }

    // 3. Otherwise add to queue and sort by priority & recency
    this.queue.push(item);
    this.sortQueue();
    return { shouldInterrupt: false };
  }

  /** Pop the highest priority non-expired item */
  public dequeue(): AnnouncementItem | null {
    this.purgeExpired();
    if (this.queue.length === 0) {
      this.activeAnnouncement = null;
      return null;
    }

    const item = this.queue.shift()!;
    this.activeAnnouncement = item;
    return item;
  }

  /** Get current active announcement */
  public getActive(): AnnouncementItem | null {
    if (this.activeAnnouncement && this.activeAnnouncement.expiresAt <= Date.now()) {
      this.activeAnnouncement = null;
    }
    return this.activeAnnouncement;
  }

  /** Clear current active item */
  public clearActive() {
    this.activeAnnouncement = null;
  }

  /** Remove expired items from queue */
  private purgeExpired() {
    const now = Date.now();
    this.queue = this.queue.filter((item) => item.expiresAt > now);
  }

  /** Sort queue by priority DESC, then createdAt DESC */
  private sortQueue() {
    this.queue.sort((a, b) => {
      const pDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      if (pDiff !== 0) return pDiff;
      return b.createdAt - a.createdAt;
    });
  }

  public getQueueLength(): number {
    this.purgeExpired();
    return this.queue.length;
  }

  public clearAll() {
    this.queue = [];
    this.activeAnnouncement = null;
    this.deduplicationSet.clear();
  }
}
