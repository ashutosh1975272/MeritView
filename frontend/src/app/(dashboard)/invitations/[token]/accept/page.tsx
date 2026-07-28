'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [disputeId, setDisputeId] = useState('');

  useEffect(() => {
    if (!token) return;

    apiClient.acceptInvitation(token)
      .then((res) => {
        setStatus('success');
        setDisputeId(res.disputeId);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Failed to accept invitation');
      });
  }, [token]);

  return (
    <div className="max-w-md mx-auto mt-12 p-6 bg-card border border-border rounded-lg shadow-sm text-center">
      <h1 className="text-2xl font-bold mb-4">Dispute Invitation</h1>
      
      {status === 'loading' && (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Processing your invitation...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl">
            ✓
          </div>
          <p className="text-foreground font-medium">Invitation accepted successfully!</p>
          <p className="text-sm text-muted-foreground">You are now a party to this dispute.</p>
          <button
            onClick={() => router.push(`/dashboard/disputes/${disputeId}`)}
            className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            View Dispute Details
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl">
            !
          </div>
          <p className="text-red-600 font-medium">Invitation Error</p>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <button
            onClick={() => router.push('/dashboard/disputes')}
            className="w-full mt-4 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted/50 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
