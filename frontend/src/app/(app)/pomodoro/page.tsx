'use client';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  usePomodoroStore,
  type PomodoroSessionType,
} from '@/stores/pomodoro-store';
import { getCurrentPlan } from '@/services/planner-read.service';
import { todayIso } from '@/lib/supabase-helpers';
import { requestNotificationPermission } from '@/lib/notifications';
import {
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  Flame,
  Target,
  Sparkles,
  Coffee,
  CheckSquare,
} from 'lucide-react';
import clsx from 'clsx';

export default function PomodoroPage() {
  const {
    durationMinutes,
    timerSeconds,
    isRunning,
    isPaused,
    sessionType,
    selectedTaskId,
    isFullScreen,
    soundEnabled,
    completedPomodorosToday,
    setDurationMinutes,
    setSelectedTaskId,
    setSessionType,
    setSoundEnabled,
    setFullScreen,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
  } = usePomodoroStore();

  const [customMins, setCustomMins] = useState<string>('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifGranted(Notification.permission === 'granted');
    }
  }, []);

  const handleEnableNotifs = async () => {
    const granted = await requestNotificationPermission();
    setNotifGranted(granted);
  };

  // Fetch today's current plan tasks to link to Pomodoro
  const today = todayIso();
  const planQ = useQuery({
    queryKey: ['current-plan', today],
    queryFn: () => getCurrentPlan(today),
  });

  const tasks = (planQ.data?.current_tasks ?? []) as {
    id: string;
    title: string;
    status: 'pending' | 'completed';
    estimated_minutes: number;
    completed_pomodoros?: number;
  }[];

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Time format MM:SS
  const minutes = Math.floor(timerSeconds / 60);
  const seconds = timerSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Circular progress calculation
  const totalSeconds = durationMinutes * 60;
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - timerSeconds) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 120; // r = 120
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  const sessionPresets = [
    { type: 'focus' as PomodoroSessionType, mins: 25, label: 'Focus (25m)', icon: Flame },
    { type: 'focus' as PomodoroSessionType, mins: 50, label: 'Deep (50m)', icon: Target },
    { type: 'short_break' as PomodoroSessionType, mins: 5, label: 'Short Break (5m)', icon: Coffee },
    { type: 'long_break' as PomodoroSessionType, mins: 15, label: 'Long Break (15m)', icon: Sparkles },
  ];

  // Full screen immersion toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullScreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullScreen(false);
    }
  };

  return (
    <AppShell>
      <div className={clsx('space-y-6', isFullScreen && 'fixed inset-0 z-50 bg-[#1D1317] p-8 flex flex-col justify-center items-center')}>
        {/* Header */}
        {!isFullScreen && (
          <div className="flex items-center justify-between">
            <HeaderTitleCard
              title="Pomodoro Focus Engine"
              subtitle="Lock in, minimize distractions, and track every minute."
            />
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullScreen}
                title="Fullscreen Immersion Mode"
                className="w-10 h-10 rounded-[18px] bg-white/95 hover:bg-white text-[#C73A57] border border-[#FAD7E0] shadow-sm flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Main Focus Stage */}
        <Card
          className={clsx(
            'p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden transition-all',
            isFullScreen ? 'bg-black/60 border-[#C73A57]/40 max-w-xl w-full' : 'bg-white/95'
          )}
        >
          {/* Top Session Type Selector */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            {sessionPresets.map((preset) => {
              const Icon = preset.icon;
              const isActive =
                sessionType === preset.type && durationMinutes === preset.mins;
              return (
                <button
                  key={`${preset.type}-${preset.mins}`}
                  disabled={isRunning}
                  onClick={() => {
                    setSessionType(preset.type);
                    setDurationMinutes(preset.mins);
                  }}
                  className={clsx(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all active:scale-95 disabled:opacity-50',
                    isActive
                      ? 'bg-[#C73A57] text-white shadow-md'
                      : 'bg-[#FFF3F5] text-[#66545B] hover:text-[#C73A57] border border-[#FAD7E0]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Task Link */}
          <div className="mb-6 w-full max-w-sm text-center">
            {selectedTask ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[18px] bg-[#FFF3F5] border border-[#FAD7E0] text-xs font-bold text-[#C73A57] shadow-2xs">
                <CheckSquare className="w-4 h-4 text-[#E84D72]" />
                <span className="truncate max-w-[200px]">{selectedTask.title}</span>
                <button
                  onClick={() => setSelectedTaskId(null)}
                  className="text-[#66545B] hover:text-[#D94C61] ml-1 font-extrabold"
                  title="Unlink Task"
                >
                  ✕
                </button>
              </div>
            ) : tasks.length > 0 ? (
              <div className="relative">
                <button
                  onClick={() => setShowTaskSelector(!showTaskSelector)}
                  className="text-xs font-bold text-[#C73A57] hover:underline bg-[#FFF3F5] px-3.5 py-1.5 rounded-full border border-[#FFE4EB]"
                >
                  🔗 Link to today&apos;s task
                </button>
                {showTaskSelector && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white rounded-[20px] border border-[#FAD7E0] shadow-xl p-2 z-30 text-left">
                    <p className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#BFAFB5]">
                      Choose Task from Today&apos;s Plan
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {tasks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setSelectedTaskId(t.id);
                            setShowTaskSelector(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-[12px] hover:bg-[#FFF3F5] text-xs font-semibold text-[#2A1D22] flex items-center justify-between"
                        >
                          <span className="truncate">{t.title}</span>
                          <span className="text-[10px] font-bold text-[#66545B] shrink-0 ml-2">
                            {t.estimated_minutes}m
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Circular SVG Timer */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-8">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 260 260">
              {/* Background Ring */}
              <circle
                cx="130"
                cy="130"
                r="110"
                stroke="#FFE4EB"
                strokeWidth="12"
                fill="none"
              />
              {/* Animated Progress Ring */}
              <circle
                cx="130"
                cy="130"
                r="110"
                stroke={sessionType === 'focus' ? '#C73A57' : '#63C58B'}
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 110}
                strokeDashoffset={2 * Math.PI * 110 - (progressPercent / 100) * 2 * Math.PI * 110}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Digital Clock Display */}
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span
                className={clsx(
                  'text-5xl sm:text-6xl font-black font-mono tracking-tight select-none',
                  isFullScreen ? 'text-white' : 'text-[#2A1D22]'
                )}
              >
                {timeFormatted}
              </span>
              <span
                className={clsx(
                  'text-xs font-black uppercase tracking-widest mt-1',
                  sessionType === 'focus' ? 'text-[#E84D72]' : 'text-[#63C58B]'
                )}
              >
                {sessionType === 'focus' ? 'Deep Focus' : 'Break Time'}
              </span>
            </div>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="secondary"
              size="lg"
              onClick={resetTimer}
              className="w-14 h-14 !rounded-full !p-0 shadow-sm"
              title="Reset Timer"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>

            {!isRunning ? (
              <Button
                variant="primary"
                size="lg"
                onClick={startTimer}
                className="h-16 px-8 !rounded-[28px] text-base shadow-lg shadow-[#C73A57]/30 hover:scale-105 active:scale-95"
                icon={<Play className="w-6 h-6 fill-current" />}
              >
                Start Focusing
              </Button>
            ) : isPaused ? (
              <Button
                variant="primary"
                size="lg"
                onClick={resumeTimer}
                className="h-16 px-8 !rounded-[28px] text-base shadow-lg shadow-[#C73A57]/30 hover:scale-105 active:scale-95"
                icon={<Play className="w-6 h-6 fill-current" />}
              >
                Resume
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={pauseTimer}
                className="h-16 px-8 !rounded-[28px] text-base shadow-lg shadow-[#C73A57]/30 hover:scale-105 active:scale-95"
                icon={<Pause className="w-6 h-6 fill-current" />}
              >
                Pause
              </Button>
            )}

            {/* Sound Mute Toggle */}
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-14 h-14 !rounded-full !p-0 shadow-sm"
              title={soundEnabled ? 'Chime Enabled' : 'Muted'}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[#C73A57]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[#BFAFB5]" />
              )}
            </Button>
          </div>

          {/* Session Summary & Notification Permission */}
          <div className="mt-8 pt-6 border-t border-[#FFE4EB] w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold text-[#66545B]">
            <div className="flex items-center gap-2">
              <span className="text-base">🍅</span>
              <span>
                Completed Today: <strong className="text-[#2A1D22]">{completedPomodorosToday}</strong> sessions
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!notifGranted ? (
                <button
                  onClick={handleEnableNotifs}
                  className="text-xs font-bold text-[#C73A57] hover:underline flex items-center gap-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>Enable Web Alerts</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Alerts Active</span>
                </span>
              )}

              {isFullScreen && (
                <button
                  onClick={toggleFullScreen}
                  className="px-3 py-1.5 rounded-full bg-white/20 text-white hover:bg-white/30 text-xs flex items-center gap-1"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
