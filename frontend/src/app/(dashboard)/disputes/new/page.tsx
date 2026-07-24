'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<DisputeFormData>({
    resolver: zodResolver(disputeSchema) as any,
    defaultValues: { category: 'contract_interpretation', title: '', summary: '' },
  });

  const titleLength = (watch('title') || '').length;
  const summaryLength = (watch('summary') || '').length;

  const onSubmit = async (data: DisputeFormData) => {
    setIsSubmitting(true);
    setApiError(null);
    try {
      const dispute = await apiRequest<{ id: string }>('/v1/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          summary: data.summary || undefined,
          estimatedStakesUsd: data.estimatedStakesUsd || undefined,
          category: data.category,
        }),
      });
      router.push(`/disputes/${dispute.id}`);
    } catch (err: any) {
      setApiError(err.message || 'Failed to create dispute');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Dispute</h1>
      <Card className="p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Input
              label="Title"
              placeholder="e.g., Dispute over service contract breach"
              error={errors.title?.message}
              {...register('title')}
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{titleLength}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              className={`w-full border rounded-lg px-3 py-2 text-sm ${errors.summary ? 'border-red-500' : 'border-gray-300'}`}
              rows={4}
              placeholder="Briefly describe your dispute"
              {...register('summary')}
            />
            {errors.summary && <p className="text-red-500 text-xs mt-1">{errors.summary.message}</p>}
            <p className="text-xs text-gray-400 mt-1 text-right">{summaryLength}/500</p>
          </div>

          <Input
            label="Estimated Stakes (USD, optional)"
            type="number"
            placeholder="e.g., 5000"
            error={errors.estimatedStakesUsd?.message}
            {...register('estimatedStakesUsd')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              {...register('category')}
            >
              <option value="contract_interpretation">Contract Interpretation</option>
            </select>
          </div>

          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {apiError}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting}>
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
