'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function LegacyInvitationDeclinePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  useEffect(() => {
    if (token) {
      router.replace(`/invitations/${token}`);
    }
  }, [router, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl shadow-lg text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
        <p className="text-muted-foreground mt-4">Opening invitation...</p>
      </div>
    </div>
  );
}
