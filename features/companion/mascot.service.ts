import type { CompanionMascotState, CompanionPersonalityMode } from './types';

let currentMascotState: CompanionMascotState = {
  name: 'Kitty',
  level: 5,
  xp: 1450,
  activeSkin: 'classic_cat',
  unlockedSkins: ['classic_cat', 'golden_kitty', 'space_explorer', 'cyber_cat'],
  activeDecoration: 'party_hat',
  personalityMode: 'cheerful',
  currentEmotion: 'happy',
  currentAnimation: 'idle',
};

type MascotListener = (state: CompanionMascotState) => void;
const listeners = new Set<MascotListener>();

export const companionMascotService = {
  getMascotState(): CompanionMascotState {
    return { ...currentMascotState };
  },

  subscribe(listener: MascotListener): () => void {
    listeners.add(listener);
    listener(currentMascotState);
    return () => listeners.delete(listener);
  },

  setSkin(skinId: string) {
    if (currentMascotState.unlockedSkins.includes(skinId)) {
      currentMascotState = { ...currentMascotState, activeSkin: skinId };
      this.notify();
    }
  },

  setDecoration(decorationId: string) {
    currentMascotState = { ...currentMascotState, activeDecoration: decorationId };
    this.notify();
  },

  setPersonalityMode(mode: CompanionPersonalityMode) {
    currentMascotState = { ...currentMascotState, personalityMode: mode };
    this.notify();
  },

  addXP(amount: number) {
    const nextXP = currentMascotState.xp + amount;
    const nextLevel = Math.floor(nextXP / 300) + 1;
    currentMascotState = {
      ...currentMascotState,
      xp: nextXP,
      level: nextLevel,
    };
    this.notify();
  },

  notify() {
    listeners.forEach((l) => l(currentMascotState));
  },
};
