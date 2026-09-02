'use client';
import React from 'react';
import { Flame, Sparkles, Clock, Target } from 'lucide-react';

interface StatsProps {
  stats: {
    xp: number;
    level: number;
    current_streak: number;
    approved_days: number;
    total_pomodoros: number;
  };
}

export function GrowthStatsCard({ stats }: StatsProps) {
  const currentXp = stats?.xp ?? 0;
  const level = stats?.level ?? 1;
  const streak = stats?.current_streak ?? 0;
  const pomodoros = stats?.total_pomodoros ?? 0;

  // XP to next level formula: 500 XP per level
  const xpInLevel = currentXp % 500;
  const progressPercent = Math.min(100, Math.round((xpInLevel / 500) * 100));

  return (
    <div className="rounded-[24px] bg-white/95 border border-[#FAD7E0] p-5 shadow-sm space-y-4 backdrop-blur-md">
      {/* Top Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <div>
            <h4 className="text-xs font-black uppercase text-[#C73A57] tracking-wider">
              Study Progress & Level
            </h4>
            <p className="text-sm font-bold text-[#2A1D22]">
              Level {level} Explorer • {currentXp} Lifetime XP
            </p>
          </div>
        </div>

        <span className="text-xs font-extrabold text-[#C73A57] bg-[#FFF3F5] px-3 py-1 rounded-full border border-[#FAD7E0]">
          {500 - xpInLevel} XP to Level {level + 1}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#FFE4EB] h-3 rounded-full overflow-hidden p-0.5 border border-[#FAD7E0]">
        <div
          className="bg-gradient-to-r from-[#C73A57] via-[#E84D72] to-[#F07392] h-full rounded-full transition-all duration-500 shadow-xs"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* 3 Metric Pills */}
      <div className="grid grid-cols-3 gap-2.5 pt-1">
        {/* Streak */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB]">
          <div className="flex items-center gap-1 text-[#E84D72] mb-0.5">
            <Flame className="w-4 h-4 fill-current animate-wiggle" />
            <span className="text-base font-black text-[#2A1D22]">{streak}</span>
          </div>
          <span className="text-[11px] font-bold text-[#66545B]">Day Streak</span>
        </div>

        {/* Pomodoros */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB]">
          <div className="flex items-center gap-1 text-[#C73A57] mb-0.5">
            <Clock className="w-4 h-4" />
            <span className="text-base font-black text-[#2A1D22]">{pomodoros}</span>
          </div>
          <span className="text-[11px] font-bold text-[#66545B]">Pomodoros</span>
        </div>

        {/* Approved Days */}
        <div className="flex flex-col items-center justify-center p-3 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB]">
          <div className="flex items-center gap-1 text-[#63C58B] mb-0.5">
            <Target className="w-4 h-4" />
            <span className="text-base font-black text-[#2A1D22]">{stats?.approved_days ?? 0}</span>
          </div>
          <span className="text-[11px] font-bold text-[#66545B]">Approved Days</span>
        </div>
      </div>
    </div>
  );
}
