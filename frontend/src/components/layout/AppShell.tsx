'use client';
import React from 'react';
import { CherryBackground } from '@/components/ui/CherryBackground';
import { Navbar } from './Navbar';
import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col font-body relative selection:bg-[#E84D72] selection:text-white">
      <CherryBackground />
      <Navbar />
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-24 md:pb-12">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
