'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { EmptyState } from '@/components/ui/EmptyState';
import { reportService } from '@/services/backend';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Calendar, FileText } from 'lucide-react';
import clsx from 'clsx';

export default function ReportsHistoryPage() {
  const reportsQ = useQuery({
    queryKey: ['daily-reports'],
    queryFn: () => reportService.list(),
  });

  const reports = (reportsQ.data ?? []) as any[];

  return (
    <AppShell>
      <div className="space-y-6">
        <HeaderTitleCard
          title="Daily Accountability Reports"
          subtitle="Complete record of approved & verified study days"
          backUrl="/accountability"
        />

        {reportsQ.isLoading ? (
          <Loading message="Loading reports history…" />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No past reports yet"
            description="Submit daily proof and get it verified by your partner to compile your first report!"
          />
        ) : (
          <div className="space-y-3">
            {reports.map((rep) => {
              const isApproved = rep.status === 'approved';
              return (
                <Card key={rep.id} className="p-5 space-y-3 bg-white/95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {isApproved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#D94C61]" />
                      )}
                      <div>
                        <h4 className="text-sm font-extrabold text-[#2A1D22]">
                          {format(new Date(rep.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </h4>
                        <span className="text-[11px] font-semibold text-[#66545B]">
                          Accuracy: {rep.accuracy_percent ?? 100}% • {rep.total_pomodoros ?? 0} Pomodoros
                        </span>
                      </div>
                    </div>

                    <span
                      className={clsx(
                        'text-xs font-black uppercase px-3 py-1 rounded-full border',
                        isApproved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-[#D94C61] border-rose-200'
                      )}
                    >
                      {rep.status}
                    </span>
                  </div>

                  {rep.reviewer_comment && (
                    <p className="text-xs text-[#66545B] bg-[#FFF3F5] p-2.5 rounded-[12px] border border-[#FFE4EB]">
                      💬 <strong>Partner:</strong> &quot;{rep.reviewer_comment}&quot;
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
