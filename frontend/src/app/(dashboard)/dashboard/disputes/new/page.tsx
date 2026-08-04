'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { apiClient } from '@/lib/api-client';

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PK;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const TIERS = [
  {
    id: 'standard',
    label: 'Standard',
    price: '$99',
    amountCents: 9900,
    description: '5-model evaluation, 4-hour turnaround',
  },
  {
    id: 'expedited',
    label: 'Expedited',
    price: '$199',
    amountCents: 19900,
    description: '5-model evaluation, 1-hour turnaround + priority queue',
  },
  {
    id: 'extended',
    label: 'Extended',
    price: '$299',
    amountCents: 29900,
    description: 'Longer briefs (up to 10K words) + supplemental document analysis',
  },
];

const CATEGORIES = [
  { id: 'contract_interpretation', label: 'Contract Interpretation' },
  { id: 'small_claims_assessment', label: 'Small Claims Assessment' },
  { id: 'partnership_conflict', label: 'Partnership / Co-founder Conflict' },
];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
              i + 1 === current
                ? 'bg-primary text-primary-foreground'
                : i + 1 < current
                ? 'bg-green-500 text-white'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {i + 1 < current ? '✓' : i + 1}
          </div>
          {i < total - 1 && (
            <div className={`h-0.5 w-12 ${i + 1 < current ? 'bg-green-500' : 'bg-muted'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Stripe Payment Form ─── */
function InlinePaymentForm({
  disputeId,
  amount,
  onSuccess,
  onError,
}: {
  disputeId: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
        confirmParams: { return_url: `${window.location.origin}/dashboard/disputes/${disputeId}` },
      redirect: 'if_required',
    });
    if (error) { onError(error.message || 'Payment failed'); setProcessing(false); return; }
    if (paymentIntent?.status === 'succeeded') {
      try {
        await apiClient.confirmPayment(disputeId, paymentIntent.id);
        onSuccess();
      } catch (err: any) { onError(err.message || 'Confirmation failed'); }
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handlePay} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {processing ? 'Processing…' : `Pay $${(amount / 100).toFixed(2)} & Continue`}
      </button>
    </form>
  );
}

/* ─── Main Wizard ─── */
export default function NewDisputePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [category, setCategory] = useState('contract_interpretation');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [stakes, setStakes] = useState('');
  const [tier, setTier] = useState('standard');

  // Step 2 fields
  const [cpEmail, setCpEmail] = useState('');
  const [cpName, setCpName] = useState('');
  const [skipInvite, setSkipInvite] = useState(false);

  // Step 3 (payment)
  const [createdDisputeId, setCreatedDisputeId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [amountCents, setAmountCents] = useState(9900);
  const [payError, setPayError] = useState('');
  const [paid, setPaid] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Create dispute mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createDispute(data),
    onSuccess: async (response: any) => {
      const id = response.dispute?.id || response.id;
      setCreatedDisputeId(id);
      const selectedTier = TIERS.find(t => t.id === tier);
      setAmountCents(response.paymentIntent?.amount || response.amount || selectedTier?.amountCents || 9900);
      // Payment intent comes back with dispute creation
      const secret = response.paymentIntent?.clientSecret || response.payment_intent?.client_secret;
      if (secret) {
        setClientSecret(secret);
      } else {
        // Fetch it separately
        try {
          const pi = await apiClient.createPaymentIntent(id);
          setClientSecret(pi.clientSecret || pi.client_secret || pi.payment_intent?.client_secret || '');
          setAmountCents(pi.amount || 9900);
        } catch {}
      }
      setStep(3);
    },
    onError: (err: any) => {
      setErrors({ submit: err.message || 'Failed to create dispute' });
    },
  });

  function validateStep1() {
    const e: Record<string, string> = {};
    if (title.trim().length < 5) e.title = 'Title must be at least 5 characters';
    if (title.trim().length > 200) e.title = 'Title must not exceed 200 characters';
    if (summary.length > 5000) e.summary = 'Summary must not exceed 5000 characters';
    if (stakes && (isNaN(+stakes) || +stakes <= 0)) e.stakes = 'Must be a positive number';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    if (skipInvite) return true;
    const e: Record<string, string> = {};
    if (!cpEmail.trim()) e.cpEmail = 'Counterparty email is required unless you skip for now';
    else if (!/\S+@\S+\.\S+/.test(cpEmail)) e.cpEmail = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleStep1Next() {
    if (!validateStep1()) return;
    setStep(2);
  }

  function handleStep2Next() {
    if (!validateStep2()) return;
    const payload: any = {
      category,
      title: title.trim(),
      summary: summary.trim() || undefined,
      estimatedStakesUsd: stakes ? parseFloat(stakes) : undefined,
      pricingTier: tier,
    };
    if (!skipInvite && cpEmail) {
      payload.counterparty = { email: cpEmail, display_name_for_invitation: cpName || cpEmail };
    }
    createMutation.mutate(payload);
  }

  const stripeOptions: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: { theme: 'stripe', variables: { colorPrimary: '#6366f1' } },
  };

  /* ─── Step 1 ─── */
  if (step === 1) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <StepIndicator current={1} total={3} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Dispute</h1>
        <p className="text-muted-foreground mt-1">Tell us about your dispute and choose your analysis tier.</p>
      </div>

      <div className="space-y-5">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title <span className="text-muted-foreground">(5–200 chars)</span></label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
            className={`w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none ${errors.title ? 'border-red-500' : 'border-border'}`}
            placeholder="e.g., Dispute over consulting agreement scope" />
          <div className="flex justify-between mt-1">
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            <p className="text-xs text-muted-foreground ml-auto">{title.length}/200</p>
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium mb-1">Summary <span className="text-muted-foreground">(optional)</span></label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} maxLength={5000} rows={3}
            className={`w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none resize-y ${errors.summary ? 'border-red-500' : 'border-border'}`}
            placeholder="Briefly describe what the dispute is about…" />
        </div>

        {/* Stakes */}
        <div>
          <label className="block text-sm font-medium mb-1">Estimated Stakes <span className="text-muted-foreground">(optional, USD)</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input type="number" value={stakes} onChange={e => setStakes(e.target.value)} min={0} step="0.01"
              className={`w-full pl-8 pr-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none ${errors.stakes ? 'border-red-500' : 'border-border'}`}
              placeholder="e.g., 5000" />
          </div>
          {errors.stakes && <p className="text-xs text-red-500 mt-1">{errors.stakes}</p>}
        </div>

        {/* Tier */}
        <div>
          <label className="block text-sm font-medium mb-2">Analysis Tier</label>
          <div className="grid gap-3">
            {TIERS.map(t => (
              <label key={t.id}
                className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${tier === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                <input type="radio" name="tier" value={t.id} checked={tier === t.id} onChange={() => setTier(t.id)} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{t.label}</span>
                    <span className="text-lg font-bold text-primary">{t.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handleStep1Next}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
          Next: Invite Counterparty →
        </button>
      </div>
    </div>
  );

  /* ─── Step 2 ─── */
  if (step === 2) return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <StepIndicator current={2} total={3} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invite Counterparty</h1>
        <p className="text-muted-foreground mt-1">Who are you in dispute with? They&apos;ll receive an invitation after payment is completed.</p>
      </div>

      <div className="space-y-5">
        {!skipInvite && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Counterparty Email <span className="text-red-500">*</span></label>
              <input type="email" value={cpEmail} onChange={e => setCpEmail(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none ${errors.cpEmail ? 'border-red-500' : 'border-border'}`}
                placeholder="counterparty@example.com" />
              {errors.cpEmail && <p className="text-xs text-red-500 mt-1">{errors.cpEmail}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Counterparty Name <span className="text-muted-foreground">(optional)</span></label>
              <input type="text" value={cpName} onChange={e => setCpName(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none"
                placeholder="John Smith" />
            </div>
          </>
        )}

        <label className="flex items-center gap-3 cursor-pointer p-4 border border-border rounded-lg hover:bg-muted/30">
          <input type="checkbox" checked={skipInvite} onChange={e => { setSkipInvite(e.target.checked); setErrors({}); }} className="w-4 h-4" />
          <div>
            <p className="text-sm font-medium">Skip for now</p>
            <p className="text-xs text-muted-foreground">You can invite them after payment from your dispute page. No opinion is generated until both briefs are submitted.</p>
          </div>
        </label>

        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{errors.submit}</div>
        )}

        <div className="flex gap-3">
          <button onClick={() => setStep(1)}
            className="px-6 py-3 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 transition-colors">
            ← Back
          </button>
          <button onClick={handleStep2Next} disabled={createMutation.isPending}
            className="flex-1 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? 'Creating…' : skipInvite ? 'Skip Invite & Continue to Payment →' : 'Continue to Payment →'}
          </button>
        </div>
      </div>
    </div>
  );

  /* ─── Step 3: Payment ─── */
  if (paid) return (
    <div className="max-w-lg mx-auto mt-16 text-center space-y-4 animate-fade-in">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold">Payment Successful!</h1>
      <p className="text-muted-foreground">Your dispute has been created. You can now start preparing your brief.</p>
      <button onClick={() => router.push(`/dashboard/disputes/${createdDisputeId}`)}
        className="px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
        Go to Dispute →
      </button>
    </div>
  );

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <StepIndicator current={3} total={3} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Complete Payment</h1>
        <p className="text-muted-foreground mt-1">Your dispute is saved. Pay to activate the dispute workflow.</p>
      </div>

      {/* Summary card */}
      <div className="p-4 bg-muted/30 border border-border rounded-lg space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Dispute</span>
          <span className="font-medium truncate max-w-[260px]">{title}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tier</span>
          <span className="font-medium capitalize">{tier}</span>
        </div>
        {!skipInvite && cpEmail && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Counterparty</span>
            <span className="font-medium">{cpEmail}</span>
          </div>
        )}
        {skipInvite && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Counterparty</span>
            <span className="font-medium">Invite after payment</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
          <span>Total</span>
          <span className="text-primary">${(amountCents / 100).toFixed(2)}</span>
        </div>
      </div>

      <div className="p-6 bg-card border border-border rounded-lg">
        {!stripePublishableKey ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            Payment provider is not configured. Add NEXT_PUBLIC_STRIPE_PK to the frontend environment.
          </div>
        ) : clientSecret ? (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <InlinePaymentForm
              disputeId={createdDisputeId}
              amount={amountCents}
              onSuccess={() => setPaid(true)}
              onError={msg => setPayError(msg)}
            />
          </Elements>
        ) : (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Loading payment form…</span>
          </div>
        )}
        {payError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{payError}</div>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Payments are processed securely via Stripe. By paying, you agree to our Terms of Service.<br />
        <strong>This is a decision-support tool, not legal advice. Analysis begins only after both briefs are submitted.</strong>
      </p>
    </div>
  );
}
