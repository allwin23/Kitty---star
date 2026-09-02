'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores';
import { Loading } from '@/components/ui/Loading';

export default function RootPage() {
  const router = useRouter();
  const { session, loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/home');
      } else {
        router.replace('/login');
      }
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F63E5F]">
      <Loading message="Entering Study Space…" />
    </div>
  );
}
