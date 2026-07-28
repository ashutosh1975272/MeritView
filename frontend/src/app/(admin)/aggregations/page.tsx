'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const DISCLAIMERS = [
  'This analysis is for informational purposes only and does not constitute legal advice.',
  'You should consult with a licensed attorney regarding your specific situation.',
  'This evaluation is based solely on the information provided in the briefs and may not capture all relevant facts.',
  'MeritView makes no guarantees about the accuracy or completeness of this analysis.',
];

const AGGREGATOR_PROVIDER = 'admin-manual';
const AGGREGATOR_MODEL = 'manual-aggregation-v1';

function PublishForm({ disputeId, onComplete }: { disputeId: string; onComplete: () => void }) {
  const [decision, setDecision] = useState('');
  const [ruling, setRuling] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [applicableLaw, setApplicableLaw] = useState('');
  
  const [agreement, setAgreement] = useState('');
  const [confidence, setConfidence] = useState('');
  const [error, setError] = useState('');

  const publishMutation = useMutation({
    mutationFn: (data: {
      content: string;
      disclaimers: string[];
      aggregatorProvider: string;
      aggregatorModelId: string;
      interEvaluatorAgreement?: number;
      overallConfidence?: number;
    }) => apiClient.adminPublishAggregation(disputeId, data),
    onSuccess: () => {
      onComplete();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to publish opinion');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!decision.trim() || !ruling.trim() || !reasoning.trim()) {
      setError('Decision, Ruling, and Reasoning are required fields');
      return;
    }

    const opinionContent = {
      decision: decision.trim(),
      ruling: ruling.trim(),
      reasoning: reasoning.trim(),
      applicableLaw: applicableLaw.trim(),
      strengths: [],
      weaknesses: [],
      confidenceScore: confidence ? parseFloat(confidence) : 0.8
    };

    publishMutation.mutate({
      content: JSON.stringify(opinionContent),
      disclaimers: DISCLAIMERS,
      aggregatorProvider: AGGREGATOR_PROVIDER,
      aggregatorModelId: AGGREGATOR_MODEL,
      interEvaluatorAgreement: agreement ? parseFloat(agreement) : undefined,
      overallConfidence: confidence ? parseFloat(confidence) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Decision</label>
        <input
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background font-medium"
          placeholder="e.g. IN_FAVOR_OF_RESPONDENT"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Ruling</label>
        <textarea
          value={ruling}
          onChange={(e) => setRuling(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
          placeholder="Brief summary of the ruling..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Reasoning</label>
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={5}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
          placeholder="Detailed reasoning..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Applicable Law (Optional)</label>
        <textarea
          value={applicableLaw}
          onChange={(e) => setApplicableLaw(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
          placeholder="Laws or precedents applied..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Inter-Evaluator Agreement (0-1)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={agreement}
            onChange={(e) => setAgreement(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            placeholder="Auto-calculated if empty"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Overall Confidence (0-1)</label>
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
            placeholder="Auto-calculated if empty"
          />
        </div>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        <p className="font-medium mb-1">Standard disclaimers will be appended:</p>
        <ul className="list-disc list-inside space-y-0.5">
          {DISCLAIMERS.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={publishMutation.isPending}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        {publishMutation.isPending ? 'Publishing...' : 'Publish Opinion'}
      </button>
    </form>
  );
}

export default function AdminAggregationsPage() {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'aggregations', 'pending'],
    queryFn: () => apiClient.adminGetPendingAggregations(),
    refetchInterval: 30000,
  });

  const unpublishMutation = useMutation({
    mutationFn: (disputeId: string) => apiClient.adminUnpublishAggregation(disputeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'aggregations', 'pending'] });
      setActionMsg('Opinion unpublished successfully');
      setTimeout(() => setActionMsg(''), 5000);
    },
    onError: (err: any) => {
      setActionMsg(`Failed to unpublish: ${err.message}`);
      setTimeout(() => setActionMsg(''), 8000);
    },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aggregations</h1>
          <p className="text-muted-foreground mt-1">
            Review disputes with completed evaluations and generate or manage opinions.
          </p>
        </div>
      </div>

      {actionMsg && (
        <div className={`p-3 rounded-lg text-sm ${
          actionMsg.includes('Failed') ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'
        }`}>
          {actionMsg}
        </div>
      )}

      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border border-border rounded-lg">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="p-6 border border-red-200 bg-red-50 rounded-lg text-center">
          <p className="text-red-600 font-medium">Failed to load pending aggregations</p>
          <p className="text-red-500 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
        </div>
      )}

      {data && data.pending.length === 0 && (
        <div className="p-12 border border-border rounded-lg bg-card text-center">
          <p className="text-muted-foreground text-lg mb-2">No pending aggregations</p>
          <p className="text-muted-foreground text-sm">
            All completed disputes have been aggregated. Check back when new evaluations finish.
          </p>
        </div>
      )}

      {data && data.pending.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {data.count} dispute{data.count !== 1 ? 's' : ''} pending aggregation
          </div>

          {data.pending.map((item: any) => (
            <div key={item.id} className="border border-border rounded-lg bg-card overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold truncate">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {item.evaluatorOutputCount} evaluator output{item.evaluatorOutputCount !== 1 ? 's' : ''}
                    {item.completedAt && ` · Completed ${new Date(item.completedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <Link
                    href={`/admin/disputes/${item.id}`}
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View dispute
                  </Link>
                  <span className="text-muted-foreground text-xs">
                    {expandedId === item.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {expandedId === item.id && (
                <div className="border-t border-border p-4">
                  <PublishForm
                    disputeId={item.id}
                    onComplete={() => {
                      queryClient.invalidateQueries({ queryKey: ['admin', 'aggregations', 'pending'] });
                      setExpandedId(null);
                      setActionMsg('Opinion published successfully');
                      setTimeout(() => setActionMsg(''), 5000);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
