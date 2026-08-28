# Focus Lock — Supabase Backend Specification

This document details the Supabase PostgreSQL database schemas, Row-Level Security (RLS) configurations, realtime synchronization subscriptions, and environment variables.

---

## 1. Database Schema & Relationships

The database represents a clean decoupling of global configuration categories (sites definitions) and user-specific profiles, sessions, and whitelists.

```text
  GLOBAL CONFIGURATION TABLES             USER-SPECIFIC CUSTOM TABLES
 ┌─────────────────────────┐             ┌─────────────────────────┐
 │       categories        │             │     focus_profiles      │
 │  - id (PK, text)        │             │  - id (PK, uuid)        │
 │  - name (text)          │             │  - user_id (FK, auth)   │
 └────────────┬────────────┘             │  - name (text)          │
              │                          │  - strict_mode (bool)   │
              │ (1-to-many)              └────────────┬────────────┘
              ▼                                       │
 ┌─────────────────────────┐                          │ (1-to-many)
 │          sites          │                          ▼
 │  - id (PK, uuid)        │             ┌─────────────────────────┐
 │  - category_id (FK)     │             │     focus_sessions      │
 │  - domain (text, unique)│             │  - id (PK, uuid)        │
 └─────────────────────────┘             │  - user_id (FK, auth)   │
                                         │  - profile_id (FK)      │
                                         │  - status (text)        │
                                         │  - ends_at (timestamptz)│
                                         └─────────────────────────┘
```

### 1.1 Global Mappings

- **`categories`:** Holds the primary category ids (e.g. `social`, `video`, `gaming`, `shopping`, `news`).
- **`sites`:** Maps predefined domains (e.g. `facebook.com`, `youtube.com`) to a specific global category.

### 1.2 User Profiles & Settings

- **`focus_profiles`:** Contains user-defined profiles detailing strict mode settings.
- **`focus_profile_categories`:** Junction table mapping focus profiles to categories to block.
- **`focus_profile_custom_sites`:** Links user-defined custom domains to a profile.
- **`user_settings`:** Enforces global state configs (e.g., `is_blocker_enabled`).

### 1.3 Realtime Sync Sessions

- **`focus_sessions`:** Records active sessions initiated from the mobile client. Stores absolute starting time (`started_at`) and ending time (`ends_at`).
- **`focus_session_categories`:** Stores categories blocked during the active session.
- **`focus_session_custom_sites`:** Stores custom domains blocked in the active session.

---

## 2. Row-Level Security (RLS) Policies

All tables operate under strict Row-Level Security constraints. General users have zero write permissions to global configuration lists.

| Table Name                       | SELECT Rule                               | INSERT / UPDATE / DELETE Rule        |
| :------------------------------- | :---------------------------------------- | :----------------------------------- |
| **`categories`**                 | Open to all authenticated users (`true`). | Denied (Requires admin privileges).  |
| **`sites`**                      | Open to all authenticated users (`true`). | Denied (Requires admin privileges).  |
| **`focus_profiles`**             | `auth.uid() = user_id`                    | `auth.uid() = user_id`               |
| **`focus_profile_categories`**   | Profile must belong to `auth.uid()`.      | Profile must belong to `auth.uid()`. |
| **`focus_profile_custom_sites`** | Profile must belong to `auth.uid()`.      | Profile must belong to `auth.uid()`. |
| **`focus_sessions`**             | `auth.uid() = user_id`                    | `auth.uid() = user_id`               |
| **`focus_session_categories`**   | Session must belong to `auth.uid()`.      | Session must belong to `auth.uid()`. |
| **`focus_session_custom_sites`** | Session must belong to `auth.uid()`.      | Session must belong to `auth.uid()`. |
| **`user_settings`**              | `auth.uid() = user_id`                    | `auth.uid() = user_id`               |

---

## 3. Realtime Broadcast Subscriptions

The extension subscribes to realtime database inserts, updates, and deletes for synchronization:

- **Scope Scoping:** The subscription is locked to the user ID using filtering:
  ```typescript
  const channel = supabase
    .channel('session_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'focus_sessions', filter: `user_id=eq.${user.id}` },
      (payload) => handleSessionChange(payload),
    )
    .subscribe();
  ```
- **Authentication Integrity:** Supabase Realtime respects row-level policies, guaranteeing that only the owner of the session row receives broadcast details.

---

## 4. Required Environment Variables

Add the following to your development configuration files (such as `.env` and `local.properties`):

```ini
# Realtime Synced DB Details
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
```
