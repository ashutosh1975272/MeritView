'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Dispute {
  id: string;
  title: string;
  category: string;
  state: string;
  priceUsd: number;
  createdAt: string;
  summary?: string;
}

const stateLabels: Record<string, string> = {
  DRAFT: 'Draft',
  BRIEF_SUBMITTED: 'Brief Submitted',
  PAYMENT_PENDING: 'Payment Pending',
  UNDER_ANALYSIS: 'Under Analysis',
  AWAITING_AGGREGATION: 'Awaiting Review',
  COMPLETED: 'Completed',
  WITHDRAWN: 'Withdrawn',
  FAILED: 'Failed',
  DECLINED: 'Declined',
};

export default function DisputesPage() {
  const queryClient = useQueryClient();
  const { data: disputes, isLoading, error, refetch } = useQuery<Dispute[]>({
    queryKey: ['disputes'],
    queryFn: () => apiRequest<Dispute[]>('/v1/disputes'),
    staleTime: 300000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading disputes">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900" id="disputes-heading">My Disputes</h1>
        </div>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" aria-hidden="true" />
        ))}
        <span className="sr-only">Loading your disputes...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12" role="alert" aria-live="assertive">
        <p className="text-red-600 mb-4">Failed to load disputes</p>
        <Button onClick={() => { queryClient.invalidateQueries({ queryKey: ['disputes'] }); refetch(); }}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900" id="disputes-heading">My Disputes</h1>
        <Link href="/disputes/new">
          <Button aria-label="Create new dispute">New Dispute</Button>
        </Link>
      </div>

      {!disputes || disputes.length === 0 ? (
        <Card className="p-12 text-center" role="status" aria-label="No disputes found">
          <div className="text-6xl mb-4" aria-hidden="true">&#9878;&#65039;</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No disputes yet</h2>
          <p className="text-gray-500 mb-6">Create your first dispute to get started with AI-powered contract analysis.</p>
          <Link href="/disputes/new">
            <Button>Create Your First Dispute</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4" role="list" aria-label="List of your disputes">
          {disputes.map((dispute, index) => (
            <Link key={dispute.id} href={`/disputes/${dispute.id}`} role="listitem" aria-label={`Dispute ${index + 1}: ${dispute.title}, status ${stateLabels[dispute.state] || dispute.state}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{dispute.title}</h3>
                    {dispute.summary && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dispute.summary}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Badge variant={dispute.state as any}>{stateLabels[dispute.state] || dispute.state}</Badge>
                      <span className="text-sm text-gray-400">{dispute.category.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-gray-900">${dispute.priceUsd}</p>
                    <p className="text-xs text-gray-400">{new Date(dispute.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
