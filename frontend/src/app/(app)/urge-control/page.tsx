'use client';
import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { playChime } from '@/lib/audio';
import urgeData from '@/data/urge.json';
import { ShieldAlert, Play, RotateCcw, Sparkles, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

export default function UrgeControlPage() {
  const activities = (urgeData as any).distraction_interruptions || [
    { id: 1, activity: 'Box Breathing: Inhale 4s, Hold 4s, Exhale 4s, Hold 4s', duration_minutes: 3, focus: 'Nervous system regulation' },
    { id: 2, activity: 'Neck & Upper Back Posture Stretch', duration_minutes: 2, focus: 'Physical tension release' },
    { id: 3, activity: 'Drink a full glass of cold water mindfully', duration_minutes: 2, focus: 'Sensory grounding' },
    { id: 4, activity: 'Brain-dump distraction triggers onto paper', duration_minutes: 5, focus: 'Cognitive offloading' },
  ];

  const quotes = (urgeData as any).motivation_quotes || [
    'Discipline is choosing between what you want now and what you want most.',
    'The pain of discipline is far less than the pain of regret.',
  ];

  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [quote, setQuote] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  useEffect(() => {
    setTimeout(() => setQuote(quotes[Math.floor(Math.random() * quotes.length)]), 0);
  }, [quotes]);

  useEffect(() => {
    let interval: any = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            playChime('breakComplete');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const handleRollDice = () => {
    if (isRolling) return;
    setIsRolling(true);
    setTimerActive(false);

    setTimeout(() => {
      const randomAct = activities[Math.floor(Math.random() * activities.length)];
      setSelectedActivity(randomAct);
      setTimerSeconds(randomAct.duration_minutes * 60);
      setTimeout(() => setQuote(quotes[Math.floor(Math.random() * quotes.length)]), 0);
      setIsRolling(false);
    }, 600);
  };

  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="Dopamine Detox & Urge Control"
          subtitle="Break doomscrolling impulses with scientifically grounded micro-actions"
        />

        {/* Main Dice Roller Stage */}
        <Card className="p-8 text-center space-y-6 bg-white/95">
          <div className="space-y-2">
            <div
              className={clsx(
                'w-20 h-20 rounded-[24px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white text-4xl flex items-center justify-center mx-auto shadow-lg cursor-pointer select-none transition-transform',
                isRolling && 'animate-spin'
              )}
              onClick={handleRollDice}
            >
              🎲
            </div>
            <p className="text-xs font-bold text-[#66545B]">
              Feeling an urge to procrastinate or scroll? Roll the dice!
            </p>
          </div>

          <Button size="lg" onClick={handleRollDice} loading={isRolling} className="px-8">
            Roll for Micro-Action
          </Button>

          {/* Selected Micro-Action */}
          {selectedActivity && (
            <div className="p-6 rounded-[22px] bg-[#FFF3F5] border border-[#FAD7E0] space-y-4 animate-in fade-in duration-200 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#C73A57]">
                  {selectedActivity.focus}
                </span>
                <span className="text-xs font-bold text-[#66545B]">
                  {selectedActivity.duration_minutes} min reset
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-black text-[#2A1D22] font-heading italic">
                {selectedActivity.activity}
              </h3>

              {/* Countdown Timer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#FFE4EB]">
                <span className="text-3xl font-black font-mono text-[#C73A57]">
                  {timeFormatted}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={timerActive ? 'secondary' : 'primary'}
                    onClick={() => setTimerActive(!timerActive)}
                  >
                    {timerActive ? 'Pause' : 'Start Timer'}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setTimerActive(false);
                      setTimerSeconds(selectedActivity.duration_minutes * 60);
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Psychology Quote */}
          {quote && (
            <p className="text-xs italic text-[#66545B] max-w-md mx-auto pt-2">
              &quot;{quote}&quot;
            </p>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
