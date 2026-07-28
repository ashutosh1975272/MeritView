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

const STATES = ['', 'DRAFT', 'AWAITING_BRIEFS', 'UNDER_ANALYSIS', 'COMPLETED', 'WITHDRAWN', 'DECLINED'];

function StateBadge({ state }: { state: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_COLORS[state] || 'bg-gray-100 text-gray-700'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminDisputesPage() {
  const [stateFilter, setStateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'disputes', stateFilter, searchQuery, page],
    queryFn: () =>
      apiClient.adminGetDisputes({
        state: stateFilter || undefined,
        search: searchQuery || undefined,
        page,
        limit,
      }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Disputes</h1>
          <p className="text-muted-foreground mt-1">Admin view of all disputes in the system.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-md text-sm bg-background"
        >
          <option value="">All States</option>
          {STATES.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by title or summary..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border rounded-md text-sm bg-background min-w-[250px]"
        />
      </div>

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 font-medium">Failed to load disputes</p>
          <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        </div>
      )}

      {data && data.disputes.length === 0 && (
        <div className="p-12 border border-border rounded-lg bg-card text-center">
          <p className="text-muted-foreground">No disputes found matching your filters.</p>
        </div>
      )}

      {data && data.disputes.length > 0 && (
        <>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium">State</th>
                  <th className="text-left px-4 py-3 font-medium">Party Count</th>
                  <th className="text-left px-4 py-3 font-medium">Evaluations</th>
                  <th className="text-left px-4 py-3 font-medium">Opinion</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.disputes.map((dispute: any) => (
                  <tr key={dispute.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{dispute.title}</td>
                    <td className="px-4 py-3"><StateBadge state={dispute.state} /></td>
                    <td className="px-4 py-3">{dispute._count?.parties || 0}</td>
                    <td className="px-4 py-3">{dispute._count?.evaluatorOutputs || 0}</td>
                    <td className="px-4 py-3">
                      {dispute.opinion ? (
                        <span className="text-green-600 text-xs font-medium">
                          {dispute.opinion.deliveredAt ? 'Published' : 'Draft'}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">None</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(dispute.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/disputes/${dispute.id}`}
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.pagination.totalPages}
                  className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
