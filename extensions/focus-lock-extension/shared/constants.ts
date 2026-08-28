export const APP_BLOCKER_CONSTANTS = {
  ALARM_NAME: 'focus_lock_unlock',
  STORAGE_KEYS: {
    ACTIVE: 'active',
    ENDS_AT: 'endsAt',
    BLOCKED_DOMAINS: 'blockedDomains',
    BLOCKED_CATEGORIES: 'blockedCategories',
    CUSTOM_DOMAINS: 'customDomains',
    IS_COMPLETED: 'isCompleted',
  },
} as const;

export interface CategoryDefinition {
  id: string;
  name: string;
  defaultDomains: string[];
}

export const PREDEFINED_CATEGORIES: CategoryDefinition[] = [
  {
    id: 'social',
    name: 'Social Media',
    defaultDomains: [
      'facebook.com',
      'twitter.com',
      'instagram.com',
      'tiktok.com',
      'reddit.com',
      'linkedin.com',
    ],
  },
  {
    id: 'video',
    name: 'Video & Streaming',
    defaultDomains: [
      'youtube.com',
      'netflix.com',
      'twitch.tv',
      'vimeo.com',
      'hulu.com',
      'disneyplus.com',
    ],
  },
  {
    id: 'gaming',
    name: 'Gaming',
    defaultDomains: [
      'roblox.com',
      'minecraft.net',
      'steamcommunity.com',
      'discord.com',
      'epicgames.com',
    ],
  },
  {
    id: 'shopping',
    name: 'Shopping',
    defaultDomains: ['amazon.com', 'ebay.com', 'aliexpress.com', 'walmart.com', 'target.com'],
  },
  {
    id: 'news',
    name: 'News',
    defaultDomains: ['nytimes.com', 'cnn.com', 'bbc.co.uk', 'reuters.com', 'bloomberg.com'],
  },
  {
    id: 'custom',
    name: 'Custom Sites',
    defaultDomains: [],
  },
];
