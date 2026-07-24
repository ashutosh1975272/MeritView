'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const disputeSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title must be 200 characters or less'),
  summary: z.string().max(500, 'Summary must be 500 characters or less').optional(),
  estimatedStakesUsd: z.coerce.number().positive('Stakes must be a positive number').optional(),
  category: z.enum(['contract_interpretation']),
});

type DisputeFormData = z.infer<typeof disputeSchema>;

export default function NewDisputePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, getValues } = useForm<DisputeFormData>({
    resolver: zodResolver(disputeSchema) as any,
    defaultValues: { category: 'contract_interpretation', title: '', summary: '' },
  });

  const titleLength = (watch('title') || '').length;
  const summaryLength = (watch('summary') || '').length;

  const createMutation = useMutation({
    mutationFn: (data: DisputeFormData) =>
      apiRequest<{ id: string }>('/v1/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          summary: data.summary || undefined,
          estimatedStakesUsd: data.estimatedStakesUsd || undefined,
          category: data.category,
        }),
      }),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['disputes'] });
      const previous = queryClient.getQueryData(['disputes']);
      const optimistic = {
        id: 'optimistic-' + Date.now(),
        title: data.title,
        summary: data.summary || null,
        category: data.category,
        state: 'DRAFT',
        priceUsd: 49,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(['disputes'], (old: any[] | undefined) => {
        return old ? [optimistic, ...old] : [optimistic];
      });
      return { previous };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
      router.push(`/disputes/${result.id}`);
    },
    onError: (err: any, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['disputes'], context.previous);
      }
      setApiError(err.message || 'Failed to create dispute');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['disputes'] });
    },
  });

  const onSubmit = (data: DisputeFormData) => {
    setApiError(null);
    createMutation.mutate(data);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      const form = e.currentTarget as HTMLFormElement;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
      if (!submitBtn?.disabled) {
        handleSubmit(onSubmit)();
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6" id="new-dispute-heading">Create New Dispute</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6" aria-labelledby="new-dispute-heading" role="form" noValidate>
          <div>
            <Input
              label="Title"
              placeholder="e.g., Dispute over service contract breach"
              error={errors.title?.message}
              aria-required="true"
              {...register('title')}
            />
            <p className="text-xs text-gray-400 mt-1 text-right" aria-live="polite">{titleLength}/200</p>
          </div>

          <div>
            <label htmlFor="summary" className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              id="summary"
              className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.summary ? 'border-red-500' : 'border-gray-300'}`}
              rows={4}
              placeholder="Briefly describe your dispute"
              aria-required="false"
              aria-describedby={errors.summary ? 'summary-error' : 'summary-counter'}
              {...register('summary')}
            />
            {errors.summary && <p id="summary-error" className="text-red-500 text-xs mt-1" role="alert">{errors.summary.message}</p>}
            <p id="summary-counter" className="text-xs text-gray-400 mt-1 text-right" aria-live="polite">{summaryLength}/500</p>
          </div>

          <Input
            label="Estimated Stakes (USD, optional)"
            type="number"
            placeholder="e.g., 5000"
            error={errors.estimatedStakesUsd?.message}
            aria-required="false"
            {...register('estimatedStakesUsd')}
          />

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="category"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              aria-required="true"
              {...register('category')}
            >
              <option value="contract_interpretation">Contract Interpretation</option>
            </select>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm" role="alert" aria-live="assertive">
              {apiError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={createMutation.isPending} disabled={createMutation.isPending} aria-busy={createMutation.isPending}>
              Create Dispute
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
