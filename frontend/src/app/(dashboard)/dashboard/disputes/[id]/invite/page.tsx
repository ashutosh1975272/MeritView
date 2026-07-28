'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { data: dispute, isLoading: disputeLoading } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId,
  });

  const { data: invitation } = useQuery({
    queryKey: ['invitation', disputeId],
    queryFn: () => apiClient.get('/disputes/' + disputeId + '/invitation'),
    enabled: !!disputeId,
  });

  const handleSendInvite = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }

    setIsSending(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await apiClient.post(`/disputes/${disputeId}/invite`, { email });
      setSuccess(`Invitation sent to ${email}`);
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  if (disputeLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const inviteStatus = invitation?.status || 'NOT_SENT';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => router.back()} className="hover:text-foreground transition-colors">
          Back
        </button>
        <span>/</span>
        <span className="text-foreground">Invite Counterparty</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Counterparty</h1>
        <p className="text-muted-foreground mt-1">
          Send an invitation to the other party to join this dispute.
        </p>
      </div>

      {inviteStatus !== 'NOT_SENT' && (
        <div className={`p-4 rounded-lg border ${
          inviteStatus === 'ACCEPTED' ? 'bg-green-50 border-green-200 text-green-800' :
          inviteStatus === 'DECLINED' ? 'bg-red-50 border-red-200 text-red-800' :
          inviteStatus === 'EXPIRED' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <p className="font-medium">
            Invitation {inviteStatus.toLowerCase().replace(/_/g, ' ')}
          </p>
          {invitation?.email && (
            <p className="text-sm mt-1">Sent to: {invitation.email}</p>
          )}
          {inviteStatus === 'ACCEPTED' && (
            <button
              onClick={() => router.push(`/dashboard/disputes/${disputeId}/brief`)}
              className="mt-2 text-sm font-medium underline"
            >
              Go to brief preparation
            </button>
          )}
        </div>
      )}

      {inviteStatus === 'NOT_SENT' && dispute?.state === 'DRAFT' && (
        <div className="p-6 border border-border rounded-lg bg-card space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Counterparty Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              disabled={isSending}
            />
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              {success}
            </div>
          )}

          <button
            onClick={handleSendInvite}
            disabled={isSending || !email.trim()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending Invitation...' : 'Send Invitation'}
          </button>

          <p className="text-xs text-muted-foreground">
            Invitation will expire after 7 days. The counterparty will receive an email with a link to
            accept or decline.
          </p>
        </div>
      )}

      {dispute?.state !== 'DRAFT' && inviteStatus === 'NOT_SENT' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="font-medium">Dispute is not in draft state</p>
          <p className="text-sm mt-1">Invitations can only be sent when the dispute is in DRAFT state.</p>
        </div>
      )}
    </div>
  );
}
