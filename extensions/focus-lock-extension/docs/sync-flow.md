# Focus Lock — Sync & State Flow Specification

This document defines how the Chromium extension synchronizes focus sessions with Supabase Realtime securely and resolutely.

---

## 1. Remote-to-Local State Synchronization Flow

The extension monitors changes to the user's `focus_sessions` table in the database. When an event fires, it undergoes validation before being resolved locally:

```text
       Supabase Database Event (Insert/Update/Delete)
                             │
                             ▼
     Validation Check (EndsAt valid? User matches auth?)
                             │
            ┌────────────────┴────────────────┐
            ▼ (Valid)                         ▼ (Invalid/Expired)
   Evaluate Session Status            Complete Local Session
            │
            ├─► active: Calculate local endsAt. Reconcile if diff > 2 seconds.
            ├─► completed: Trigger completeFocusSession locally.
            └─► cancelled: Trigger cancelFocusSession locally.
```

---

## 2. Robust Handling of Edge Cases

### Reconnections

- When the WebSocket connection is established or reconnected after dropouts, the `SyncManager` fires a manual `syncLatestSession()` fetch query to the database, ensuring any session modifications that occurred during the disconnect are reconciled immediately.

### Stale and Duplicate Events

- To prevent duplicate calls or out-of-order events from creating glitches (e.g. dynamic rule refreshes), the manager maps current local configurations against remote parameters.
- If `active === true`, the endsAt diff is less than 2 seconds, and blocked categories/domains lists match, the sync update is discarded.

### Network and Supabase Outages (The Fail-safe Principle)

- If the user disconnects the internet, gets firewalled, or the database goes down:
  - The WebSocket channel disconnects.
  - Realtime updates cease.
  - **Critical Integrity Rule:** The extension **never** clears dynamic NetRequest blocks upon connection drops. The local `chrome.alarms` scheduler remains the sole authority for unlocking the browser, ensuring offline conditions cannot be abused to bypass locks.
