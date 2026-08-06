'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, ChevronDown, ChevronUp, Send, Eye, CheckCircle2 } from 'lucide-react';

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
      <div className="space-y-2">
        <Label htmlFor="decision">Decision</Label>
        <Input
          id="decision"
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          placeholder="e.g. IN_FAVOR_OF_RESPONDENT"
          className="font-medium"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ruling">Ruling</Label>
        <Textarea
          id="ruling"
          value={ruling}
          onChange={(e) => setRuling(e.target.value)}
          rows={2}
          placeholder="Brief summary of the ruling..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reasoning">Reasoning</Label>
        <Textarea
          id="reasoning"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={5}
          placeholder="Detailed reasoning..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="applicableLaw">Applicable Law (Optional)</Label>
        <Textarea
          id="applicableLaw"
          value={applicableLaw}
          onChange={(e) => setApplicableLaw(e.target.value)}
          rows={2}
          placeholder="Laws or precedents applied..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="agreement">Inter-Evaluator Agreement (0-1)</Label>
          <Input
            id="agreement"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={agreement}
            onChange={(e) => setAgreement(e.target.value)}
            placeholder="Auto-calculated if empty"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confidence">Overall Confidence (0-1)</Label>
          <Input
            id="confidence"
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={confidence}
            onChange={(e) => setConfidence(e.target.value)}
            placeholder="Auto-calculated if empty"
          />
        </div>
      </div>

      <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="pt-4">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Standard disclaimers will be appended:</p>
          <ul className="list-disc list-inside space-y-1 text-xs text-blue-700 dark:text-blue-400">
            {DISCLAIMERS.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>
      )}

        <Button type="submit" disabled={publishMutation.isPending} className="gap-2">
        <Send className="h-4 w-4" />
        {publishMutation.isPending ? 'Publishing...' : 'Publish Opinion'}
      </Button>
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
        <Card className={`border ${actionMsg.includes('Failed') ? 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10' : 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/10'}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              {actionMsg.includes('Failed') ? <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" /> : <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />}
              <p className={`text-sm font-medium ${actionMsg.includes('Failed') ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>{actionMsg}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 dark:text-red-400 font-medium">Failed to load pending aggregations</p>
            <p className="text-red-500 dark:text-red-400 text-sm mt-1">{(error as any)?.message || 'An unexpected error occurred'}</p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {data && data.pending.length === 0 && (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No pending aggregations</p>
            <p className="text-muted-foreground text-sm">
              All completed disputes have been aggregated. Check back when new evaluations finish.
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.pending.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {data.count} dispute{data.count !== 1 ? 's' : ''} pending aggregation
          </div>

          {data.pending.map((item: any) => (
            <Card key={item.id} className="overflow-hidden">
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
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    {expandedId === item.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
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
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
