'use client';
import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthGate } from './AuthGate';
import { usePomodoroStore } from '@/stores/pomodoro-store';

export function Providers({ children }: { children: React.ReactNode }) {
  // Global Pomodoro timer synchronizer & background ticker
  useEffect(() => {
    // 1. Sync timer on mount
    usePomodoroStore.getState().syncBackgroundTime();

    // 2. Periodic tick every 1000ms
    const interval = setInterval(() => {
      const { isRunning, isPaused } = usePomodoroStore.getState();
      if (isRunning && !isPaused) {
        usePomodoroStore.getState().tick();
      }
    }, 1000);

    // 3. Tab visibility change sync
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        usePomodoroStore.getState().syncBackgroundTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}
