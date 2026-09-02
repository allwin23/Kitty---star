'use client';
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { NotificationBadge } from '@/components/ui/NotificationBadge';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { CatBulletinStage } from '@/components/companion/CatBulletinStage';
import { GrowthStatsCard } from '@/components/ui/GrowthStatsCard';
import { CreativeToolsGrid } from '@/components/ui/CreativeToolsGrid';
import { useAuthStore } from '@/stores';
import { reportService, testingService } from '@/services/backend';
import { queryKeys } from '@/lib/query-keys';
import { Users, ArrowRight, Play, CheckCircle2 } from 'lucide-react';

export default function HomePage() {
  const { user, profile } = useAuthStore();

  const statsQ = useQuery({
    queryKey: queryKeys.userStats,
    queryFn: () => reportService.stats(),
    enabled: !!user,
  });

  const stats = statsQ.data as {
    xp: number;
    level: number;
    current_streak: number;
    approved_days: number;
    total_pomodoros: number;
  } | null;

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Header greeting */}
        <div className="flex items-center justify-between">
          <HeaderTitleCard
            title={`Hello, ${profile?.full_name?.split(' ')[0] ?? 'there'}`}
            subtitle={user?.email ?? undefined}
            showWavingHand
          />
          <div className="flex items-center gap-2">
            <Link
              href="/pomodoro"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[18px] bg-white/95 text-[#C73A57] hover:bg-white text-xs font-black shadow-sm border border-[#FAD7E0] transition-all hover:scale-105 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Quick Focus</span>
            </Link>
            <NotificationBadge />
          </div>
        </div>

        {/* Mascot companion stage */}
        <CatBulletinStage />

        {/* Growth Stats Card */}
        {statsQ.isLoading ? (
          <Loading message="Syncing study stats…" />
        ) : stats ? (
          <GrowthStatsCard stats={stats} />
        ) : (
          <GrowthStatsCard
            stats={{
              xp: 0,
              level: 1,
              current_streak: 0,
              approved_days: 0,
              total_pomodoros: 0,
            }}
          />
        )}

        {/* Partner Connection Banner */}
        {!profile?.partner_id ? (
          <Card className="bg-gradient-to-r from-white/95 via-[#FFF3F5]/95 to-[#FFE4EB]/95 border-[#FAD7E0] flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-12 h-12 rounded-[18px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white flex items-center justify-center shrink-0 shadow-md">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-[#2A1D22]">
                  Dual Accountability Study Buddy
                </h4>
                <p className="text-xs font-semibold text-[#66545B]">
                  Link with your study partner to review each other&apos;s daily proof photos and lock streaks.
                </p>
              </div>
            </div>
            <Link href="/partner-linking" className="w-full sm:w-auto shrink-0">
              <Button size="md" className="w-full sm:w-auto" icon={<ArrowRight className="w-4 h-4" />}>
                Connect Partner
              </Button>
            </Link>
          </Card>
        ) : null}

        {/* Study Tools Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-white drop-shadow-xs">
              Study Space & Specialized Tools
            </h3>
            <Link
              href="/accountability"
              className="text-xs font-extrabold text-white/90 hover:text-white underline drop-shadow-xs flex items-center gap-1"
            >
              <span>Today&apos;s Plan</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </Link>
          </div>

          <CreativeToolsGrid />
        </div>
      </div>
    </AppShell>
  );
}
