'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function AdminDashboardPage() {
  const { data: pendingData, isLoading: pendingLoading } = useQuery({
    queryKey: ['admin', 'aggregations', 'pending'],
    queryFn: () => apiClient.adminGetPendingAggregations(),
  });

  const { data: disputesData, isLoading: disputesLoading } = useQuery({
    queryKey: ['admin', 'disputes', 'dashboard'],
    queryFn: () => apiClient.adminGetDisputes({ limit: 5 }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of system activity.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="text-sm font-medium text-muted-foreground">Pending Aggregations</h2>
          <p className="text-3xl font-bold mt-2">
            {pendingLoading ? '...' : pendingData?.count ?? 0}
          </p>
          <Link href="/admin/aggregations" className="text-xs text-primary hover:underline mt-2 inline-block">
            View pending
          </Link>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="text-sm font-medium text-muted-foreground">Total Disputes</h2>
          <p className="text-3xl font-bold mt-2">
            {disputesLoading ? '...' : disputesData?.pagination?.total ?? 0}
          </p>
          <Link href="/admin/disputes" className="text-xs text-primary hover:underline mt-2 inline-block">
            View all
          </Link>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="text-sm font-medium text-muted-foreground">Quick Actions</h2>
          <div className="mt-3 space-y-2">
            <Link
              href="/admin/aggregations"
              className="block text-sm text-primary hover:underline"
            >
              → Review pending aggregations
            </Link>
            <Link
              href="/admin/disputes"
              className="block text-sm text-primary hover:underline"
            >
              → Browse all disputes
            </Link>
          </div>
        </div>
      </div>

      {disputesData && disputesData.disputes.length > 0 && (
        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-4">Recent Disputes</h2>
          <div className="space-y-2">
            {disputesData.disputes.slice(0, 5).map((dispute: any) => (
              <Link
                key={dispute.id}
                href={`/admin/disputes/${dispute.id}`}
                className="flex items-center justify-between p-3 rounded-md hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm font-medium truncate max-w-[300px]">{dispute.title}</span>
                <span className="text-xs text-muted-foreground">
                  {dispute.state.replace(/_/g, ' ')} · {new Date(dispute.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
