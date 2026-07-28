'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading, checkAuth } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (mounted && !isLoading) {
      const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
      if (user && !user.emailVerified) {
        router.push('/verify-email');
      } else if (user) {
        router.push(callbackUrl);
      }
    }
  }, [mounted, isLoading, user, router, searchParams]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}