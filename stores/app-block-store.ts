import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppBlockState {
  blockedPackages: string[];
  isBlockerEnabled: boolean;
  setBlockedPackages: (packages: string[]) => void;
  setBlockerEnabled: (enabled: boolean) => void;
}

const getStorage = () => AsyncStorage;

export const useAppBlockStore = create<AppBlockState>()(
  persist(
    (set) => ({
      blockedPackages: [],
      isBlockerEnabled: false,
      setBlockedPackages: (packages) => set({ blockedPackages: packages }),
      setBlockerEnabled: (enabled) => set({ isBlockerEnabled: enabled }),
    }),
    {
      name: 'app-block-storage',
      storage: createJSONStorage(() => getStorage()),
    }
  )
);
