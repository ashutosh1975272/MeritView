'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || 'there'}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your disputes and view opinions from AI analysis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/disputes/new"
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span aria-hidden="true">➕</span>
            </div>
            <h3 className="font-semibold text-lg">Create New Dispute</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Start a new contract interpretation analysis. $49 flat fee.
          </p>
        </Link>

        <Link
          href="/dashboard/disputes"
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <span aria-hidden="true">⚖️</span>
            </div>
            <h3 className="font-semibold text-lg">My Disputes</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            View and manage all your active and completed disputes.
          </p>
        </Link>

        <Link
          href="/dashboard/profile"
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <span aria-hidden="true">👤</span>
            </div>
            <h3 className="font-semibold text-lg">Profile Settings</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage your account, notifications, and preferences.
          </p>
        </Link>
      </div>

      <section aria-labelledby="recent-disputes-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="recent-disputes-heading" className="text-xl font-semibold">
            Recent Disputes
          </h2>
          <Link
            href="/dashboard/disputes"
            className="text-sm text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="border border-border rounded-lg bg-card">
          <div className="p-6 text-center text-muted-foreground">
            <p className="mb-2">No disputes yet</p>
            <Link
              href="/dashboard/disputes/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <span>Create your first dispute</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}