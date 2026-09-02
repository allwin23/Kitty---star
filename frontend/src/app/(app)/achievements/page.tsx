'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { achievementService } from '@/services/achievement.service';
import { Trophy, Award, Lock, CheckCircle2, Sparkles, Star } from 'lucide-react';
import clsx from 'clsx';

export default function AchievementsPage() {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const allBadgesQ = useQuery({
    queryKey: ['achievements-all'],
    queryFn: () => achievementService.getAllAchievements(),
  });

  const myBadgesQ = useQuery({
    queryKey: ['achievements-user'],
    queryFn: () => achievementService.getUserAchievements(),
  });

  const allBadges = (allBadgesQ.data ?? []) as any[];
  const userBadges = (myBadgesQ.data ?? []) as any[];
  const unlockedIds = new Set(userBadges.map((ub) => ub.achievement_id));

  // Fallback badges if DB is unseeded
  const fallbackBadges = [
    { id: 'b1', name: 'Early Bird', description: 'Complete a morning focus session before 8:00 AM.', icon: '🌅', xp_reward: 100 },
    { id: 'b2', name: 'Focus Master', description: 'Complete 10 Pomodoro sessions in a single week.', icon: '🍅', xp_reward: 150 },
    { id: 'b3', name: 'Streak Warrior', description: 'Maintain a 7-day study streak with your partner.', icon: '🔥', xp_reward: 250 },
    { id: 'b4', name: 'Century Club', description: 'Accumulate 100 total completed study tasks.', icon: '💯', xp_reward: 500 },
    { id: 'b5', name: 'Hydration Hero', description: 'Hit your daily water target 5 days in a row.', icon: '💧', xp_reward: 120 },
    { id: 'b6', name: 'Word Wizard', description: 'Learn 25 vocabulary words with flashcards.', icon: '📚', xp_reward: 180 },
    { id: 'b7', name: 'Mock Exam Ace', description: 'Score above 80% on a PYQ practice exam.', icon: '🎯', xp_reward: 300 },
    { id: 'b8', name: 'Perfect Peer', description: 'Verify your partner’s study proof for 5 consecutive days.', icon: '🤝', xp_reward: 200 },
  ];

  const displayBadges = allBadges.length > 0 ? allBadges : fallbackBadges;

  const filteredBadges = displayBadges.filter((b) => {
    const isUnlocked = unlockedIds.has(b.id);
    if (filter === 'unlocked') return isUnlocked;
    if (filter === 'locked') return !isUnlocked;
    return true;
  });

  return (
    <AppShell>
      <div className="space-y-6">
        <HeaderTitleCard
          title="Achievements & Badges Hub"
          subtitle="Unlock badges for focus consistency, streaks, and milestones"
        />

        {/* Filter Chips */}
        <div className="flex gap-2">
          {(['all', 'unlocked', 'locked'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-xs font-black capitalize transition-all',
                filter === f
                  ? 'bg-[#C73A57] text-white shadow-xs'
                  : 'bg-white/90 text-[#66545B] hover:text-[#C73A57] border border-[#FAD7E0]'
              )}
            >
              {f === 'all' ? 'All Badges' : f}
            </button>
          ))}
        </div>

        {allBadgesQ.isLoading ? (
          <Loading message="Loading achievement badges…" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBadges.map((badge) => {
              const isUnlocked = unlockedIds.has(badge.id);
              return (
                <Card
                  key={badge.id}
                  className={clsx(
                    'p-5 flex items-start gap-4 transition-all',
                    isUnlocked
                      ? 'bg-white/95 border-[#FAD7E0] hover:shadow-md'
                      : 'bg-white/70 opacity-70 border-dashed border-[#D9CDD1]'
                  )}
                >
                  <div
                    className={clsx(
                      'w-14 h-14 rounded-[20px] flex items-center justify-center text-2xl shrink-0 shadow-sm',
                      isUnlocked
                        ? 'bg-gradient-to-tr from-[#FFE4EB] to-[#FFF3F5] border border-[#FAD7E0]'
                        : 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isUnlocked ? badge.icon || '🏆' : <Lock className="w-5 h-5 text-[#BFAFB5]" />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-[#2A1D22]">{badge.name}</h4>
                      <span className="text-[10px] font-extrabold text-[#C73A57] bg-[#FFE4EB] px-2 py-0.5 rounded-full">
                        +{badge.xp_reward ?? 100} XP
                      </span>
                    </div>

                    <p className="text-xs text-[#66545B] leading-relaxed">{badge.description}</p>

                    {isUnlocked && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Unlocked
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
