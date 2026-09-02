'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { HeaderTitleCard } from '@/components/ui/HeaderTitleCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores';
import { getPartnerProfile } from '@/services/planner-read.service';
import { testingService } from '@/services/backend';
import { supabase } from '@/lib/supabase';
import { User, Users, LogOut, Copy, Check, RotateCcw, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile, logout } = useAuthStore();
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const partnerQ = useQuery({
    queryKey: ['partner-profile'],
    queryFn: () => getPartnerProfile(),
    enabled: !!user,
  });

  const partner = partnerQ.data;

  const handleResetData = async () => {
    if (window.confirm('⚠️ Danger Zone: Are you sure you want to reset all daily plans, tasks, submissions, reports, and notification history?')) {
      setResetting(true);
      try {
        await testingService.resetAllData();
        queryClient.clear();
        alert('Database successfully reset to clean state!');
      } catch (err: any) {
        alert(`Failed to reset: ${err.message}`);
      } finally {
        setResetting(false);
      }
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <HeaderTitleCard
          title="Account & Study Settings"
          subtitle="Manage your profile, partner pairing, and study preferences"
        />

        {/* User Details Card */}
        <Card className="p-6 space-y-4 bg-white/95">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-white flex items-center justify-center text-2xl font-black shadow-md">
              {profile?.full_name ? profile.full_name[0].toUpperCase() : '🐱'}
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-[#2A1D22]">
                {profile?.full_name || 'Study Explorer'}
              </h3>
              <p className="text-xs font-semibold text-[#66545B]">{user?.email}</p>
              <span className="inline-block mt-1 text-[10px] font-extrabold text-[#C73A57] bg-[#FFE4EB] px-2.5 py-0.5 rounded-full border border-[#FAD7E0]">
                Dual-Accountability Member
              </span>
            </div>
          </div>
        </Card>

        {/* Connected Study Partner Card */}
        <Card className="p-6 space-y-4 bg-white/95">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Users className="w-5 h-5 text-[#C73A57]" />
              <h4 className="text-sm font-extrabold text-[#2A1D22]">Connected Study Partner</h4>
            </div>
            {partner ? (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Active Pairing
              </span>
            ) : null}
          </div>

          {partner ? (
            <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#2A1D22]">{partner.full_name || 'Partner'}</p>
                <p className="text-xs text-[#66545B]">{partner.email}</p>
              </div>
              <Button
                variant="tertiary"
                size="sm"
                className="text-[#D94C61]"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to unlink from your partner?')) {
                    await supabase.from('profiles').update({ partner_id: null }).eq('id', user!.id);
                    window.location.reload();
                  }
                }}
              >
                Unlink
              </Button>
            </div>
          ) : (
            <div className="p-4 rounded-[18px] bg-[#FFF3F5] border border-[#FFE4EB] flex items-center justify-between">
              <p className="text-xs font-semibold text-[#66545B]">
                No study partner linked yet. Share an invite code to pair up!
              </p>
              <Link href="/partner-linking">
                <Button size="sm">Link Partner</Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Developer Testing / Reset Tool */}
        <Card className="p-6 space-y-3 bg-white/95">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#D94C61]">
            Developer & Reset Tools
          </h4>
          <p className="text-xs text-[#66545B]">
            Reset all daily plans, tasks, submissions, reports, and notification histories back to a clean slate.
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetData}
            loading={resetting}
            className="!bg-rose-50 text-[#D94C61] border-rose-200"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset Database (Unseed)
          </Button>
        </Card>

        {/* Sign Out Button */}
        <Button
          variant="secondary"
          size="lg"
          className="w-full text-[#D94C61] hover:!bg-rose-100"
          onClick={() => void logout()}
          icon={<LogOut className="w-4 h-4" />}
        >
          Sign Out of Companion Space
        </Button>
      </div>
    </AppShell>
  );
}
