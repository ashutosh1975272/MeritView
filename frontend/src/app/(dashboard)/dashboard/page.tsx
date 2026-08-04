'use client';

import { useAuthStore } from '@/stores/useAuthStore';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: disputesRes, isLoading } = useQuery({
    queryKey: ['disputes', 'all'],
    queryFn: () => apiClient.getDisputes(),
  });

  const disputes = disputesRes?.data ?? [];
  
  // Calculate stats
  const totalDisputes = disputes.length;
  const completed = disputes.filter((d: any) => d.state === 'COMPLETED').length;
  const pendingAction = disputes.filter((d: any) => 
    d.state === 'AWAITING_COUNTERPARTY' || 
    d.state === 'PAYMENT_PENDING' || 
    d.state === 'AWAITING_BRIEFS' ||
    d.state === 'DRAFT'
  ).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user?.displayName || 'there'}</h1>
        <p className="text-muted-foreground mt-1">
          Manage your disputes and view opinions from AI analysis.
        </p>
      </div>

      {/* Stats row */}
      {!isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 border border-border rounded-xl bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Disputes</p>
              <p className="text-2xl font-bold">{totalDisputes}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">📊</div>
          </div>
          <div className="p-4 border border-border rounded-xl bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Action</p>
              <p className="text-2xl font-bold text-orange-600">{pendingAction}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">⏳</div>
          </div>
          <div className="p-4 border border-border rounded-xl bg-card shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed Analysis</p>
              <p className="text-2xl font-bold text-green-600">{completed}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">✅</div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/dashboard/disputes/new"
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <span aria-hidden="true">➕</span>
            </div>
            <h3 className="font-semibold text-lg">Create New Dispute</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Start a new analysis starting from $99. Fast, multi-model evaluation.
          </p>
        </Link>

        <Link
          href="/dashboard/disputes"
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors shadow-sm"
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
          className="group p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors shadow-sm"
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
        <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground animate-pulse">Loading...</div>
          ) : disputes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p className="mb-3">No disputes yet</p>
              <Link
                href="/dashboard/disputes/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <span>Create your first dispute</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {disputes.slice(0, 3).map((d: any) => (
                <div key={d.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <Link href={`/dashboard/disputes/${d.id}`} className="font-medium hover:underline">
                      {d.title}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-0.5">Created {new Date(d.createdAt).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    d.state === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    d.state === 'PAYMENT_PENDING' ? 'bg-orange-100 text-orange-700' :
                    d.state === 'UNDER_ANALYSIS' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {d.state.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Global Disclaimer */}
      <div className="mt-12 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-sm font-bold text-yellow-800 mb-1">Important Disclaimer</h3>
        <p className="text-xs text-yellow-700">
          MeritView uses Artificial Intelligence to analyze disputes. The opinions, summaries, and analyses provided by this platform are for informational and decision-support purposes only. They do not constitute legal advice and should not be relied upon as a substitute for professional legal counsel.
        </p>
      </div>

    </div>
  );
}
