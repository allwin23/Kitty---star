'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getCurrentPlan, getPartnerProfile } from '@/services/planner-read.service';
import { submissionService } from '@/services/backend';
import { todayIso } from '@/lib/supabase-helpers';
import { useAuthStore } from '@/stores';
import { Upload, Check, AlertCircle, ArrowLeft, Image as ImageIcon, Send } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SubmitEvidencePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const today = todayIso();

  const [remark, setRemark] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planQ = useQuery({
    queryKey: ['current-plan', today],
    queryFn: () => getCurrentPlan(today),
    enabled: !!user,
  });

  const partnerQ = useQuery({
    queryKey: ['partner-profile'],
    queryFn: () => getPartnerProfile(),
    enabled: !!user,
  });

  const currentPlan = planQ.data;
  const partner = partnerQ.data;
  const tasks = (currentPlan?.current_tasks ?? []) as any[];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmitDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPlan?.id) {
      setError('No active daily plan found to submit.');
      return;
    }
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Submit day
      const submission = await submissionService.submit(currentPlan.id, remark.trim());

      // 2. Upload photo proof if attached
      if (selectedFile && submission?.id) {
        const ext = (selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg') as 'jpg' | 'png' | 'webp';
        const validExt = ['jpg', 'png', 'webp'].includes(ext) ? ext : 'jpg';

        await submissionService.uploadProof(
          submission.id,
          user.id,
          selectedFile,
          validExt,
          remark.trim() || undefined,
          selectedTaskId || undefined
        );
      }

      // Celebrate
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      setTimeout(() => router.push('/accountability'), 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit study proof.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="Submit Study Proof"
          subtitle={`Deliver evidence to ${partner?.full_name || 'your partner'} for review`}
          backUrl="/accountability"
        />

        <Card className="p-6 sm:p-8 space-y-6 bg-white/95">
          <form onSubmit={handleSubmitDay} className="space-y-5">
            {/* File Upload / Camera Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-black uppercase text-[#2A1D22] tracking-wider">
                Photographic Evidence Proof (Mandatory for Streak)
              </label>

              <div className="relative border-2 border-dashed border-[#FAD7E0] hover:border-[#E84D72] rounded-[22px] p-6 bg-[#FFF3F5] text-center transition-colors cursor-pointer flex flex-col items-center justify-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {previewUrl ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Proof Preview"
                      className="w-48 h-48 object-cover rounded-[18px] mx-auto border border-[#FAD7E0] shadow-sm"
                    />
                    <p className="text-xs font-bold text-[#C73A57]">
                      {selectedFile?.name} (Click to change photo)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 py-4">
                    <div className="w-12 h-12 rounded-full bg-white text-[#C73A57] flex items-center justify-center mx-auto shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#2A1D22]">
                      Click or drag & drop handwritten notes, screen, or workbook
                    </p>
                    <p className="text-xs text-[#66545B]">Supports JPG, PNG, WEBP</p>
                  </div>
                )}
              </div>
            </div>

            {/* Optional task link */}
            {tasks.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase text-[#2A1D22] tracking-wider">
                  Link Proof to Specific Task (Optional)
                </label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-[#FFF3F5] text-sm font-medium rounded-[18px] px-4 py-3 border border-[#FAD7E0] outline-none text-[#2A1D22]"
                >
                  <option value="">General Proof for Entire Day</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status === 'completed' ? 'Done' : 'Pending'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Reflection Note */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black uppercase text-[#2A1D22] tracking-wider">
                Daily Reflection or Partner Remark
              </label>
              <textarea
                rows={3}
                placeholder="What went well today? What was challenging? Leave a note for your partner…"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="w-full bg-[#FFF3F5] text-sm font-medium rounded-[18px] p-4 border border-[#FAD7E0] outline-none focus:bg-white focus:border-[#E84D72] text-[#2A1D22]"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-50 rounded-[14px] border border-rose-200 text-xs font-bold text-[#D94C61] text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={loading}
              icon={<Send className="w-5 h-5" />}
            >
              Submit Proof for Review
            </Button>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
