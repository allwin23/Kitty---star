# Focus Lock — State Machine Specification

Focus Lock operates as a deterministic state machine to ensure blocking integrity across network failures, browser crashes, and background runtime suspensions.

## 1. Focus Session States

```text
       ┌───────────────┐
       │     IDLE      ◄──────────────────────────┐
       └───────┬───────┘                          │
               │ Start Session                    │
               ▼                                  │
       ┌───────────────┐                          │
       │   STARTING    │                          │
               │                                  │
               ▼                                  │
       ┌───────────────┐                          │
       │    ACTIVE     │                          │
       └───────┬───────┘                          │
               │                                  │
        ┌──────┴──────┐                           │
        │             │                           │
        ▼             ▼                           │
   Expires         Cancelled                      │
        │             │                           │
        ▼             ▼                           │
 ┌─────────────┐ ┌─────────────┐                  │
 │  COMPLETED  │ │  CANCELLED  │                  │
 └──────┬──────┘ └──────┬──────┘                  │
        │               │                         │
        └───────────────┴─────────────────────────┘
```

| State            | Description                                                                                                                      |
| :--------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **`IDLE`**       | Initial resting state. No focus sessions active. Blocked sites are accessible.                                                   |
| **`STARTING`**   | Handshake transition. Focus requested via Mobile/DB, extension loads configurations.                                             |
| **`ACTIVE`**     | Blocker is actively enforced locally. DNR rules block target domains. Local alarm scheduled.                                     |
| **`COMPLETED`**  | The session duration has run its course. Blocker rules are cleared and state returns to `IDLE`.                                  |
| **`CANCELLED`**  | Session aborted early by a valid, authenticated user request. Blocker rules are cleared.                                         |
| **`RECOVERING`** | Startup state. Checks storage on browser restart. Restores `ACTIVE` or clears to `COMPLETED` depending on timestamp comparisons. |

---

## 2. Transition Validation Matrix

- **`IDLE` ➔ `STARTING`:** Valid on start request.
- **`STARTING` ➔ `ACTIVE`:** Valid once rules are mapped and alarms are registered.
- **`ACTIVE` ➔ `COMPLETED`:** Valid when local timer matching `endsAt` expires.
- **`ACTIVE` ➔ `CANCELLED`:** Valid _only_ if strict mode is disabled and a valid cancellation token is received.
- **`ACTIVE` ➔ `RECOVERING`:** Valid if browser crashes/closes or service worker reload occurs.

---

## 3. Resiliency Behaviors

### Browser / Service Worker Restart

On startup, the background script checks `chrome.storage.local`:

- If `endsAt` is in the future (`Date.now() < endsAt`), transition to `ACTIVE`, calculate remaining duration, and reset rules and alarms.
- If `endsAt` has passed, transition to `COMPLETED` and clear all blocking rules.

### Network Loss

Focus session states are **offline-first once activated**. If the internet drops:

- The extension keeps blocking domains.
- The local `chrome.alarms` timer runs independently of server contact.
- The extension unlocks only when the local system clock matches `endsAt`.

### Out-of-Order / Duplicate Events

All incoming events carry a monotonically increasing database sequence index or updated timestamp (`updated_at`). Events with timestamps older than the active local session start are immediately discarded.
