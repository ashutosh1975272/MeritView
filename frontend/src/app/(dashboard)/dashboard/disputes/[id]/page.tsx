'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

function WithdrawDialog({ open, onClose, onConfirm, isLoading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold">Withdraw Dispute</h3>
        <p className="text-muted-foreground mt-2">
          Are you sure you want to withdraw this dispute? This action cannot be undone.
          {isLoading && ' Processing...'}
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Withdrawing...' : 'Confirm Withdrawal'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const disputeId = params.id as string;

  const { data: dispute, isLoading, isError, error } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId,
  });

  const { data: opinion } = useQuery({
    queryKey: ['dispute', disputeId, 'opinion'],
    queryFn: () => apiClient.getOpinion(disputeId),
    enabled: !!dispute && dispute.state === 'COMPLETED',
  });

  const [inviteEmail, setInviteEmail] = useState('');
  
  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiClient.sendInvitation(disputeId, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      setInviteEmail('');
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: () => apiClient.withdrawDispute(disputeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      setShowWithdrawDialog(false);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6" />
          <div className="h-20 bg-gray-200 rounded w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 font-medium">Failed to load dispute</p>
        <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        <Link href="/dashboard/disputes" className="text-primary hover:underline text-sm mt-3 inline-block">
          Back to disputes
        </Link>
      </div>
    );
  }

  if (!dispute) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/disputes" className="hover:text-foreground transition-colors">
          Disputes
        </Link>
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
          </dl>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card">
          <h2 className="font-semibold mb-3">Parties</h2>
          {dispute.parties && dispute.parties.length > 0 ? (
            <ul className="space-y-2">
              {dispute.parties.map((party: any) => (
                <li key={party.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{party.role.toLowerCase()}</span>
                    {party.role === 'RESPONDENT' && party.invitationStatus && party.invitationStatus !== 'ACCEPTED' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {party.invitationStatus.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    party.briefStatus === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
                    party.briefStatus === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {party.briefStatus?.replace(/_/g, ' ')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No parties added yet</p>
          )}

          {dispute.state === 'DRAFT' && (!dispute.parties || !dispute.parties.some((p: any) => p.role === 'RESPONDENT')) && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-2">Invite Counterparty</h3>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (inviteEmail) inviteMutation.mutate(inviteEmail);
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  placeholder="counterparty@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !inviteEmail}
                  className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Invite'}
                </button>
              </form>
              {inviteMutation.isError && (
                <p className="text-xs text-red-500 mt-2">
                  {(inviteMutation.error as any)?.message || 'Failed to send invite'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {dispute.state === 'DRAFT' && (
        <div className="flex gap-3">
          {(!dispute.parties || !dispute.parties.find((p: any) => p.userId === dispute.initiatorUserId)?.briefStatus || dispute.parties.find((p: any) => p.userId === dispute.initiatorUserId).briefStatus !== 'SUBMITTED') && (
            <Link
              href={`/dashboard/disputes/${disputeId}/brief`}
              className="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
            >
              Draft Your Brief
            </Link>
          )}
          <Link
            href={`/dashboard/disputes/${disputeId}/edit`}
            className="px-4 py-2 text-sm font-medium border border-border text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Edit Dispute
          </Link>
          <button
            onClick={() => setShowWithdrawDialog(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            Withdraw
          </button>
        </div>
      )}

      {dispute.state === 'AWAITING_COUNTERPARTY' && (
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/dashboard/disputes/${disputeId}/brief`}
            className="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            Draft Your Brief
          </Link>
          <button
            onClick={() => setShowWithdrawDialog(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
          >
            Withdraw
          </button>
        </div>
      )}

      {dispute.state === 'PAYMENT_PENDING' && (
        <div className="flex gap-3">
          <Link
            href={`/dashboard/disputes/${disputeId}/payment`}
            className="px-6 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
          >
            Proceed to Payment ($49)
          </Link>
        </div>
      )}

      {dispute.state === 'COMPLETED' && opinion && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <h2 className="text-2xl font-bold">AI Analysis & Opinion</h2>
            {opinion.pdfStorageKey && (
              <button
                onClick={async () => {
                  try {
                    const res = await apiClient.getOpinionPdfDownload(disputeId);
                    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${res.downloadUrl}`, '_blank');
                  } catch (e) {
                    console.error('Failed to download PDF:', e);
                  }
                }}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90 transition-colors"
              >
                Download PDF
              </button>
            )}
          </div>
          
          <div className="p-6 border border-border rounded-lg bg-card shadow-sm space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Decision</h3>
              <p className="text-foreground">{opinion.content.decision}</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-2">Ruling</h3>
              <p className="text-foreground">{opinion.content.ruling}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Reasoning</h3>
              <p className="text-foreground whitespace-pre-wrap">{opinion.content.reasoning}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Applicable Law</h3>
              <p className="text-foreground whitespace-pre-wrap">{opinion.content.applicableLaw}</p>
            </div>
            
            {opinion.content.strengths && opinion.content.strengths.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-2">Key Strengths</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {opinion.content.strengths.map((s: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      <span className="font-medium">{s.party}:</span> {s.argument} (Weight: {s.weight}/10)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <WithdrawDialog
        open={showWithdrawDialog}
        onClose={() => setShowWithdrawDialog(false)}
        onConfirm={() => withdrawMutation.mutate()}
        isLoading={withdrawMutation.isPending}
      />

      {withdrawMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {(withdrawMutation.error as any)?.message || 'Failed to withdraw dispute'}
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
