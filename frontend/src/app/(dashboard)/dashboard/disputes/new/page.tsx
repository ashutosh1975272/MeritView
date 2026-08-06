'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/components/toast-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';

const TIERS = [
  {
    id: 'standard',
    label: 'Standard',
    price: '$99',
    amountCents: 9900,
    description: '5-model evaluation, 4-hour turnaround',
    features: ['5 AI models', '4-hour turnaround', 'Standard support', 'PDF report'],
  },
  {
    id: 'expedited',
    label: 'Expedited',
    price: '$199',
    amountCents: 19900,
    description: '5-model evaluation, 1-hour turnaround + priority queue',
    features: ['5 AI models', '1-hour turnaround', 'Priority support', 'PDF report'],
  },
  {
    id: 'extended',
    label: 'Extended',
    price: '$299',
    amountCents: 29900,
    description: 'Longer briefs (up to 10K words) + supplemental document analysis',
    features: ['10K word briefs', 'Document analysis', 'Extended support', 'PDF report'],
  },
];

const CATEGORIES = [
  { id: 'contract_interpretation', label: 'Contract Interpretation', icon: '📄' },
  { id: 'small_claims_assessment', label: 'Small Claims Assessment', icon: '💰' },
  { id: 'partnership_conflict', label: 'Partnership / Co-founder Conflict', icon: '🤝' },
];

export default function NewDisputePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [category, setCategory] = useState('contract_interpretation');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [stakes, setStakes] = useState('');
  const [tier, setTier] = useState('standard');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createDispute(data),
    onSuccess: async (response: any) => {
      const id = response.dispute?.id || response.id;
      showToast('Dispute created', 'success');
      router.push(`/dashboard/disputes/${id}/draft`);
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to create dispute', 'error');
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

  function handleSubmit() {
    if (!validateStep1()) return;
    const payload: any = {
      category,
      title: title.trim(),
      summary: summary.trim() || undefined,
      estimatedStakesUsd: stakes ? parseFloat(stakes) : undefined,
      pricingTier: tier,
    };
    createMutation.mutate(payload);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/disputes')} className="gap-1">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Dispute</h1>
        <p className="text-muted-foreground mt-1">Tell us about your dispute and choose your analysis tier.</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-5">
          {/* Category */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Category</legend>
            <div className="grid gap-3">
              {CATEGORIES.map(c => (
                <label
                  key={c.id}
                  className={cn(
                    'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    category === c.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="radio"
                    name="category"
                    value={c.id}
                    checked={category === c.id}
                    onChange={() => setCategory(c.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{c.label}</span>
                  </div>
                  <span className="text-2xl">{c.icon}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g., Dispute over consulting agreement scope"
              aria-invalid={errors.title ? 'true' : 'false'}
            />
            <div className="flex justify-between">
              {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              <p className="text-xs text-muted-foreground ml-auto">{title.length}/200</p>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <Label htmlFor="summary">Summary <span className="text-muted-foreground">(optional)</span></Label>
            <textarea
              id="summary"
              value={summary}
              onChange={e => setSummary(e.target.value)}
              maxLength={5000}
              rows={3}
              className={cn(
                'w-full px-3 py-2 border rounded-md bg-background text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none resize-y',
                errors.summary ? 'border-destructive' : 'border-input'
              )}
              placeholder="Briefly describe what the dispute is about…"
            />
            {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
          </div>

          {/* Stakes */}
          <div className="space-y-2">
            <Label htmlFor="stakes">Estimated Stakes <span className="text-muted-foreground">(optional, USD)</span></Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="stakes"
                type="number"
                value={stakes}
                onChange={e => setStakes(e.target.value)}
                min={0}
                step="0.01"
                className={cn('pl-8', errors.stakes ? 'border-destructive' : 'border-input')}
                placeholder="e.g., 5000"
              />
            </div>
            {errors.stakes && <p className="text-sm text-destructive">{errors.stakes}</p>}
          </div>

          {/* Tier */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Analysis Tier</legend>
            <div className="grid gap-3">
              {TIERS.map(t => (
                <label
                  key={t.id}
                  className={cn(
                    'flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                    tier === t.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  )}
                >
                  <input
                    type="radio"
                    name="tier"
                    value={t.id}
                    checked={tier === t.id}
                    onChange={() => setTier(t.id)}
                    className="mt-1"
                  />
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
          </fieldset>

          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="w-full">
            {createMutation.isPending ? 'Creating...' : 'Create Dispute →'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
