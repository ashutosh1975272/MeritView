'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { DisputeStatusPanel } from '@/components/disputes/DisputeStatusPanel';

const STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  PAYMENT_PENDING: 'bg-orange-100 text-orange-700',
  AWAITING_COUNTERPARTY: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  AWAITING_BRIEFS: 'bg-purple-100 text-purple-700',
  AWAITING_COUNTERPARTY_BRIEF: 'bg-indigo-100 text-indigo-700',
  UNDER_ANALYSIS: 'bg-blue-100 text-blue-700 animate-pulse',
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
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);

  const disputeId = params.id as string;

  const { data: dispute, isLoading, isError, error } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId,
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
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
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
      <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center max-w-5xl mx-auto">
        <p className="text-red-600 font-medium">Failed to load dispute</p>
        <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        <Link href="/dashboard/disputes" className="text-primary hover:underline text-sm mt-3 inline-block">
          Back to disputes
        </Link>
      </div>
    );
  }

  if (!dispute) return null;

  const currentParty = dispute.parties?.find((p: any) => p.userId === user?.id);
  const isInitiator = currentParty?.role === 'INITIATOR';
  const isRespondent = currentParty?.role === 'RESPONDENT';
  const myParty = currentParty;
  const myBriefSubmitted = myParty?.briefStatus === 'SUBMITTED';
  const hasRespondent = dispute.parties?.some((p: any) => p.role === 'RESPONDENT');

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-16">
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

      {/* Action Banners based on state */}
      {isInitiator && dispute.state === 'PAYMENT_PENDING' && (
        <div className="p-6 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-between">
          <div>
            <h3 className="text-orange-900 font-semibold text-lg">Payment Required</h3>
            <p className="text-orange-800 text-sm">You must complete your payment of ${Number(dispute.priceUsd).toFixed(2)} to activate this dispute.</p>
          </div>
          <Link
            href={`/dashboard/disputes/${disputeId}/payment`}
            className="px-6 py-2 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors"
          >
            Pay ${Number(dispute.priceUsd).toFixed(2)}
          </Link>
        </div>
      )}

      {(dispute.state === 'AWAITING_COUNTERPARTY' || dispute.state === 'AWAITING_BRIEFS') && !myBriefSubmitted && (
        <div className="p-6 rounded-lg bg-green-50 border border-green-200 flex items-center justify-between">
          <div>
            <h3 className="text-green-900 font-semibold text-lg">Action Required: Your Brief</h3>
            <p className="text-green-800 text-sm">Please draft and submit your brief. Our AI assistant will help you structure it.</p>
          </div>
          <Link
            href={`/dashboard/disputes/${disputeId}/brief`}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
          >
            Draft Your Brief
          </Link>
        </div>
      )}

      {dispute.state === 'AWAITING_BRIEFS' && !hasRespondent && (
        <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
          <div>
            <h3 className="text-blue-900 font-semibold text-lg">Invite Counterparty</h3>
            <p className="text-blue-800 text-sm">This paid dispute needs a counterparty before the final opinion can be generated. Invite them now or after drafting your brief.</p>
          </div>
          <a
            href="#invite-counterparty"
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Invite Counterparty
          </a>
        </div>
      )}

      {dispute.state === 'UNDER_ANALYSIS' && (
        <div className="p-6 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
          <div>
            <h3 className="text-blue-900 font-semibold text-lg">Analysis in Progress</h3>
            <p className="text-blue-800 text-sm">Multiple AI models are currently reviewing the submitted briefs.</p>
          </div>
          <Link
            href={`/dashboard/disputes/${disputeId}/analysis`}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Track Progress
          </Link>
        </div>
      )}

      {dispute.state === 'COMPLETED' && (
        <div className="p-6 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-between">
          <div>
            <h3 className="text-purple-900 font-semibold text-lg">Opinion Ready</h3>
            <p className="text-purple-800 text-sm">The AI evaluation has concluded and your opinion is ready for review.</p>
          </div>
          <Link
            href={`/dashboard/disputes/${disputeId}/opinion`}
            className="px-6 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Full Opinion
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
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
              <dt className="text-sm text-muted-foreground">Pricing Tier</dt>
              <dd className="text-sm font-medium capitalize">{dispute.pricingTier?.toLowerCase()}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Price</dt>
              <dd className="text-sm font-medium">${Number(dispute.priceUsd).toFixed(2)}</dd>
            </div>
          </dl>
        </div>

        <div className="p-6 border border-border rounded-lg bg-card flex flex-col">
          <h2 className="font-semibold mb-3">Parties</h2>
          {dispute.parties && dispute.parties.length > 0 ? (
            <ul className="space-y-3 flex-1">
              {dispute.parties.map((party: any) => (
                <li key={party.id} className="flex items-center justify-between text-sm p-3 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{party.role.toLowerCase()}</span>
                    {party.role === 'RESPONDENT' && party.invitationStatus && party.invitationStatus !== 'ACCEPTED' && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {party.invitationStatus.replace(/_/g, ' ')}
                        </span>
                        {party.invitationStatus === 'PENDING' && isInitiator && (
                          <button
                            onClick={async () => {
                              try {
                                await apiClient.resendInvitation(disputeId);
                                alert('Invitation resent successfully');
                              } catch (e: any) {
                                alert(e.message || 'Failed to resend');
                              }
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Resend
                          </button>
                        )}
                      </div>
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

          {isInitiator && (dispute.state === 'DRAFT' || dispute.state === 'PAYMENT_PENDING' || dispute.state === 'AWAITING_BRIEFS' || dispute.state === 'AWAITING_COUNTERPARTY' || dispute.state === 'AWAITING_COUNTERPARTY_BRIEF') && !hasRespondent && (
            <div id="invite-counterparty" className="mt-4 pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-2">Invite Counterparty</h3>
              <p className="text-xs text-muted-foreground mb-3">The invitation email is sent after payment is complete. Final analysis requires both parties to submit briefs.</p>
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
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
                <button
                  type="submit"
                  disabled={inviteMutation.isPending || !inviteEmail}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
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

          <div className="flex gap-3 pt-4 border-t border-border">
            {isInitiator && dispute.state !== 'COMPLETED' && dispute.state !== 'WITHDRAWN' && dispute.state !== 'DECLINED' && (
              <button
                onClick={() => setShowWithdrawDialog(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
              >
                Withdraw Dispute
              </button>
            )}
            {isRespondent && !myBriefSubmitted && (dispute.state === 'AWAITING_BRIEFS' || dispute.state === 'AWAITING_COUNTERPARTY_BRIEF') && (
              <Link
                href={`/dashboard/disputes/${disputeId}/brief`}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Start Your Brief
              </Link>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-20 h-fit">
          <DisputeStatusPanel dispute={dispute} currentUserId={user?.id} />
        </div>
      </div>

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

      {/* Timeline Panel */}
      <div className="mt-8 border-t border-border pt-8">
        <h2 className="text-xl font-bold mb-4">Timeline & History</h2>
        <div className="relative border-l-2 border-border ml-3 space-y-6 pb-4">
          
          <div className="relative pl-6">
            <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-background" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">Dispute Created</span>
              <span className="text-xs text-muted-foreground">{new Date(dispute.createdAt).toLocaleString()}</span>
            </div>
          </div>

          {dispute.payments?.filter((p: any) => p.status === 'SUCCEEDED').map((payment: any, i: number) => (
            <div key={`payment-${i}`} className="relative pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-green-500 ring-4 ring-background" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Payment Received (${Number(payment.amountUsd).toFixed(2)})</span>
                <span className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleString()}</span>
              </div>
            </div>
          ))}

          {dispute.parties?.filter((p: any) => p.role === 'RESPONDENT' && p.invitationStatus === 'ACCEPTED').map((party: any, i: number) => (
            <div key={`party-${i}`} className="relative pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-blue-500 ring-4 ring-background" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Counterparty Joined</span>
                {party.invitationAcceptedAt && (
                  <span className="text-xs text-muted-foreground">{new Date(party.invitationAcceptedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}

          {dispute.parties?.filter((p: any) => p.briefStatus === 'SUBMITTED').map((party: any, i: number) => (
            <div key={`brief-${i}`} className="relative pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-purple-500 ring-4 ring-background" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">{party.role === 'INITIATOR' ? 'Your' : "Counterparty's"} Brief Submitted</span>
              </div>
            </div>
          ))}

          {dispute.opinions && dispute.opinions.length > 0 && (
            <div className="relative pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-green-600 ring-4 ring-background" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">Analysis Completed</span>
                <span className="text-xs text-muted-foreground">{new Date(dispute.opinions[0].createdAt).toLocaleString()}</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
