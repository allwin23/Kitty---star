'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores';
import { Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setLoading(true);
    setError(null);

    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
    } else {
      router.push('/home');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-white/95">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#C73A57] to-[#E84D72] text-3xl shadow-md mb-1 animate-float">
            🐱
          </div>
          <h1 className="text-3xl font-extrabold text-[#2A1D22] tracking-tight font-heading italic">
            Welcome back
          </h1>
          <p className="text-xs font-semibold text-[#66545B] max-w-xs mx-auto">
            Sign in to enter your digital study companion & Pomodoro focus space.
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            required
          />

          {error && (
            <div className="p-3 bg-rose-50 rounded-[14px] border border-rose-200 text-xs font-bold text-[#D94C61] text-center">
              {error}
            </div>
          )}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            Sign In to Companion
          </Button>
        </form>

        <div className="flex flex-col items-center gap-2 pt-2 text-xs font-semibold">
          <Link
            href="/forgot-password"
            className="text-[#C73A57] hover:underline"
          >
            Forgot your password?
          </Link>
          <p className="text-[#66545B]">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[#C73A57] font-extrabold hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
