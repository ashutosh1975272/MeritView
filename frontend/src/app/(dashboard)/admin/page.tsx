'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog } from '@/components/ui/dialog';

interface AdminDispute {
  id: string;
  title: string;
  state: string;
  initiatorUserId: string;
  createdAt: string;
  evaluatorOutputs: Array<{ id: string; provider: string; status: string }>;
  opinions: Array<{ id: string; createdAt: string }>;
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [publishDisputeId, setPublishDisputeId] = useState<string | null>(null);

  const { data: disputes, isLoading } = useQuery<AdminDispute[]>({
    queryKey: ['admin-disputes'],
    queryFn: () => apiRequest('/v1/admin/disputes'),
  });

  const { data: pendingAggs } = useQuery<AdminDispute[]>({
    queryKey: ['admin-pending'],
    queryFn: () => apiRequest('/v1/admin/aggregations/pending'),
  });

  const publishMutation = useMutation({
    mutationFn: (disputeId: string) => apiRequest(`/v1/admin/aggregations/${disputeId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      setPublishDisputeId(null);
    },
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {pendingAggs && pendingAggs.length > 0 && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Aggregations</h2>
          <div className="space-y-3">
            {pendingAggs.map((dispute) => (
              <div key={dispute.id} className="flex items-center justify-between border-b pb-3">
                <div>
                  <p className="font-medium">{dispute.title}</p>
                  <p className="text-sm text-gray-500">{dispute.evaluatorOutputs.length} outputs ready</p>
                </div>
                <Button size="sm" onClick={() => setPublishDisputeId(dispute.id)}>Publish Opinion</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">All Disputes</h2>
        {!disputes || disputes.length === 0 ? (
          <p className="text-gray-500">No disputes found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4">Title</th>
                  <th className="pb-3 pr-4">State</th>
                  <th className="pb-3 pr-4">Created</th>
                  <th className="pb-3 pr-4">Outputs</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {disputes.map((dispute) => (
                  <tr key={dispute.id} className="border-b">
                    <td className="py-3 pr-4 font-medium">{dispute.title}</td>
                    <td className="py-3 pr-4"><Badge variant={dispute.state as any}>{dispute.state}</Badge></td>
                    <td className="py-3 pr-4 text-gray-500">{new Date(dispute.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{dispute.evaluatorOutputs.length}</td>
                    <td className="py-3">
                      {dispute.state === 'AWAITING_AGGREGATION' && (
                        <Button size="sm" onClick={() => setPublishDisputeId(dispute.id)}>Publish</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog
        open={!!publishDisputeId}
        onClose={() => setPublishDisputeId(null)}
        title="Publish Opinion"
        onConfirm={() => publishDisputeId && publishMutation.mutate(publishDisputeId)}
        confirmLabel={publishMutation.isPending ? 'Publishing...' : 'Publish Opinion'}
      >
        <p>This will create and publish the aggregated opinion for this dispute. The user will be notified.</p>
        {publishMutation.isError && (
          <p className="text-red-600 text-sm mt-2">Failed: {(publishMutation.error as any)?.message}</p>
        )}
      </Dialog>

      {!pendingAggs || pendingAggs.length === 0 ? (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <p className="text-yellow-800">No pending aggregations to review.</p>
        </Card>
      ) : null}
    </div>
  );
}
