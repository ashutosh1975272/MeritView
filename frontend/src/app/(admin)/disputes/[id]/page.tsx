'use client';

import { useParams } from 'next/navigation';
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
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATE_COLORS[state] || 'bg-gray-100 text-gray-700'}`}>
      {state.replace(/_/g, ' ')}
    </span>
  );
}

export default function AdminDisputeDetailPage() {
  const params = useParams();
  const disputeId = params.id as string;

  const { data: dispute, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dispute', disputeId],
    queryFn: () => apiClient.adminGetDispute(disputeId),
    enabled: !!disputeId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
        <div className="h-40 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 font-medium">Failed to load dispute</p>
        <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        <Link href="/admin/disputes" className="text-primary hover:underline text-sm mt-3 inline-block">
          Back to disputes
        </Link>
      </div>
    );
  }

  if (!dispute) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/admin/disputes" className="hover:text-foreground transition-colors">Disputes</Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{dispute.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">{dispute.title}</h1>
            <StateBadge state={dispute.state} />
          </div>
          <p className="text-muted-foreground mt-2">
            Created {new Date(dispute.createdAt).toLocaleDateString()}
            {dispute.completedAt && ` · Completed ${new Date(dispute.completedAt).toLocaleDateString()}`}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Details</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-muted-foreground">Category</dt>
              <dd className="text-sm font-medium capitalize">{dispute.category?.replace(/_/g, ' ').toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Summary</dt>
              <dd className="text-sm">{dispute.summary || 'No summary provided'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Estimated Stakes</dt>
              <dd className="text-sm font-medium">{dispute.estimatedStakesUsd ? `$${Number(dispute.estimatedStakesUsd).toLocaleString()}` : 'Not specified'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Price</dt>
              <dd className="text-sm font-medium">${Number(dispute.priceUsd).toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Pricing Tier</dt>
              <dd className="text-sm font-medium capitalize">{dispute.pricingTier?.replace(/_/g, ' ').toLowerCase()}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Parties</h2>
          {dispute.parties && dispute.parties.length > 0 ? (
            <ul className="space-y-2">
              {dispute.parties.map((party: any) => (
                <li key={party.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{party.role.toLowerCase()}</span>
                  <span className="text-xs text-muted-foreground">
                    {party.userId ? `User: ${party.userId.substring(0, 8)}...` : 'No user'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No parties</p>
          )}
        </div>
      </div>

      {dispute.evaluatorOutputs && dispute.evaluatorOutputs.length > 0 && (
        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-4">Evaluator Outputs ({dispute.evaluatorOutputs.length})</h2>
          <div className="space-y-4">
            {dispute.evaluatorOutputs.map((eo: any) => (
              <div key={eo.id} className="p-4 bg-muted/30 rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm">{eo.llmProvider}</span>
                    <span className="text-muted-foreground text-xs ml-2">{eo.modelId}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>⏱ {eo.durationMs}ms</span>
                    <span>💰 ${Number(eo.costUsd).toFixed(4)}</span>
                    <span className={eo.parseSuccess ? 'text-green-600' : 'text-red-600'}>
                      {eo.parseSuccess ? 'Parsed' : 'Parse Error'}
                    </span>
                  </div>
                </div>
                <details>
                  <summary className="text-xs text-primary cursor-pointer hover:underline">View output</summary>
                  <pre className="mt-2 p-3 bg-background rounded text-xs overflow-x-auto max-h-60">
                    {JSON.stringify(eo.structuredOutput, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      )}

      {dispute.opinion && (
        <div className="p-6 border border-green-200 bg-green-50 rounded-lg">
          <h2 className="font-semibold mb-3 text-green-800">Opinion</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-green-700">Status:</dt>
              <dd className="font-medium">{dispute.opinion.deliveredAt ? 'Published' : 'Draft'}</dd>
            </div>
            {dispute.opinion.deliveredAt && (
              <div className="flex justify-between">
                <dt className="text-green-700">Delivered at:</dt>
                <dd>{new Date(dispute.opinion.deliveredAt).toLocaleString()}</dd>
              </div>
            )}
            {dispute.opinion.interEvaluatorAgreement && (
              <div className="flex justify-between">
                <dt className="text-green-700">Agreement:</dt>
                <dd>{(Number(dispute.opinion.interEvaluatorAgreement) * 100).toFixed(1)}%</dd>
              </div>
            )}
            {dispute.opinion.overallConfidence && (
              <div className="flex justify-between">
                <dt className="text-green-700">Confidence:</dt>
                <dd>{(Number(dispute.opinion.overallConfidence) * 100).toFixed(1)}%</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {dispute.payments && dispute.payments.length > 0 && (
        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Payments</h2>
          <div className="space-y-2">
            {dispute.payments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between text-sm">
                <span>${Number(payment.amountUsd).toFixed(2)} - {payment.status}</span>
                <span className="text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
