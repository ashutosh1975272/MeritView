'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

const PRICE = 49.00;

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret?: string;
}

interface PaymentConfirmResponse {
  success: boolean;
  message: string;
}

interface DisputeDetail {
  id: string;
  title?: string;
  description?: string;
}

interface PaymentFormState {
  cardNumber: string;
  expiry: string;
  cvc: string;
}

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length > 2) {
    return digits.slice(0, 2) + '/' + digits.slice(2);
  }
  return digits;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [form, setForm] = useState<PaymentFormState>({
    cardNumber: '',
    expiry: '',
    cvc: '',
  });
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const disputeQuery = useQuery<DisputeDetail>({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.get<DisputeDetail>(`/disputes/${disputeId}`),
    enabled: !!disputeId,
  });

  const paymentIntentQuery = useQuery<PaymentIntent>({
    queryKey: ['payment-intent', disputeId],
    queryFn: () => apiClient.get<PaymentIntent>(`/disputes/${disputeId}/payment-intent`),
    enabled: !!disputeId,
  });

  const confirmPaymentMutation = useMutation<PaymentConfirmResponse, Error>({
    mutationFn: () =>
      apiClient.post<PaymentConfirmResponse>(`/disputes/${disputeId}/payment/confirm`, {
        payment_method: {
          card_number: form.cardNumber.replace(/\s/g, ''),
          expiry: form.expiry,
          cvc: form.cvc,
        },
      }),
    onSuccess: () => {
      setPaymentSuccess(true);
      setTimeout(() => {
        router.push(`/disputes/${disputeId}/analysis`);
      }, 2000);
    },
    onError: (err) => {
      setPaymentError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);
    confirmPaymentMutation.mutate();
  };

  const handleCardNumberChange = (value: string) => {
    setForm((prev) => ({ ...prev, cardNumber: formatCardNumber(value) }));
  };

  const handleExpiryChange = (value: string) => {
    setForm((prev) => ({ ...prev, expiry: formatExpiry(value) }));
  };

  const handleCvcChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setForm((prev) => ({ ...prev, cvc: digits }));
  };

  const isLoading = disputeQuery.isLoading || paymentIntentQuery.isLoading;
  const isError = disputeQuery.isError || paymentIntentQuery.isError;

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto space-y-4 animate-fade-in">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 w-full bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-red-600 mb-4">Failed to load payment details.</p>
        <Button variant="outline" onClick={() => { disputeQuery.refetch(); paymentIntentQuery.refetch(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 animate-fade-in">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <p className="text-green-800 text-xl font-semibold mb-2">Payment successful!</p>
          <p className="text-green-700">Redirecting to analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Payment</h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete payment to start the analysis.
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-slate-50">
        <h2 className="font-semibold text-sm text-slate-700 mb-1">Dispute</h2>
        <p className="text-slate-900">{disputeQuery.data?.title || `Dispute #${disputeId.slice(0, 8)}`}</p>
      </div>

      <div className="border rounded-lg p-4 bg-indigo-50 border-indigo-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-800">Analysis Fee</span>
          <span className="text-2xl font-bold text-indigo-900">${PRICE.toFixed(2)} USD</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="card-number" className="block text-sm font-medium text-slate-700 mb-1">
            Card Number
          </label>
          <input
            id="card-number"
            type="text"
            inputMode="numeric"
            placeholder="4242 4242 4242 4242"
            value={form.cardNumber}
            onChange={(e) => handleCardNumberChange(e.target.value)}
            disabled={confirmPaymentMutation.isPending}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="card-expiry" className="block text-sm font-medium text-slate-700 mb-1">
              Expiry
            </label>
            <input
              id="card-expiry"
              type="text"
              inputMode="numeric"
              placeholder="MM/YY"
              value={form.expiry}
              onChange={(e) => handleExpiryChange(e.target.value)}
              disabled={confirmPaymentMutation.isPending}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label htmlFor="card-cvc" className="block text-sm font-medium text-slate-700 mb-1">
              CVC
            </label>
            <input
              id="card-cvc"
              type="text"
              inputMode="numeric"
              placeholder="123"
              value={form.cvc}
              onChange={(e) => handleCvcChange(e.target.value)}
              disabled={confirmPaymentMutation.isPending}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
            />
          </div>
        </div>

        {paymentError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            {paymentError}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={confirmPaymentMutation.isPending}
          disabled={!form.cardNumber || !form.expiry || !form.cvc}
        >
          Pay ${PRICE.toFixed(2)}
        </Button>
      </form>

      <p className="text-xs text-slate-400 text-center">
        This is a simulated payment for development purposes.
      </p>
    </div>
  );
}
