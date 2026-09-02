'use client';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { waterService } from '@/services/backend';
import { useAuthStore } from '@/stores';
import { Droplets, Plus, Clock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function WaterTrackerPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [customAmount, setCustomAmount] = useState('250');

  const statsQ = useQuery({
    queryKey: ['water-today-stats'],
    queryFn: () => waterService.getTodayStats(),
    enabled: !!user,
  });

  const logsQ = useQuery({
    queryKey: ['water-today-logs'],
    queryFn: () => waterService.getTodayLogs(),
    enabled: !!user,
  });

  const stats = statsQ.data;
  const logs = (logsQ.data ?? []) as any[];

  const currentMl = (stats as any)?.total_ml ?? (stats as any)?.total_amount_ml ?? 0;
  const targetMl = 2500;
  const percent = Math.min(100, Math.round((currentMl / targetMl) * 100));

  const logMutation = useMutation({
    mutationFn: (amount: number) => waterService.log({ amount_ml: amount }),
    onSuccess: (_, amount) => {
      void queryClient.invalidateQueries({ queryKey: ['water-today-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['water-today-logs'] });
      if (currentMl + amount >= targetMl) {
        try {
          confetti({
            particleCount: 90,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch {}
      }
    },
  });

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="Hydration & Fluid Tracker"
          subtitle="Keep your cognitive focus sharp with steady water intake"
        />

        {/* Circular Hydration Card */}
        <Card className="p-8 flex flex-col items-center justify-center text-center space-y-6 bg-white/95">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 220 220">
              <circle cx="110" cy="110" r="90" stroke="#E0F2FE" strokeWidth="12" fill="none" />
              <circle
                cx="110"
                cy="110"
                r="90"
                stroke="#0EA5E9"
                strokeWidth="12"
                strokeDasharray={2 * Math.PI * 90}
                strokeDashoffset={2 * Math.PI * 90 - (percent / 100) * 2 * Math.PI * 90}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center">
              <Droplets className="w-8 h-8 text-sky-500 mb-1 animate-bounce" />
              <span className="text-4xl font-black text-[#2A1D22]">{currentMl}</span>
              <span className="text-xs font-bold text-[#66545B]">of {targetMl} ml</span>
            </div>
          </div>

          <div>
            <span className="text-sm font-black text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              {percent}% Daily Target Achieved
            </span>
          </div>

          {/* Quick Log Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {[250, 500, 750].map((amount) => (
              <Button
                key={amount}
                variant="secondary"
                size="md"
                onClick={() => logMutation.mutate(amount)}
                loading={logMutation.isPending}
                className="!bg-sky-50 hover:!bg-sky-100 text-sky-700 border-sky-200"
                icon={<Plus className="w-4 h-4" />}
              >
                +{amount} ml
              </Button>
            ))}
          </div>
        </Card>

        {/* Today's Intake Log History */}
        <Card className="p-6 space-y-3 bg-white/95">
          <h4 className="text-sm font-extrabold text-[#2A1D22]">Today&apos;s Intake Logs</h4>
          {logs.length === 0 ? (
            <p className="text-xs text-[#66545B] italic py-2">No water logged yet today.</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-[14px] bg-[#FFF3F5] text-xs font-bold"
                >
                  <span className="text-sky-700 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5" /> +{log.amount_ml} ml
                  </span>
                  <span className="text-[#66545B] text-[11px]">
                    {new Date(log.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
