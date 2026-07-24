'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface DisputeDetail {
  id: string;
  title: string;
  summary?: string;
  category: string;
  state: string;
  pricingTier: string;
  priceUsd: number;
  estimatedStakesUsd?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  parties: Array<{ id: string; role: string; briefStatus: string; userId?: string }>;
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

const stateActions: Record<string, { label: string; href?: string; action?: string }[]> = {
  DRAFT: [
    { label: 'Submit Brief', href: 'brief' },
    { label: 'Withdraw', action: 'withdraw' },
  ],
  BRIEF_SUBMITTED: [
    { label: 'Make Payment', href: 'payment' },
    { label: 'Withdraw', action: 'withdraw' },
  ],
  PAYMENT_PENDING: [
    { label: 'Complete Payment', href: 'payment' },
  ],
  UNDER_ANALYSIS: [
    { label: 'View Analysis', href: 'analysis' },
  ],
  AWAITING_AGGREGATION: [
    { label: 'View Analysis', href: 'analysis' },
  ],
  COMPLETED: [
    { label: 'View Opinion', href: 'opinion' },
  ],
};

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const { data: dispute, isLoading, error } = useQuery<DisputeDetail>({
    queryKey: ['dispute', params.id],
    queryFn: () => apiRequest<DisputeDetail>(`/v1/disputes/${params.id}`),
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiRequest(`/v1/disputes/${params.id}/withdraw`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', params.id] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      setShowWithdrawDialog(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Dispute not found</p>
        <Link href="/disputes"><Button variant="outline">Back to Disputes</Button></Link>
      </div>
    );
  }

  const actions = stateActions[dispute.state] || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/disputes" className="text-sm text-blue-600 hover:underline">&larr; Back to Disputes</Link>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{dispute.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(dispute.createdAt).toLocaleDateString()}
              {dispute.updatedAt !== dispute.createdAt && ` · Updated ${new Date(dispute.updatedAt).toLocaleDateString()}`}
            </p>
          </div>
          <Badge variant={dispute.state as any}>{stateLabels[dispute.state]}</Badge>
        </div>

        {dispute.summary && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-1">Summary</h3>
            <p className="text-gray-600">{dispute.summary}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Category</span>
            <p className="font-medium">{dispute.category.replace(/_/g, ' ')}</p>
          </div>
          <div>
            <span className="text-gray-500">Pricing Tier</span>
            <p className="font-medium">{dispute.pricingTier} — ${dispute.priceUsd}</p>
          </div>
          {dispute.estimatedStakesUsd && (
            <div>
              <span className="text-gray-500">Estimated Stakes</span>
              <p className="font-medium">${dispute.estimatedStakesUsd.toLocaleString()}</p>
            </div>
          )}
          {dispute.completedAt && (
            <div>
              <span className="text-gray-500">Completed</span>
              <p className="font-medium">{new Date(dispute.completedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </Card>

      {dispute.parties.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Parties</h2>
          <div className="space-y-2">
            {dispute.parties.map((party) => (
              <div key={party.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{party.role.replace(/_/g, ' ')}</span>
                <Badge variant={party.briefStatus as any}>{party.briefStatus.replace(/_/g, ' ')}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {actions.length > 0 && (
        <div className="flex gap-3">
          {actions.map((action) =>
            action.href ? (
              <Link key={action.href} href={`/disputes/${params.id}/${action.href}`}>
                <Button>{action.label}</Button>
              </Link>
            ) : (
              <Button
                key={action.action}
                variant={action.action === 'withdraw' ? 'danger' : 'primary'}
                onClick={() => action.action === 'withdraw' && setShowWithdrawDialog(true)}
              >
                {action.label}
              </Button>
            )
          )}
        </div>
      )}

      <Dialog
        open={showWithdrawDialog}
        onClose={() => setShowWithdrawDialog(false)}
        title="Withdraw Dispute"
        onConfirm={() => withdrawMutation.mutate()}
        confirmLabel={withdrawMutation.isPending ? 'Withdrawing...' : 'Confirm Withdrawal'}
        variant="danger"
      >
        <p>Are you sure you want to withdraw this dispute? This action cannot be undone.</p>
        {withdrawMutation.isError && (
          <p className="text-red-600 text-sm mt-2">Failed to withdraw: {(withdrawMutation.error as any)?.message}</p>
        )}
      </Dialog>
    </div>
  );
}
