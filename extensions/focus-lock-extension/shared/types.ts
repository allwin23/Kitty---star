export type FocusSessionStatus = 'IDLE' | 'STARTING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'RECOVERING';

export interface FocusSession {
  id: string;
  userId: string;
  startedAt: string; // ISO UTC string
  endsAt: number; // Epoch Milliseconds
  status: FocusSessionStatus;
  blockedCategories: string[];
  customDomains: string[];
  strictMode: boolean;
}

export interface FocusProfile {
  id: string;
  userId: string;
  name: string;
  blockedCategories: string[];
  customSites: string[];
  strictMode: boolean;
}

export interface BlockedCategory {
  id: string;
  name: string;
  defaultDomains: string[];
}

export interface SiteDefinition {
  domain: string;
  category: string;
}

export interface EnforcementState {
  isBlocked: boolean;
  activeSessionId: string | null;
  endsAt: number;
  strictMode: boolean;
}

export interface DbCategory {
  id: string;
  name: string;
  created_at: string;
}

export interface DbSite {
  id: string;
  category_id: string;
  domain: string;
  created_at: string;
}

export interface DbFocusProfile {
  id: string;
  user_id: string;
  name: string;
  strict_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbFocusSession {
  id: string;
  user_id: string;
  profile_id: string | null;
  started_at: string;
  ends_at: string;
  status: 'idle' | 'starting' | 'active' | 'completed' | 'cancelled';
  strict_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbUserSettings {
  user_id: string;
  is_blocker_enabled: boolean;
  created_at: string;
  updated_at: string;
}
