'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProofViewerModal } from '@/components/ui/ProofViewerModal';
import { Loading } from '@/components/ui/Loading';
import { submissionService } from '@/services/backend';
import { getProofImageUrl } from '@/services/planner-read.service';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, XCircle, Clock, Eye, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ReviewPartnerSubmissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const submissionId = searchParams.get('submissionId');

  const [reviewComment, setReviewComment] = useState('');
  const [viewingProofUrl, setViewingProofUrl] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<'approved' | 'rejected' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submissionQ = useQuery({
    queryKey: ['submission-review', submissionId],
    queryFn: async () => {
      if (!submissionId) return null;
      const { data, error: err } = await supabase
        .from('daily_submissions')
        .select(`
          *,
          submission_proofs(*),
          current_plans(*, current_tasks(*)),
          profiles:user_id(full_name, avatar_url, email)
        `)
        .eq('id', submissionId)
        .single();

      if (err) throw err;
      return data;
    },
    enabled: !!submissionId,
  });

  const submission = submissionQ.data as any;

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!submissionId) return;
    setLoadingAction(decision);
    setError(null);

    try {
      await submissionService.review(submissionId, decision, reviewComment.trim() || undefined);

      if (decision === 'approved') {
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {}
      }

      setTimeout(() => router.push('/accountability'), 1200);
    } catch (err: any) {
      setError(err.message || `Failed to ${decision} submission.`);
    } finally {
      setLoadingAction(null);
    }
  };

  if (submissionQ.isLoading) {
    return (
      <AppShell>
        <Loading message="Loading partner's submission…" />
      </AppShell>
    );
  }

  if (!submission) {
    return (
      <AppShell>
        <Card className="p-8 text-center space-y-4">
          <p className="text-base font-bold text-[#2A1D22]">Submission not found or already reviewed.</p>
          <Button onClick={() => router.push('/accountability')}>Back to Plan</Button>
        </Card>
      </AppShell>
    );
  }

  const tasks = (submission.current_plans?.current_tasks ?? []) as any[];
  const proofs = (submission.submission_proofs ?? []) as any[];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <HeaderTitleCard
          title="Review Partner's Daily Work"
          subtitle={`Submitted by ${submission.profiles?.full_name || 'Study Partner'}`}
          backUrl="/accountability"
        />

        {/* Verification Checklist */}
        <Card className="p-6 space-y-5 bg-white/95">
          {/* Partner Remark */}
          {submission.remark && (
            <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB]">
              <p className="text-xs font-black uppercase text-[#C73A57] mb-1">
                Partner&apos;s Notes:
              </p>
              <p className="text-sm font-medium text-[#2A1D22]">{submission.remark}</p>
            </div>
          )}

          {/* Proof Photos Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-[#2A1D22] tracking-wider">
              Photographic Proof Evidence ({proofs.length})
            </h4>

            {proofs.length === 0 ? (
              <p className="text-xs text-[#D94C61] font-semibold bg-rose-50 p-3 rounded-[14px]">
                ⚠️ No photo evidence was attached to this submission.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {proofs.map((proof: any) => {
                  const url = supabase.storage.from('proof-images').getPublicUrl(proof.image_url).data?.publicUrl;
                  return (
                    <div
                      key={proof.id}
                      onClick={() => setViewingProofUrl(url)}
                      className="group relative h-36 rounded-[18px] overflow-hidden border border-[#FAD7E0] bg-[#FFF3F5] cursor-pointer shadow-xs hover:shadow-md transition-all"
                    >
                      {}
                      <img
                        src={url}
                        alt="Proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Eye className="w-6 h-6" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Tasks List */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-black uppercase text-[#2A1D22] tracking-wider">
              Tasks Reported by Partner
            </h4>
            <div className="space-y-1.5">
              {tasks.map((t: any) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-[14px] bg-[#FFF7F8] border border-[#FFE4EB] text-xs"
                >
                  <span className="font-bold text-[#2A1D22]">{t.title}</span>
                  <span className="font-bold text-[#66545B]">
                    {t.status === 'completed' ? '✅ Completed' : '⏳ Pending'} • {t.completed_pomodoros || 0} 🍅
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Decision Feedback */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-black uppercase text-[#2A1D22] tracking-wider">
              Feedback Comment for Partner
            </label>
            <input
              type="text"
              placeholder="e.g. Great handwriting! Keep up the consistency!"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="w-full bg-[#FFF3F5] text-sm font-medium rounded-[16px] px-4 py-3 border border-[#FAD7E0] outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 rounded-[14px] border border-rose-200 text-xs font-bold text-[#D94C61] text-center">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#FFE4EB]">
            <Button
              variant="danger"
              size="lg"
              loading={loadingAction === 'rejected'}
              onClick={() => handleDecision('rejected')}
              icon={<XCircle className="w-5 h-5" />}
            >
              Reject Day
            </Button>
            <Button
              variant="primary"
              size="lg"
              loading={loadingAction === 'approved'}
              onClick={() => handleDecision('approved')}
              icon={<CheckCircle2 className="w-5 h-5" />}
            >
              Approve Day (+XP & Streak)
            </Button>
          </div>
        </Card>
      </div>

      <ProofViewerModal
        isOpen={!!viewingProofUrl}
        onClose={() => setViewingProofUrl(null)}
        imageUrl={viewingProofUrl}
      />
    </AppShell>
  );
}
