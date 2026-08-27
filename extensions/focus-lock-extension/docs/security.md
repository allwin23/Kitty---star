# Focus Lock — Security Architecture Spec

This document details the security model, permission management, and anti-bypass considerations for Focus Lock.

## 1. Secrets and Keys Management
* **Strict Principle:** No service-role API keys, admin database credentials, or private decryption secrets are permitted inside the extension or mobile client.
* **Anonymous Client Operations:** The extension communicates with Supabase using the anon public key (`SUPABASE_ANON_KEY`). Row Level Security (RLS) handles identity checks.

---

## 2. Row-Level Security (RLS) Database Policies

To prevent unauthorized actions and data leakage, database tables must enforce the following policies:

### `focus_sessions` Table
* **Select (Read):** Users can only read focus sessions where `user_id = auth.uid()`.
  ```sql
  create policy "Users can read own sessions"
  on focus_sessions for select
  using (auth.uid() = user_id);
  ```
* **Insert (Write):** Users can insert rows if `user_id` matches their authenticated uid.
  ```sql
  create policy "Users can insert own sessions"
  on focus_sessions for insert
  with check (auth.uid() = user_id);
  ```
* **Update:** Allowed only if `user_id = auth.uid()` and strict mode constraints are validated.

### `focus_profiles` Table
* **Select/Insert/Update/Delete:** Fully scoped to `auth.uid() = user_id`.

---

## 3. Realtime Authorization
Supabase Realtime listens to the user's specific authenticated session:
* The channel subscription is scoped with a user parameter Filter: `focus_sessions:user_id=eq.YOUR_USER_ID`.
* Row Level Security applies to realtime broadcasts, ensuring a user cannot intercept another user's session start/stop events.

---

## 4. Local Enforcement & Anti-Bypass
* **Authoritative Local State:** The active session's lock configuration is stored in `chrome.storage.local` which is inaccessible by standard web pages.
* **Offline-Security:** Loss of network connection must never trigger an automatic unblock. The local alarm scheduling via `chrome.alarms` enforces locks until the scheduled expiration epoch is reached.
* **Tampering Mitigation:** 
  * Declarative dynamic rules are managed inside the background script service worker, away from browser page contexts.
  * In strict mode, the mobile client disables early session cancellation options.
