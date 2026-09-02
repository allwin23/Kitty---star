'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { Users, Copy, Check, ArrowRight } from 'lucide-react';

export default function PartnerLinkingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuthStore();
  const [partnerCode, setPartnerCode] = useState('');
  const [myInviteCode, setMyInviteCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch or generate user's invite code
  useEffect(() => {
    async function loadInviteCode() {
      if (!user) return;
      // Check existing active invite
      const { data } = await supabase
        .from('partner_invites')
        .select('code')
        .eq('created_by', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (data?.code) {
        setMyInviteCode(data.code);
      } else {
        // Generate a new 8-character invite code
        const code = Math.random().toString(36).substring(2, 10).toUpperCase();
        await supabase.from('partner_invites').insert({
          created_by: user.id,
          code,
          status: 'active',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
        setMyInviteCode(code);
      }
    }
    void loadInviteCode();
  }, [user]);

  const handleCopy = () => {
    if (myInviteCode) {
      navigator.clipboard.writeText(myInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConnectPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = partnerCode.trim().toUpperCase();
    if (!cleanCode) {
      setError('Please enter a partner code.');
      return;
    }
    if (cleanCode === myInviteCode) {
      setError('You cannot link with your own invite code!');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Find invite
      const { data: invite, error: inviteErr } = await supabase
        .from('partner_invites')
        .select('*')
        .eq('code', cleanCode)
        .eq('status', 'active')
        .maybeSingle();

      if (inviteErr || !invite) {
        throw new Error('Invalid or expired invite code.');
      }

      if (invite.created_by === user?.id) {
        throw new Error('You cannot use your own invite code.');
      }

      // Link both users symmetrically
      await supabase
        .from('profiles')
        .update({ partner_id: invite.created_by })
        .eq('id', user!.id);

      await supabase
        .from('profiles')
        .update({ partner_id: user!.id })
        .eq('id', invite.created_by);

      // Mark invite used
      await supabase
        .from('partner_invites')
        .update({ status: 'used', used_by: user!.id })
        .eq('id', invite.id);

      await refreshProfile();
      setSuccess('🎉 You and your partner are successfully linked!');
      setTimeout(() => router.push('/home'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to link partner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-3xl shadow-md mb-1 animate-float">
            🤝
          </div>
          <h1 className="text-3xl font-extrabold text-[#2A1D22] tracking-tight font-heading italic">
            Dual Accountability
          </h1>
          <p className="text-xs font-semibold text-[#66545B] max-w-xs mx-auto">
            Connect with your study partner to verify daily study logs, share focus, and keep streaks alive.
          </p>
        </div>

        {/* Option 1: Your invite code */}
        <div className="p-4 rounded-[20px] bg-[#FFF3F5] border border-[#FAD7E0] space-y-2">
          <p className="text-xs font-bold text-[#66545B]">Share your code with your partner:</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white font-mono font-bold text-center py-2.5 px-3 rounded-[14px] border border-[#FFE4EB] text-[#C73A57] text-lg tracking-widest">
              {myInviteCode || 'LOADING…'}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              className="shrink-0 h-[46px]"
              icon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>

        {/* Option 2: Enter partner code */}
        <form onSubmit={handleConnectPartner} className="space-y-4">
          <Input
            label="Or enter your partner's code"
            placeholder="e.g. 8K3J99FA"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value.toUpperCase())}
            icon={<Users className="w-4 h-4" />}
          />

          {error && (
            <div className="p-3 bg-rose-50 rounded-[14px] border border-rose-200 text-xs font-bold text-[#D94C61] text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50 rounded-[14px] border border-emerald-200 text-xs font-bold text-[#63C58B] text-center">
              {success}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Link Partner & Start
          </Button>
        </form>

        <div className="text-center pt-1">
          <button
            onClick={() => router.push('/home')}
            className="text-xs font-bold text-[#66545B] hover:text-[#C73A57] inline-flex items-center gap-1 hover:underline"
          >
            <span>Skip for now, connect later</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </Card>
    </div>
  );
}
