'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api-client';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PK;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

function PaymentForm({ disputeId, amount, onSuccess, onError }: {
  disputeId: string;
  amount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/disputes/${disputeId}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      onError(error.message || 'Payment failed');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        await apiClient.confirmPayment(disputeId, paymentIntent.id);
        onSuccess();
      } catch (err: any) {
        onError(err.message || 'Failed to confirm payment');
      }
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full px-6 py-3 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${(amount / 100).toFixed(2)} & Continue`}
      </button>
    </form>
  );
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(9900);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchPaymentIntent = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.createPaymentIntent(disputeId);
      setClientSecret(result.clientSecret || result.client_secret || result.payment_intent?.client_secret || null);
      setAmount(result.amount ?? 9900);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentIntent();
  }, [disputeId, retryCount]);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push(`/dashboard/disputes/${disputeId}`);
    }, 2000);
  };

  const handleError = (message: string) => {
    setError(message);
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-12 p-8 text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">Your dispute workflow is active. Analysis will begin after both briefs are submitted.</p>
        <div className="animate-pulse">
          <div className="h-2 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
          <div className="h-2 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">Redirecting to dispute page...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto mt-12 animate-fade-in">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-48 bg-gray-200 rounded" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
      },
    },
  };

  return (
    <div className="max-w-lg mx-auto mt-12 animate-fade-in">
      <div className="mb-8">
        <Link
          href={`/dashboard/disputes/${disputeId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back to dispute
        </Link>
        <h1 className="text-2xl font-bold mt-4">Complete Payment</h1>
        <p className="text-muted-foreground mt-1">
          Pay ${(amount / 100).toFixed(2)} to activate your dispute workflow
        </p>
      </div>

      <div className="bg-white border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <span className="font-medium">Dispute Workflow</span>
          <span className="text-xl font-bold">${(amount / 100).toFixed(2)}</span>
        </div>

        {!stripePublishableKey ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            Payment provider is not configured. Add NEXT_PUBLIC_STRIPE_PK to the frontend environment.
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              disputeId={disputeId}
              amount={amount}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          </Elements>
        ) : (
          <div className="text-center py-4">
            <p className="text-red-600">Failed to load payment form</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm font-medium">Payment Error</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="mt-3 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-muted-foreground">
          Your payment is processed securely via Stripe.
          <br />
          By completing this payment, you agree to our Terms of Service. This is decision support, not legal advice.
        </p>
      </div>
    </div>
  );
}
