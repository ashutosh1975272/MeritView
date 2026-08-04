'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

interface EvaluatorOutput {
  id: string;
  llmProvider: string;
  modelId: string;
  parseSuccess: boolean;
  durationMs: number;
  costUsd: number;
}

interface EvaluationStatus {
  state: string;
  evaluatorOutputs: EvaluatorOutput[];
  totalCost: number;
  completedAt: string | null;
}

const PROVIDERS = ['groq', 'anthropic', 'openai', 'gemini', 'mistral']; // Expected evaluators

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const { accessToken } = useAuthStore();

  const [status, setStatus] = useState<EvaluationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!accessToken || !disputeId) return;

    const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');
    const url = new URL(`${apiRoot}/v1/disputes/${disputeId}/opinion/stream`);
    
    // Polyfill or append token to query for SSE since browser native EventSource doesn't support headers well
    // Let's assume the backend auth middleware supports query tokens for SSE, if not we'd use a polyfill like @microsoft/fetch-event-source
    // For simplicity, we'll try polling as fallback if SSE is strictly header-based, but we'll write SSE first.
    // However, native EventSource doesn't allow custom headers. 
    // To fix this without adding a dependency, we will just poll the `/status` endpoint fast.
    
    let isPolling = true;
    
    const poll = async () => {
      try {
        const res = await fetch(`${apiRoot}/v1/disputes/${disputeId}/opinion/status`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        setStatus(data);
        
        if (data.state === 'COMPLETED' || data.state === 'WITHDRAWN' || data.state === 'FAILED') {
          isPolling = false;
        }
      } catch (err: any) {
        setError(err.message);
        isPolling = false;
      }
      
      if (isPolling) {
        setTimeout(poll, 2000);
      }
    };
    
    poll();

    return () => {
      isPolling = false;
    };
  }, [accessToken, disputeId]);

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-6 bg-red-50 border border-red-200 rounded-lg text-center text-red-700">
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <h2 className="text-xl font-medium">Connecting to Analysis Engine...</h2>
      </div>
    );
  }

  const isComplete = status.state === 'COMPLETED';
  const isFailed = status.state === 'FAILED' || status.state === 'WITHDRAWN';
  
  // Group results by provider to show progress bars
  const completedProviders = new Set(status.evaluatorOutputs.map(o => o.llmProvider));
  const successCount = status.evaluatorOutputs.filter(o => o.parseSuccess).length;

  return (
    <div className="max-w-3xl mx-auto mt-8 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isComplete ? 'Analysis Complete' : isFailed ? 'Analysis Failed' : 'Analysis in Progress'}
        </h1>
        <p className="text-muted-foreground">
          {isComplete 
            ? 'The aggregation engine has synthesized all evaluations.'
            : isFailed 
            ? 'The evaluation process did not meet the success threshold.'
            : 'Multiple AI evaluators are analyzing the briefs in parallel.'}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Evaluator Progress</h2>
          <span className="text-sm font-medium bg-secondary px-3 py-1 rounded-full">
            {completedProviders.size} / 5 Models Completed
          </span>
        </div>

        <div className="space-y-4">
          {PROVIDERS.map(provider => {
            const output = status.evaluatorOutputs.find(o => o.llmProvider === provider);
            const isDone = !!output;
            const isSuccess = output?.parseSuccess;
            
            return (
              <div key={provider} className="flex items-center gap-4">
                <div className="w-28 font-medium capitalize text-sm">{provider}</div>
                <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                  {isDone ? (
                    <div className={`absolute top-0 left-0 h-full w-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'}`} />
                  ) : (
                    <div className="absolute top-0 left-0 h-full w-full bg-primary/20 animate-pulse" />
                  )}
                </div>
                <div className="w-24 text-right text-xs text-muted-foreground font-medium">
                  {isDone ? (
                    isSuccess ? (
                      <span className="text-green-600 flex items-center justify-end gap-1"><span className="text-base leading-none">✓</span> Complete</span>
                    ) : (
                      <span className="text-red-600">Failed</span>
                    )
                  ) : (
                    <span className="animate-pulse">Processing...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isComplete && (
          <div className="pt-6 mt-6 border-t border-border space-y-4">
            <div className="flex items-center justify-between text-sm bg-muted/50 p-4 rounded-lg">
              <span className="font-medium">Aggregation Engine</span>
              <span className="text-green-600 font-semibold flex items-center gap-1"><span className="text-base leading-none">✓</span> Synthesized</span>
            </div>
            <button
              onClick={() => router.push(`/dashboard/disputes/${disputeId}/opinion`)}
              className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              View Full Opinion →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
