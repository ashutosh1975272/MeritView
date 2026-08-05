'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function BriefAssistRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  useEffect(() => {
    if (disputeId) {
      router.replace(`/dashboard/disputes/${disputeId}/brief`);
    }
  }, [disputeId, router]);

  return null;
}
