'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface FormErrors {
  category?: string;
  title?: string;
  summary?: string;
  estimatedStakesUsd?: string;
}

export default function NewDisputePage() {
  const router = useRouter();
  const [category, setCategory] = useState('contract_interpretation');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [stakes, setStakes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const mutation = useMutation({
    mutationFn: (data: {
      category: string;
      title: string;
      summary?: string;
      estimatedStakesUsd?: number;
    }) => apiClient.createDispute(data),
    onMutate: () => {
      console.log('Mutation started: Creating dispute...');
    },
    onSuccess: (response) => {
      console.log('Dispute created successfully! Redirecting to:', `/dashboard/disputes/${response.dispute.id}`);
      router.push(`/dashboard/disputes/${response.dispute.id}`);
    },
    onError: (error) => {
      console.error('Failed to create dispute. Mutation onError caught:', error);
    },
  });

  function validate(): boolean {
    const newErrors: FormErrors = {};

    if (title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    if (summary.length > 5000) {
      newErrors.summary = 'Summary must not exceed 5000 characters';
    }

    if (stakes) {
      const num = parseFloat(stakes);
      if (isNaN(num) || num <= 0) {
        newErrors.estimatedStakesUsd = 'Estimated stakes must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    console.log('Form submitted. Validating...');
    if (!validate()) {
      console.log('Validation failed:', errors);
      return;
    }

    const payload = {
      category,
      title: title.trim(),
      summary: summary.trim() || undefined,
      estimatedStakesUsd: stakes ? parseFloat(stakes) : undefined,
    };
    
    console.log('Validation passed. Sending payload to mutate:', payload);
    mutation.mutate(payload);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Dispute</h1>
        <p className="text-muted-foreground mt-1">
          Start a new contract interpretation analysis. <strong>$49.00 flat fee.</strong>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="contract_interpretation">Contract Interpretation</option>
          </select>
        </div>

        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-1">
            Title <span className="text-muted-foreground">(5-200 characters)</span>
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className={`w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
              errors.title ? 'border-red-500' : 'border-border'
            }`}
            placeholder="e.g., Dispute over service delivery timeline"
          />
          <div className="flex justify-between mt-1">
            {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
            <p className="text-xs text-muted-foreground ml-auto">{title.length}/200</p>
          </div>
        </div>

        <div>
          <label htmlFor="summary" className="block text-sm font-medium mb-1">
            Summary <span className="text-muted-foreground">(optional, max 5000 characters)</span>
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={5000}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-vertical ${
              errors.summary ? 'border-red-500' : 'border-border'
            }`}
            placeholder="Briefly describe the nature of your dispute..."
          />
          <div className="flex justify-between mt-1">
            {errors.summary && <p className="text-xs text-red-500">{errors.summary}</p>}
            <p className="text-xs text-muted-foreground ml-auto">{summary.length}/5000</p>
          </div>
        </div>

        <div>
          <label htmlFor="stakes" className="block text-sm font-medium mb-1">
            Estimated Stakes <span className="text-muted-foreground">(optional, USD)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <input
              id="stakes"
              type="number"
              value={stakes}
              onChange={(e) => setStakes(e.target.value)}
              min={0}
              step="0.01"
              className={`w-full pl-8 pr-3 py-2 border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.estimatedStakesUsd ? 'border-red-500' : 'border-border'
              }`}
              placeholder="e.g., 5000.00"
            />
          </div>
          {errors.estimatedStakesUsd && (
            <p className="text-xs text-red-500 mt-1">{errors.estimatedStakesUsd}</p>
          )}
        </div>

        {mutation.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {(mutation.error as any)?.message || 'Failed to create dispute. Please try again.'}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-6 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Creating...' : 'Create Dispute'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/disputes')}
            className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
