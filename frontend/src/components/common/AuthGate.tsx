'use client';
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Loading } from '@/components/ui/Loading';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, profile, loading, initialize } = useAuthStore();

  useEffect(() => {
    void initialize();
  }, [initialize]);

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/complete-profile') ||
    pathname.startsWith('/partner-linking');

  useEffect(() => {
    if (loading) return;

    // Not authenticated -> redirect to /login
    if (!session) {
      if (!isAuthRoute && pathname !== '/') {
        router.replace('/login');
      }
      return;
    }

    // Authenticated: check if profile completion is needed
    if (profile) {
      if (!profile.full_name && pathname !== '/complete-profile') {
        router.replace('/complete-profile');
        return;
      }

      if (!profile.partner_id && pathname === '/login') {
        router.replace('/home');
        return;
      }

      // If on auth routes, redirect to home
      if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
        router.replace('/home');
      }
    }
  }, [loading, session, profile, pathname, router, isAuthRoute]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F63E5F]">
        <Loading message="Starting StudyPartner…" />
      </div>
    );
  }

  return <>{children}</>;
}
