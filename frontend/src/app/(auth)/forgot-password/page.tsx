'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('Password reset instructions sent to your email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-extrabold text-[#2A1D22] tracking-tight font-heading italic">
            Reset Password
          </h1>
          <p className="text-xs font-semibold text-[#66545B]">
            Enter your email to receive a password reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            required
          />

          {error && (
            <div className="p-3 bg-rose-50 rounded-[14px] border border-rose-200 text-xs font-bold text-[#D94C61] text-center">
              {error}
            </div>
          )}

          {message && (
            <div className="p-3 bg-emerald-50 rounded-[14px] border border-emerald-200 text-xs font-bold text-[#63C58B] text-center">
              {message}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Send Reset Link
          </Button>
        </form>

        <div className="text-center pt-2">
          <Link
            href="/login"
            className="text-xs font-bold text-[#C73A57] hover:underline inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </Card>
    </div>
  );
}
