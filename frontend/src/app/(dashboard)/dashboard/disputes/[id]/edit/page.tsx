'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export default function EditDisputePage() {
  const router = useRouter();
  const params = useParams();
  const disputeId = params.id as string;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [stakes, setStakes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: dispute, isLoading, isError } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId,
  });

  useEffect(() => {
    if (dispute) {
      if (dispute.state !== 'DRAFT') {
        router.push(`/dashboard/disputes/${disputeId}`);
        return;
      }
      setTitle(dispute.title || '');
      setSummary(dispute.summary || '');
      setStakes(dispute.estimatedStakesUsd ? String(dispute.estimatedStakesUsd) : '');
    }
  }, [dispute, disputeId, router]);

  const mutation = useMutation({
    mutationFn: (data: {
      title?: string;
      summary?: string;
      estimatedStakesUsd?: number;
    }) => apiClient.updateDispute(disputeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      router.push(`/dashboard/disputes/${disputeId}`);
    },
    onError: (error: any) => {
      if (error.code === 'VALIDATION_FAILED' && error.details) {
        const newErrors: Record<string, string> = {};
        error.details.forEach((err: any) => {
          if (err.path && err.path[0]) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: error.message || 'An unexpected error occurred' });
      }
    }
  });

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Title is required';
    if (title.length < 5) newErrors.title = 'Title must be at least 5 characters';
    if (title.length > 200) newErrors.title = 'Title must be less than 200 characters';
    if (summary.length > 5000) newErrors.summary = 'Summary must be less than 5000 characters';
    if (stakes && isNaN(Number(stakes))) newErrors.estimatedStakesUsd = 'Must be a valid number';
    if (stakes && Number(stakes) < 0) newErrors.estimatedStakesUsd = 'Must be a positive number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    mutation.mutate({
      title: title.trim(),
      summary: summary.trim() || undefined,
      estimatedStakesUsd: stakes ? parseFloat(stakes) : undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-64 bg-gray-200 rounded w-full" />
      </div>
    );
  }

  if (isError || !dispute) {
    return (
      <div className="max-w-2xl mx-auto p-6 border border-red-200 bg-red-50 rounded-lg text-center">
        <p className="text-red-600 font-medium">Failed to load dispute</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Dispute</h1>
        <p className="text-muted-foreground mt-1">
          Update the details of your draft dispute.
        </p>
      </div>

      {errors.general && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="category" className="block text-sm font-medium mb-1">
            Category
          </label>
          <input
            id="category"
            type="text"
            value={dispute.category?.replace(/_/g, ' ')}
            disabled
            className="w-full px-3 py-2 border border-border rounded-md bg-gray-50 text-sm text-gray-500 cursor-not-allowed capitalize"
          />
          <p className="text-xs text-muted-foreground mt-1">Category cannot be changed after creation.</p>
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

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => router.push(`/dashboard/disputes/${disputeId}`)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground border border-border rounded-md hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
