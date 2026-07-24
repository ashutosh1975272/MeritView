'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Disputes', href: '/dashboard/disputes', icon: '⚖️' },
  { name: 'Profile', href: '/dashboard/profile', icon: '👤' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?callbackUrl=' + encodeURIComponent(pathname));
    }
  }, [user, isLoading, router, pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
            <span className="text-2xl">⚖️</span>
            <span>MeritView</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors focus-visible-ring"
            >
              <span aria-hidden="true">🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main-content" className="container py-6 px-4" role="main">
        {children}
      </main>
    </div>
  );
}