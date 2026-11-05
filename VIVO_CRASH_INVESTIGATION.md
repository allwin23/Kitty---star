# Pomodoro Navigation Crash Investigation Report (Vivo & Samsung)

## 1. Executive Summary & Exact Bug Reproduction Scenario

### The User-Reported Flow:
1. **Fresh Launch**: The user opens the app.
2. **Initial Navigation**: The user navigates to the Pomodoro timer screen. **No crash occurs**.
3. **Task Creation**: The user navigates to the Plan / Accountability screen and adds a new task to the todo list.
4. **Return Navigation**: The user navigates back to the Pomodoro timer screen.
5. **Impact**: **The app immediately crashes on Vivo devices**, and later on Samsung devices (especially after ~3 days of usage).

### Why the Bug Behaves This Way:
* When the user opens the Pomodoro screen with **0 tasks** in today's plan, an early return runs at line 827 of `app/(app)/pomodoro.tsx`:
  ```tsx
  if (currentTasks.length === 0) {
    return <Screen centered><EmptyState title="No tasks in plan" ... /></Screen>;
  }
  ```
  In this state, **none** of the main Pomodoro components, timer cards, task lists, or progress bars are mounted.
* When the user adds a task on the Plan page, `currentTasks.length` becomes `1`.
* Upon returning to the Pomodoro page, the full screen (lines 850–1734) renders for the very first time with task data.
* Multiple concurrent lifecycle events, unvalidated native module calls, and potential Yoga layout calculations fire simultaneously, triggering the native Android process termination.

---

## 2. Angle 1: Vivo-Specific Issues (FuntouchOS / OriginOS)

Vivo devices run **FuntouchOS** or **OriginOS**, which deviate significantly from stock Android in four critical areas:

### 2.1 Aggressive Low Memory Killer (LMK) & iManager
* Vivo embeds a proprietary system optimizer (`iManager`) that aggressively kills background surfaces, halts background threads, and enforces strict memory limits.
* When navigating from Pomodoro → Plan → Adding a Task (which triggers software keyboard popups, form mutations, and query cache refetches), Vivo aggressively destroys or detaches the background activity's Window Token.

### 2.2 `WindowManager.BadTokenException` via `Alert.alert()`
* In React Native, `Alert.alert()` maps directly to Android's native `AlertDialog.Builder`.
* In `stores/pomodoro-store.ts` (lines 325–327), `checkAndLogExpiredTimer` executes `Alert.alert('Session Complete! 🍅', typeLabel)` **directly inside a Zustand background store action**.
* If `checkAndLogExpiredTimer` completes while the user is transitioning between tabs, or if the Activity window is detached or transitioning:
  ```
  android.view.WindowManager$BadTokenException: Unable to add window -- token android.os.BinderProxy is not valid; is your activity running?
  ```
  This is a fatal, uncaught Java exception on Android that bypasses React and kills the app process immediately.

### 2.3 `NativeModules.AppBlocker` Null ReactContext
* In `app/(app)/pomodoro.tsx` (lines 409–424):
  ```typescript
  useEffect(() => {
    if (Platform.OS !== 'android' || !NativeModules.AppBlocker) return;
    if (isBlockerEnabled && isRunning && ...) {
      NativeModules.AppBlocker.startBlockingService(blockedPackages);
    } else {
      NativeModules.AppBlocker.stopBlockingService();
    }
  }, [isBlockerEnabled, isRunning, isPaused, sessionType, blockedPackages]);
  ```
* When `pomodoro.tsx` mounts with `isRunning = false`, it calls `NativeModules.AppBlocker.stopBlockingService()` **without any try/catch guard**.
* In `AppBlockerModule.kt` (lines 137–144), if `reactApplicationContext` is unlinked or in teardown state during rapid tab switching on Vivo, calling native methods throws an unhandled bridge exception.

### 2.4 Yoga Layout Engine `NaN%` Crash
* In `app/(app)/pomodoro.tsx` (line 1200):
  ```typescript
  const estMins = task.estimated_minutes;
  const compMins = task.completed_minutes;
  const taskProgressPct = Math.min(100, Math.round((compMins / estMins) * 100));
  ```
  And line 1342:
  ```tsx
  <View style={{ width: `${taskProgressPct}%` }} />
  ```
* If a newly created task has `estimated_minutes` equal to `0`, `null`, or undefined, `(compMins / estMins)` results in `NaN`.
* Passing `width: 'NaN%'` into React Native's C++ **Yoga layout engine** on Android throws:
  ```
  com.facebook.yoga.YogaLayoutInvalidException: Unknown percentage length: NaN%
  ```
  This crashes the native UI thread instantly.

---

## 3. Angle 2: Why the Bug Disappeared and Returned After 3 Days

