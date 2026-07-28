'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  AWAITING_COUNTERPARTY: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  AWAITING_BRIEFS: 'bg-purple-100 text-purple-700',
  AWAITING_COUNTERPARTY_BRIEF: 'bg-indigo-100 text-indigo-700',
  UNDER_ANALYSIS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  WITHDRAWN: 'bg-red-100 text-red-700',
  DECLINED: 'bg-red-100 text-red-700',
};

function StateBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_COLORS[state] || 'bg-gray-100 text-gray-700'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

function DisputeListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 border border-border rounded-lg bg-card">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/4" />
        </div>
      ))}
    </div>
  );
}

export default function DisputesPage() {
  const { data: disputesResponse, isLoading, isError, error } = useQuery({
    queryKey: ['disputes'],
    queryFn: () => apiClient.getDisputes(),
  });
  const disputes = Array.isArray(disputesResponse) ? disputesResponse : (disputesResponse as any)?.data || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Disputes</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all your disputes.
          </p>
        </div>
        <Link
          href="/dashboard/disputes/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          <span>New Dispute</span>
        </Link>
      </div>

      {isLoading && <DisputeListSkeleton />}

      {isError && (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 font-medium">Failed to load disputes</p>
          <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        </div>
      )}

      {!isLoading && !isError && disputes && disputes.length === 0 && (
        <div className="p-12 border border-border rounded-lg bg-card text-center">
          <p className="text-muted-foreground mb-4">You haven&apos;t created any disputes yet</p>
          <Link
            href="/dashboard/disputes/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Create your first dispute
          </Link>
        </div>
      )}

      {!isLoading && !isError && disputes && disputes.length > 0 && (
        <div className="space-y-3">
          {disputes.map((dispute: any) => (
            <Link
              key={dispute.id}
              href={`/dashboard/disputes/${dispute.id}`}
              className="block p-6 border border-border rounded-lg bg-card hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-lg truncate">{dispute.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {dispute.summary || 'No summary provided'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created {new Date(dispute.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StateBadge state={dispute.state} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
