import { create } from 'zustand';
import { CAT_SCENARIOS, DYNAMIC_IDLE_POOL, type CatScenario } from './cat-scenarios';

export interface CompanionQueueStore {
  activeScenario: CatScenario;
  queue: CatScenario[];
  
  /** Push a scenario or event type into presentation queue */
  enqueueEvent: (eventType: string, customText?: { headline?: string; subtext?: string }) => void;
  
  /** Advance to next queued scenario (filtering out expired time-based routine events) */
  nextScenario: () => void;

  /** Clear all queued scenarios */
  clearQueue: () => void;
}

/** Check if a routine scenario is currently valid based on local clock hour */
function isRoutineValid(scenario: CatScenario): boolean {
  if (scenario.validFromHour === undefined || scenario.validToHour === undefined) {
    return true; // Non-time constrained
  }

  const currentHour = new Date().getHours();
  const { validFromHour, validToHour } = scenario;

  if (validFromHour <= validToHour) {
    return currentHour >= validFromHour && currentHour < validToHour;
  } else {
    // Overnight interval (e.g. 22:00 to 05:00)
    return currentHour >= validFromHour || currentHour < validToHour;
  }
}

/** Get default routine or idle scenario based on current local hour */
export function getDefaultTimeBasedScenario(): CatScenario {
  const currentHour = new Date().getHours();

  if (currentHour >= 6 && currentHour < 10) return CAT_SCENARIOS.RoutineMorning;
  if (currentHour >= 13 && currentHour < 14) return CAT_SCENARIOS.RoutineLunch;
  if (currentHour >= 17 && currentHour < 19) return CAT_SCENARIOS.RoutineEvening;
  if (currentHour >= 22 || currentHour < 5) return CAT_SCENARIOS.RoutineNight;

  return CAT_SCENARIOS.IdleDefault;
}

let idleIndex = 0;

export const useCompanionQueueStore = create<CompanionQueueStore>((set, get) => ({
  activeScenario: getDefaultTimeBasedScenario(),
  queue: [],

  enqueueEvent: (eventType: string, customText?: { headline?: string; subtext?: string }) => {
    const template = CAT_SCENARIOS[eventType] || CAT_SCENARIOS.IdleDefault;
    const scenario: CatScenario = {
      ...template,
      headline: customText?.headline || template.headline,
      subtext: customText?.subtext || template.subtext,
    };

    // If it's a routine scenario and currently expired, do not queue
    if (scenario.tag === '[ROUTINE]' && !isRoutineValid(scenario)) {
      console.log(`[CompanionQueue] Skipped expired routine scenario: ${scenario.eventType}`);
      return;
    }

    set((state) => {
      // If currently displaying default idle, swap active scenario immediately
      if (state.activeScenario.tag === '[IDLE]' || state.activeScenario.tag === '[ROUTINE]') {
        return { activeScenario: scenario };
      }
      // Otherwise push to queue
      return { queue: [...state.queue, scenario] };
    });
  },

  nextScenario: () => {
    const currentQueue = get().queue;
    if (currentQueue.length === 0) {
      const routine = getDefaultTimeBasedScenario();
      if (routine.tag === '[ROUTINE]') {
        set({ activeScenario: routine });
      } else {
        const nextIdle = DYNAMIC_IDLE_POOL[idleIndex % DYNAMIC_IDLE_POOL.length];
        idleIndex = (idleIndex + 1) % DYNAMIC_IDLE_POOL.length;
        set({ activeScenario: nextIdle });
      }
      return;
    }

    // Dequeue next valid scenario
    let nextIdx = 0;
    while (nextIdx < currentQueue.length) {
      const candidate = currentQueue[nextIdx];
      if (candidate.tag === '[ROUTINE]' && !isRoutineValid(candidate)) {
        // Skip expired routine idle event
        console.log(`[CompanionQueue] Automatically skipped expired routine: ${candidate.eventType}`);
        nextIdx++;
      } else {
        break;
      }
    }

    if (nextIdx >= currentQueue.length) {
      set({ queue: [], activeScenario: getDefaultTimeBasedScenario() });
    } else {
      const nextScenario = currentQueue[nextIdx];
      const remainingQueue = currentQueue.slice(nextIdx + 1);
      set({ activeScenario: nextScenario, queue: remainingQueue });
    }
  },

  clearQueue: () => {
    set({ queue: [], activeScenario: getDefaultTimeBasedScenario() });
  },
}));
