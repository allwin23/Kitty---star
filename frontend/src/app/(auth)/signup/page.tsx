'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores';
import { Mail, Lock, Sparkles } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    const res = await signup(email.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      setMessage('Account created! Please check your email to confirm, or proceed to complete your profile.');
      setTimeout(() => router.push('/complete-profile'), 1200);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-3xl shadow-md mb-1 animate-float">
            🐱🌸
          </div>
          <h1 className="text-3xl font-extrabold text-[#2A1D22] tracking-tight font-heading italic">
            Create Account
          </h1>
          <p className="text-xs font-semibold text-[#66545B] max-w-xs mx-auto">
            Pair up with a study partner, build streaks, and conquer your goals together.
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

          <Input
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
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
            Create Study Account
          </Button>
        </form>

        <div className="text-center pt-2 text-xs font-semibold text-[#66545B]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C73A57] font-extrabold hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </div>
  );
}
