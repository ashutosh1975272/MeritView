'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

interface EvaluatorOutput {
  id: string;
  llmProvider: string;
  modelId: string;
  promptVersion: string;
  parseSuccess: boolean;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  attemptNumber: number;
  createdAt: string;
}

interface EvaluationStatus {
  state: string;
  evaluatorOutputs: EvaluatorOutput[];
  totalCost: number;
  completedAt: string | null;
}

const STATE_LABELS: Record<string, string> = {
  UNDER_ANALYSIS: 'Analysis in progress',
  COMPLETED: 'Analysis complete',
  WITHDRAWN: 'Analysis failed',
  FAILED: 'Analysis failed',
};

const STATE_COLORS: Record<string, string> = {
  UNDER_ANALYSIS: 'text-blue-600 bg-blue-50 border-blue-200',
  COMPLETED: 'text-green-600 bg-green-50 border-green-200',
  WITHDRAWN: 'text-red-600 bg-red-50 border-red-200',
  FAILED: 'text-red-600 bg-red-50 border-red-200',
};

async function fetchEvaluationStatus(disputeId: string, accessToken: string): Promise<EvaluationStatus> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/v1/disputes/${disputeId}/evaluation/status`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch evaluation status');
  }

  return res.json();
}

async function triggerEvaluation(disputeId: string, accessToken: string): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${baseUrl}/v1/disputes/${disputeId}/evaluate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to start evaluation' }));
    throw new Error(error.message || 'Failed to start evaluation');
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatCost(usd: number): string {
  return `$${usd.toFixed(4)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const { user, accessToken } = useAuthStore();

  const [status, setStatus] = useState<EvaluationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);

  const pollStatus = useCallback(async () => {
    if (!accessToken || !disputeId) return;

    try {
      const data = await fetchEvaluationStatus(disputeId, accessToken);
      setStatus(data);

      if (data.state === 'COMPLETED' || data.state === 'WITHDRAWN' || data.state === 'FAILED') {
        setHasTriggered(true);
        return;
      }

      if (data.state === 'UNDER_ANALYSIS') {
        setHasTriggered(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, disputeId]);

  useEffect(() => {
    pollStatus();
  }, [pollStatus]);

  useEffect(() => {
    if (!hasTriggered) return;
    if (status?.state === 'COMPLETED' || status?.state === 'WITHDRAWN' || status?.state === 'FAILED') return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [hasTriggered, status?.state, pollStatus]);

  const handleStartEvaluation = async () => {
    if (!accessToken) return;
    setIsTriggering(true);
    setError(null);

    try {
      await triggerEvaluation(disputeId, accessToken);
      setHasTriggered(true);
      await pollStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start evaluation');
    } finally {
      setIsTriggering(false);
    }
  };

  const isTerminal = status?.state === 'COMPLETED' || status?.state === 'WITHDRAWN' || status?.state === 'FAILED';
  const isInProgress = status?.state === 'UNDER_ANALYSIS' || (hasTriggered && !isTerminal);
  const isAwaitingTrigger = !isInProgress && !isTerminal && !hasTriggered;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Evaluation Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispute ID: {disputeId}
          </p>
        </div>
        {status && (
          <div
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
              STATE_COLORS[status.state] || 'text-gray-600 bg-gray-50 border-gray-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full mr-2 ${
                status.state === 'UNDER_ANALYSIS'
                  ? 'bg-blue-500 animate-pulse'
                  : status.state === 'COMPLETED'
                    ? 'bg-green-500'
                    : 'bg-red-500'
              }`}
            />
            {STATE_LABELS[status.state] || status.state}
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && !status && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse p-6 rounded-lg border border-border">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-1/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {isAwaitingTrigger && !isLoading && (
        <div className="p-8 rounded-lg border border-border text-center space-y-4">
          <div className="text-4xl">⚖️</div>
          <h2 className="text-lg font-medium">Ready for Analysis</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            All briefs have been submitted and payment is confirmed. Click below to start the evaluation.
          </p>
          <button
            onClick={handleStartEvaluation}
            disabled={isTriggering}
            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isTriggering ? (
              <>
                <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Starting evaluation...
              </>
            ) : (
              'Start Evaluation'
            )}
          </button>
        </div>
      )}

      {isInProgress && (
        <div className="p-8 rounded-lg border border-border text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-medium">Analysis in Progress</h2>
          <p className="text-sm text-muted-foreground">
            Multiple AI evaluators are analyzing your dispute. This typically takes 1-3 minutes.
          </p>
          <p className="text-xs text-muted-foreground">
            Polling for updates every 3 seconds...
          </p>
        </div>
      )}

      {status && status.evaluatorOutputs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Evaluator Results</h2>
          {status.evaluatorOutputs.map((output) => (
            <div
              key={output.id}
              className={`p-4 rounded-lg border ${
                output.parseSuccess
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{output.llmProvider}</span>
                  <span className="text-xs text-muted-foreground">{output.modelId}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {output.parseSuccess ? (
                    <span className="text-green-600 font-medium">Parsed</span>
                  ) : (
                    <span className="text-red-600 font-medium">Parse failed</span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Duration</span>
                  <p className="font-medium">{formatDuration(output.durationMs)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cost</span>
                  <p className="font-medium">{formatCost(output.costUsd)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Input tokens</span>
                  <p className="font-medium">{output.inputTokens.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Output tokens</span>
                  <p className="font-medium">{output.outputTokens.toLocaleString()}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>Attempt #{output.attemptNumber}</span>
                <span>v{output.promptVersion}</span>
                <span>{formatDate(output.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {status && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {status.evaluatorOutputs.length} evaluator output{status.evaluatorOutputs.length !== 1 ? 's' : ''}
            </span>
            <span className="font-medium">Total cost: ${status.totalCost.toFixed(4)}</span>
          </div>
        </div>
      )}

      {isTerminal && (
        <div className="flex justify-center pt-4">
          <button
            onClick={() => router.push(`/disputes/${disputeId}`)}
            className="px-6 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Back to Dispute
          </button>
        </div>
      )}
    </div>
  );
}
