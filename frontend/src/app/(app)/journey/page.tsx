'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/stores';
import { journeyService } from '@/services/journey.service';
import { reportService } from '@/services/backend';
import { Trophy, Gift, Sparkles, Check, Lock, Star } from 'lucide-react';
import confetti from 'canvas-confetti';
import clsx from 'clsx';

export default function JourneyRoadmapPage() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuthStore();
  const [selectedReward, setSelectedReward] = useState<any | null>(null);

  const statsQ = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => reportService.stats(),
    enabled: !!user,
  });

  const stats = statsQ.data as any;
  const currentXp = stats?.xp ?? 0;

  // Duolingo-style XP Milestones
  const milestones = [
    { targetXp: 100, title: 'First Steps', reward: '☕ Study Break Coffee on Partner', emoji: '🌱' },
    { targetXp: 300, title: 'Consistency Rising', reward: '🍩 Sweet Treat Reward', emoji: '⚡' },
    { targetXp: 600, title: 'Pomodoro Master', reward: '🎬 Movie Night Pick by Partner', emoji: '🍅' },
    { targetXp: 1000, title: 'Century Scholar', reward: '🍕 Special Dinner Treat', emoji: '🏆' },
    { targetXp: 1500, title: 'Unstoppable Focus', reward: '🎁 Surprise Wishlist Item', emoji: '🚀' },
    { targetXp: 2500, title: 'Legendary Partner', reward: '👑 Partner Grants 1 Free Study Pass', emoji: '👑' },
  ];

  const handleClaim = (milestone: any) => {
    setSelectedReward(milestone);
    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="XP Journey Roadmap"
          subtitle="Duolingo-inspired milestones & surprise partner rewards"
        />

        {/* Current XP Progress Banner */}
        <Card className="p-6 bg-gradient-to-r from-white/95 via-[#FFF3F5]/95 to-[#FFE4EB]/95 border-[#FAD7E0] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌟</span>
              <div>
                <h3 className="text-base font-extrabold text-[#2A1D22]">Lifetime XP Level</h3>
                <p className="text-xs text-[#66545B]">Earn XP from Pomodoros and approved daily plans</p>
              </div>
            </div>
            <span className="text-lg font-black text-[#C73A57]">{currentXp} XP</span>
          </div>
        </Card>

        {/* Vertical Journey Path */}
        <div className="relative py-4 space-y-8">
          {/* Vertical linking line */}
          <div className="absolute left-8 sm:left-1/2 -translate-x-1/2 top-4 bottom-4 w-1.5 bg-[#FFE4EB] rounded-full" />

          {milestones.map((m, idx) => {
            const isUnlocked = currentXp >= m.targetXp;
            const isNext = !isUnlocked && (idx === 0 || currentXp >= milestones[idx - 1].targetXp);

            return (
              <div
                key={m.targetXp}
                className={clsx(
                  'relative flex items-center gap-4 sm:gap-6',
                  idx % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                )}
              >
                {/* Node icon */}
                <div
                  className={clsx(
                    'w-16 h-16 rounded-[24px] flex items-center justify-center text-2xl font-black shrink-0 z-10 shadow-md transition-transform hover:scale-105',
                    isUnlocked
                      ? 'bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white ring-4 ring-rose-200'
                      : isNext
                      ? 'bg-white border-2 border-[#E84D72] text-[#E84D72] ring-4 ring-pink-100 animate-pulse'
                      : 'bg-white border-2 border-[#BFAFB5] text-[#BFAFB5] opacity-70'
                  )}
                >
                  {isUnlocked ? m.emoji : <Lock className="w-6 h-6 text-[#BFAFB5]" />}
                </div>

                {/* Milestone Info Card */}
                <Card
                  className={clsx(
                    'flex-1 p-5 transition-all',
                    isUnlocked ? 'bg-white/95 border-[#FAD7E0]' : 'bg-white/75 opacity-80'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#C73A57]">
                      {m.targetXp} XP Milestone
                    </span>
                    {isUnlocked ? (
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Unlocked
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-[#66545B]">
                        {m.targetXp - currentXp} XP away
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-[#2A1D22] mb-1">{m.title}</h4>
                  <p className="text-xs text-[#66545B] flex items-center gap-1.5 mb-3">
                    <Gift className="w-3.5 h-3.5 text-[#E84D72] shrink-0" />
                    <span>Reward: {m.reward}</span>
                  </p>

                  {isUnlocked && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleClaim(m)}
                      className="w-full text-xs"
                    >
                      🎉 Reveal & Claim Reward
                    </Button>
                  )}
                </Card>
              </div>
            );
          })}
        </div>

        {/* Reward Claim Modal */}
        <Modal
          isOpen={!!selectedReward}
          onClose={() => setSelectedReward(null)}
          title="Milestone Reward Unlocked! 🎉"
        >
          <div className="text-center space-y-4 py-2">
            <div className="w-20 h-20 rounded-[24px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white text-4xl flex items-center justify-center mx-auto shadow-lg animate-float">
              {selectedReward?.emoji || '🎁'}
            </div>
            <h3 className="text-xl font-extrabold text-[#2A1D22] font-heading italic">
              {selectedReward?.title}
            </h3>
            <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB]">
              <p className="text-xs font-black uppercase text-[#C73A57] mb-1">Your Partner Reward:</p>
              <p className="text-sm font-bold text-[#2A1D22]">{selectedReward?.reward}</p>
            </div>
            <p className="text-xs text-[#66545B]">
              Share this milestone with your study partner to redeem your reward!
            </p>
            <Button size="lg" className="w-full" onClick={() => setSelectedReward(null)}>
              Awesome, Got It!
            </Button>
          </div>
        </Modal>
      </div>
    </AppShell>
  );
}