### 3.1 The "Fixed for 3 Days" Mystery Explained
1. **Fresh State After Code Fix**:
   When the previous patch was deployed, AsyncStorage was temporarily in a clean state (`isRunning = false`, `targetEndTime = null`).
2. **Zombie Timers Persisted in AsyncStorage**:
   `stores/pomodoro-store.ts` persists `isRunning`, `targetEndTime`, `selectedTaskId`, and `startedAt` to AsyncStorage (`pomodoro-timer-storage`).
3. **The 3-Day Mark & Date Rollover**:
   When a user starts a timer and leaves the app (or the app is force-stopped by the OS):
   * `targetEndTime` remains frozen in storage as a timestamp from **days ago**.
   * `selectedTaskId` points to a task ID from **a past date's plan** that no longer exists in today's `current_tasks`.
4. **Samsung "Deep Sleeping Apps" Trigger**:
   Samsung OneUI automatically places apps into **"Deep Sleep"** if they are inactive or unused for **3 days**. When an app is awakened from deep sleep or re-opened after 3 days:
   * The process is cold-booted.
   * `onRehydrateStorage` fires with a `targetEndTime` that is 72 hours old.
   * It immediately calls `checkAndLogExpiredTimer()`, which attempts to match a 3-day-old task against today's plan, throws an error, and triggers native dialogs on unmounted screens.

---

## 4. Angle 3: Redis / Cache / Storage-Based Bugs

Although the app does not run an external Redis server on the client, it relies on two primary client caching and persistence layers:

### 4.1 AsyncStorage Cache Poisoning (Zustand Persist)
* Zustand's `persist` middleware stores state in Android's internal SQLite database (`RKStorage`).
* There is **no schema versioning** (`version: 1`, `migrate: ...`) in `usePomodoroStore`.
* When stale timestamps or dangling task UUIDs enter AsyncStorage, they persist indefinitely until explicitly overwritten.

### 4.2 React Query Invalidation Storm
* When returning to Pomodoro, `useFocusEffect` calls:
  ```typescript
  void currentPlanQ.refetch();
  usePomodoroStore.getState().syncBackgroundTime();
  ```
* At the same time, the global 5-second interval in `_layout.tsx` is also calling `syncBackgroundTime()`.
* If both calls determine that the timer has ended, both invoke `checkAndLogExpiredTimer()`, which fires **6 separate query invalidations** simultaneously:
  ```typescript
  queryClient.invalidateQueries({ queryKey: queryKeys.currentPlan(today) });
  queryClient.invalidateQueries({ queryKey: queryKeys.partnerPlan(today) });
  queryClient.invalidateQueries({ queryKey: queryKeys.reports });
  queryClient.invalidateQueries({ queryKey: queryKeys.userStats });
  queryClient.invalidateQueries({ queryKey: queryKeys.achievements });
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
  ```
  This flooding of network requests during screen navigation exhausts mobile network sockets and triggers race conditions.

---

## 5. Angle 4: Installation & Cache-Clearing Requirements

### 5.1 "Clear Cache" vs. "Clear Storage / Clear Data"
* **"Clear Cache" in Android Settings**: Only deletes temporary image and network cache files in `/cache`. It **does NOT** touch AsyncStorage.
* **"Clear Storage / Clear Data"**: Deletes `/data/data/com.studypartner.app/databases/RKStorage`, which completely clears corrupted Zustand state.

### 5.2 Why Users Should NOT Need to Manually Clear Data
A robust production app must **self-heal**. We must not ask end users to manually navigate into Android Settings to clear storage.
* **Self-Healing Rule**: If rehydrated state shows `targetEndTime` is older than 2 hours (or from a previous calendar day), the store must automatically discard the stale session and reset to a clean default state.

---

## 6. Comprehensive Architectural Fix Plan

| Step | File | Action |
| :--- | :--- | :--- |
| **Fix 1** | `stores/pomodoro-store.ts` | **Remove `Alert.alert()` from Store**: Stores must never invoke native UI dialogs directly. |
| **Fix 2** | `stores/pomodoro-store.ts` | **Add Reentrancy Mutex & Staleness Check**: Prevent concurrent runs of `checkAndLogExpiredTimer` and auto-purge any timer older than 2 hours. |
| **Fix 3** | `app/(app)/pomodoro.tsx` | **Defensive Yoga Layout Values**: Guard against `NaN%` or division by zero in task progress bars. |
| **Fix 4** | `app/(app)/pomodoro.tsx` | **Safeguard `NativeModules.AppBlocker`**: Wrap all native service calls in try/catch blocks. |
| **Fix 5** | `app/(app)/pomodoro.tsx` & `_layout.tsx` | **Deduplicate AppState Listeners**: Consolidate timer sync into a single source of truth. |
| **Fix 6** | `app/_layout.tsx` | **Add Global React ErrorBoundary**: Ensure that any UI-level render crash shows a recovery screen instead of terminating the app process. |
