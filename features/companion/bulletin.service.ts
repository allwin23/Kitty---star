import type { AnnouncementItem } from './types';

const announcementHistory: AnnouncementItem[] = [];

export const bulletinService = {
  /** Record an announcement in local history */
  recordHistory(item: AnnouncementItem) {
    announcementHistory.unshift(item);
    if (announcementHistory.length > 50) {
      announcementHistory.pop();
    }
  },

  /** Get history list */
  getHistory(): AnnouncementItem[] {
    return [...announcementHistory];
  },

  /** Clear announcement history */
  clearHistory() {
    announcementHistory.length = 0;
  },
};
