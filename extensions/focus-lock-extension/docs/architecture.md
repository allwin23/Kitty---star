# Focus Lock — Technical Architecture

This document describes the decoupled layer architecture for Focus Lock, separating business logic from client/browser APIs.

## 1. System Layers

Focus Lock is organized into four distinct modules:

```text
┌────────────────────────────────────────────────────────┐
│               React Native Mobile Client               │
│  - User Auth                                           │
│  - Focus Configuration (Duration, Categories, Profiles)│
│  - Session Control Actions (Start, Pause, Stop)        │
└───────────────────────────┬────────────────────────────┘
                            │ (HTTPS REST / Realtime sync)
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Supabase Backend                    │
│  - User Profiles & Settings Persistence                 │
│  - Active Focus Sessions Status synchronization        │
│  - Row-Level Security (RLS) policies                   │
└───────────────────────────┬────────────────────────────┘
                            │ (Supabase Realtime Broadcast)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Chrome Extension background              │
│  - Realtime event listener                             │
│  - Storage mapping & Alarm scheduling                  │
│  - Core engine state routing                           │
└───────────────────────────┬────────────────────────────┘
                            │ (BrowserAdapter)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   Focus Lock Engine                    │
│  - Decoupled State Control (IDLE, ACTIVE, etc.)        │
│  - Dynamic Rule compiler (Translate domains to DNR)     │
└────────────────────────────────────────────────────────┘
```

### 1.1 Focus Lock Engine

- **File:** [`blocking/engine.ts`](../blocking/engine.ts)
- **Responsibility:** Pure business logic. Controls session state, evaluates timer expirations, compiles list domains, and dictates whether blocking rules should be active or inactive. It is completely isolated and does not interact with global namespaces like `chrome` or `window`.

### 1.2 Browser Adapter

- **File:** [`blocking/adapter.ts`](../blocking/adapter.ts)
- **Responsibility:** A clean boundary encapsulating browser hardware calls (`chrome.declarativeNetRequest`, `chrome.alarms`, `chrome.storage.local`, and `chrome.runtime`).
- **Implementation:** The `ChromiumAdapter` maps these APIs for Chrome, Microsoft Edge, and Brave. If support for other browser engines (like Safari or Firefox) is needed later, a new adapter class is simply plugged in without changing the core engine.

### 1.3 Supabase Layer

- **Responsibility:** Connection management, authenticated fetches, and channel broadcast hooks. Does not leak sql details to the core engine.

---

## 2. State & Data Flow

```text
User initiates focus (Mobile UI)
        │
        ▼
Supabase DB (Row Insertion)
        │
        ▼
Supabase Realtime Channel
        │
        ▼
Extension Sync Manager
        │
        ▼
CoreFocusEngine (Active state confirmation)
        │
        ▼
BrowserAdapter (Local alarms and dynamic NetRequest blocker rules set)
```
