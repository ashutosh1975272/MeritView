'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, ArrowLeft, Sparkles } from 'lucide-react';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PK;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const isDemoMode = !stripePublishableKey || stripePublishableKey.includes('demo') || stripePublishableKey.includes('placeholder');

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
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${(amount / 100).toFixed(2)} & Continue`}
      </Button>
    </form>
  );
}

function DemoPaymentForm({ disputeId, amount, onSuccess, onError }: {
  disputeId: string;
  amount: number;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDemoPay = async () => {
    setIsProcessing(true);
    try {
      const result = await apiClient.createPaymentIntent(disputeId);
      const paymentIntentId = result.paymentIntentId || `pi_mock_${Date.now()}`;
      await apiClient.confirmPayment(disputeId, paymentIntentId);
      onSuccess();
    } catch (err: any) {
      onError(err.message || 'Demo payment failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg">
        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Demo Mode Active</p>
          <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
            Click below to simulate a successful payment and activate your dispute.
          </p>
        </div>
      </div>
      <Button
        type="button"
        onClick={handleDemoPay}
        disabled={isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing Demo Payment...' : `Pay $${(amount / 100).toFixed(2)} (Demo)`}
      </Button>
    </div>
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
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground mb-6">Your dispute workflow is active. Analysis will begin after both briefs are submitted.</p>
        <div className="animate-pulse space-y-2">
          <div className="h-2 bg-muted rounded w-3/4 mx-auto" />
          <div className="h-2 bg-muted rounded w-1/2 mx-auto" />
        </div>
        <p className="text-sm text-muted-foreground mt-4">Redirecting to dispute page...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6 animate-fade-in">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret: clientSecret ?? undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
      },
    },
  };

  return (
    <div className="max-w-lg mx-auto mt-12 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <Link
          href={`/dashboard/disputes/${disputeId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dispute
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold">Complete Payment</h1>
          {isDemoMode && (
            <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-900/20">
              <Sparkles className="h-3 w-3 mr-1" />
              Demo
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Pay ${(amount / 100).toFixed(2)} to activate your dispute workflow
        </p>
      </div>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Summary</CardTitle>
          <CardDescription>Dispute workflow activation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dispute ID</span>
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{disputeId}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium">AI-Powered Dispute Analysis</span>
          </div>
          <div className="flex items-center justify-between text-base font-bold pt-3 border-t">
            <span>Total</span>
            <span className="text-primary">${(amount / 100).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Details</CardTitle>
          <CardDescription>Secure payment powered by Stripe</CardDescription>
        </CardHeader>
        <CardContent>
          {isDemoMode ? (
            <DemoPaymentForm
              disputeId={disputeId}
              amount={amount}
              onSuccess={handleSuccess}
              onError={handleError}
            />
          ) : !stripePublishableKey ? (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-sm text-red-600 dark:text-red-400">
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
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">Failed to load payment form</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">Payment Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRetryCount((c) => c + 1)}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          Your payment is processed securely via Stripe.
          <br />
          By completing this payment, you agree to our Terms of Service. This is decision support, not legal advice.
        </p>
      </div>
    </div>
  );
}
