'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);
  const {
    notifications,
    unreadCount,
    isOpen,
    markAsRead,
    markAllAsRead,
    removeNotification,
    togglePanel,
    setOpen,
  } = useNotificationStore();

  const panelRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !isLoading && !user) {
      router.push('/login?callbackUrl=' + encodeURIComponent(pathname));
    }
  }, [user, isLoading, router, pathname, hydrated]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setOpen]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  if (!hydrated || isLoading) {
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

          <button
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <div className="relative" ref={panelRef}>
              <button
                onClick={togglePanel}
                className="relative flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors focus-visible-ring"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
              >
                <span aria-hidden="true">🔔</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                    <h3 className="font-semibold text-sm">Notifications</h3>
                    <div className="flex gap-2">
                      {notifications.length > 0 && (
                        <button
                          onClick={markAllAsRead}
                          className="text-xs text-primary hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-border last:border-b-0 hover:bg-accent/50 transition-colors ${
                            !notification.read ? 'bg-accent/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`flex-shrink-0 w-2 h-2 rounded-full ${
                                  notification.type === 'error' ? 'bg-red-500' :
                                  notification.type === 'warning' ? 'bg-yellow-500' :
                                  notification.type === 'success' ? 'bg-green-500' :
                                  'bg-blue-500'
                                }`} />
                                <p className="text-sm font-medium truncate">
                                  {notification.title}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {notification.message}
                              </p>
                              {notification.link && (
                                <Link
                                  href={notification.link}
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-xs text-primary hover:underline mt-1 inline-block"
                                >
                                  View details
                                </Link>
                              )}
                            </div>
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="flex-shrink-0 text-muted-foreground hover:text-foreground text-xs p-1"
                              aria-label="Remove notification"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

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

      {mobileMenuOpen && (
        <nav className="md:hidden border-b border-border bg-background animate-slide-down" aria-label="Mobile navigation">
          <div className="container px-4 py-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      )}

      <main id="main-content" className="container py-6 px-4" role="main">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
