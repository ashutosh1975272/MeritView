'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

interface EvaluatorProgress {
  provider_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface EvaluationStatus {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  progress: EvaluatorProgress[];
  error_message?: string;
}

function statusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return '✅';
    case 'running':
      return '🔄';
    case 'failed':
      return '❌';
    default:
      return '⏳';
  }
}

function statusClass(status: string): string {
  switch (status) {
    case 'completed':
      return 'text-green-700 bg-green-50';
    case 'running':
      return 'text-blue-700 bg-blue-50';
    case 'failed':
      return 'text-red-700 bg-red-50';
    default:
      return 'text-slate-700 bg-slate-50';
  }
}

export default function AnalysisPage() {
  const params = useParams();
  const disputeId = params.id as string;

  const evaluationQuery = useQuery<EvaluationStatus>({
    queryKey: ['evaluation-status', disputeId],
    queryFn: () => apiClient.get<EvaluationStatus>(`/disputes/${disputeId}/evaluation/status`),
    enabled: !!disputeId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5000;
      if (data.status === 'COMPLETED' || data.status === 'FAILED') return false;
      return 5000;
    },
  });

  const isLoading = evaluationQuery.isLoading;
  const isError = evaluationQuery.isError;
  const data = evaluationQuery.data;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
        <div className="h-32 w-full bg-slate-200 rounded animate-pulse" />
        <div className="h-32 w-full bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-red-600 mb-4">
          {evaluationQuery.error instanceof Error ? evaluationQuery.error.message : 'Failed to load evaluation status.'}
        </p>
        <Button variant="outline" onClick={() => evaluationQuery.refetch()}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-slate-500">No evaluation data found.</p>
      </div>
    );
  }

  if (data.status === 'COMPLETED') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-6 animate-fade-in">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <p className="text-green-800 text-2xl font-bold mb-2">Analysis Complete!</p>
          <p className="text-green-700 mb-6">The AI analysis of your dispute is ready.</p>
          <Link
            href={`/disputes/${disputeId}/opinion`}
            className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            View Opinion
          </Link>
        </div>
      </div>
    );
  }

  if (data.status === 'FAILED') {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4 animate-fade-in">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <p className="text-red-800 text-xl font-bold mb-2">Analysis Failed</p>
          <p className="text-red-700 mb-2">
            {data.error_message || 'An error occurred during analysis.'}
          </p>
          <p className="text-red-600 text-sm">
            Please contact support at{' '}
            <a href="mailto:support@meritview.com" className="underline">
              support@meritview.com
            </a>{' '}
            for assistance.
          </p>
        </div>
        <Button variant="outline" onClick={() => evaluationQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const badgeClass = data.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analysis in Progress</h1>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${badgeClass}`}>
          {data.status === 'IN_PROGRESS' ? 'In Progress' : 'Pending'}
        </span>
      </div>

      <p className="text-slate-500 text-sm">
        Multiple AI evaluators are analyzing your dispute. This typically takes 2-5 minutes.
      </p>

      <div className="space-y-3">
        {data.progress.map((evaluator, index) => (
          <div
            key={index}
            className={`flex items-center justify-between border rounded-lg px-4 py-3 ${statusClass(evaluator.status)}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{statusIcon(evaluator.status)}</span>
              <span className="font-medium">{evaluator.provider_name}</span>
            </div>
            <span className="text-sm capitalize">{evaluator.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
