'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores';
import * as statsService from '@/services/statistics.service';
import { queryKeys } from '@/lib/query-keys';
import {
  Flame,
  Clock,
  CheckCircle2,
  Trophy,
  Users,
  Target,
  BarChart,
  Calendar,
} from 'lucide-react';
import clsx from 'clsx';

export default function StatisticsPage() {
  const { user, profile } = useAuthStore();
  const [viewingPartner, setViewingPartner] = useState(false);
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('week');

  const partnerId = profile?.partner_id;
  const targetUserId = viewingPartner && partnerId ? partnerId : user?.id;

  const statsQ = useQuery({
    queryKey: queryKeys.statsUserStats(targetUserId ?? ''),
    queryFn: () => statsService.getUserStats(targetUserId ?? undefined),
    enabled: !!targetUserId,
  });

  const partnerProfileQ = useQuery({
    queryKey: ['partner-profile'],
    queryFn: () => statsService.getPartnerIdForCurrentUser(),
    enabled: !!user,
  });

  const stats = statsQ.data as any;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <HeaderTitleCard
            title="Study Analytics & Metrics"
            subtitle="Deep data insights across focus sessions and consistency"
          />

          {partnerId && (
            <button
              onClick={() => setViewingPartner(!viewingPartner)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-[20px] text-xs font-black transition-all border shadow-sm active:scale-95',
                viewingPartner
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'bg-white text-[#C73A57] border-[#FAD7E0] hover:bg-[#FFF3F5]'
              )}
            >
              <Users className="w-4 h-4" />
              <span>{viewingPartner ? "Viewing Partner's Stats" : "Switch to Partner's Stats"}</span>
            </button>
          )}
        </div>

        {/* Time range filters */}
        <div className="flex rounded-[20px] bg-white/90 p-1 border border-[#FAD7E0] max-w-xs">
          {(['week', 'month', 'all'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={clsx(
                'flex-1 py-1.5 text-xs font-bold rounded-[14px] capitalize transition-all',
                timeFilter === filter
                  ? 'bg-[#C73A57] text-white shadow-2xs'
                  : 'text-[#66545B] hover:text-[#C73A57]'
              )}
            >
              {filter === 'all' ? 'All Time' : filter}
            </button>
          ))}
        </div>

        {statsQ.isLoading ? (
          <Loading message="Compiling study analytics…" />
        ) : (
          <div className="space-y-5">
            {/* Top 4 KPI metric cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Focus Hours */}
              <Card className="p-4 flex flex-col items-center justify-center text-center space-y-1 bg-white/95">
                <div className="w-10 h-10 rounded-[14px] bg-[#FFE4EB] text-[#C73A57] flex items-center justify-center mb-1 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-[#2A1D22]">
                  {Math.round(((stats?.total_pomodoros ?? 0) * 25) / 60)}h
                </span>
                <span className="text-[11px] font-bold text-[#66545B]">Focus Logged</span>
              </Card>

              {/* Pomodoro Sessions */}
              <Card className="p-4 flex flex-col items-center justify-center text-center space-y-1 bg-white/95">
                <div className="w-10 h-10 rounded-[14px] bg-[#FFF3F5] text-[#E84D72] flex items-center justify-center mb-1 shadow-2xs">
                  <Target className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-[#2A1D22]">
                  {stats?.total_pomodoros ?? 0}
                </span>
                <span className="text-[11px] font-bold text-[#66545B]">Pomodoro Blocks</span>
              </Card>

              {/* Current Streak */}
              <Card className="p-4 flex flex-col items-center justify-center text-center space-y-1 bg-white/95">
                <div className="w-10 h-10 rounded-[14px] bg-amber-50 text-amber-600 flex items-center justify-center mb-1 shadow-2xs">
                  <Flame className="w-5 h-5 fill-current animate-wiggle" />
                </div>
                <span className="text-2xl font-black text-[#2A1D22]">
                  {stats?.current_streak ?? 0}
                </span>
                <span className="text-[11px] font-bold text-[#66545B]">Day Streak</span>
              </Card>

              {/* Lifetime XP */}
              <Card className="p-4 flex flex-col items-center justify-center text-center space-y-1 bg-white/95">
                <div className="w-10 h-10 rounded-[14px] bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1 shadow-2xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <span className="text-2xl font-black text-[#2A1D22]">{stats?.xp ?? 0}</span>
                <span className="text-[11px] font-bold text-[#66545B]">Total XP</span>
              </Card>
            </div>

            {/* Consistency & Approved Days Overview */}
            <Card className="p-6 space-y-4 bg-white/95">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-[#2A1D22] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dual Accountability Record</span>
                </h4>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  {stats?.approved_days ?? 0} Days Verified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB] space-y-1">
                  <span className="text-[11px] font-bold text-[#66545B]">Longest Active Streak</span>
                  <p className="text-xl font-black text-[#C73A57]">{stats?.longest_streak ?? stats?.current_streak ?? 0} consecutive days</p>
                </div>
                <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB] space-y-1">
                  <span className="text-[11px] font-bold text-[#66545B]">Current Mastery Level</span>
                  <p className="text-xl font-black text-[#C73A57]">Level {stats?.level ?? 1} Scholar</p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
