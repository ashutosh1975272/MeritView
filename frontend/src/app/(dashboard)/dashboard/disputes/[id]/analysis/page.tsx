'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

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

const PROVIDERS = ['groq', 'anthropic', 'openai', 'gemini', 'mistral'];

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

    let isPolling = true;

    const poll = async () => {
      try {
        const res = await fetch(`${apiRoot}/v1/disputes/${disputeId}/evaluation/status`, {
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
      <div className="max-w-3xl mx-auto mt-12 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-center text-red-700 dark:text-red-400">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold mb-2">Error</h2>
        <p>{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-3xl mx-auto mt-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h2 className="text-xl font-medium">Connecting to Analysis Engine...</h2>
        <p className="text-sm text-muted-foreground mt-2">This may take a moment</p>
      </div>
    );
  }

  const isComplete = status.state === 'COMPLETED';
  const isFailed = status.state === 'FAILED' || status.state === 'WITHDRAWN';
  
  const completedProviders = new Set((status.evaluatorOutputs ?? []).map(o => o.llmProvider));
  const successCount = (status.evaluatorOutputs ?? []).filter(o => o.parseSuccess).length;
  const progress = (completedProviders.size / PROVIDERS.length) * 100;

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Evaluator Progress</CardTitle>
              <CardDescription>
                {completedProviders.size} of {PROVIDERS.length} models completed
              </CardDescription>
            </div>
            <Badge variant={isComplete ? 'default' : isFailed ? 'destructive' : 'secondary'} className="gap-1">
              {isComplete ? <CheckCircle2 className="h-3 w-3" /> : isFailed ? <XCircle className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
              {isComplete ? 'Complete' : isFailed ? 'Failed' : 'In Progress'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Progress value={progress} className="h-2" />

          <div className="space-y-4">
            {PROVIDERS.map(provider => {
              const output = (status.evaluatorOutputs ?? []).find(o => o.llmProvider === provider);
              const isDone = !!output;
              const isSuccess = output?.parseSuccess;
              
              return (
                <div key={provider} className="flex items-center gap-4">
                  <div className="w-28 font-medium capitalize text-sm">{provider}</div>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden relative">
                    {isDone ? (
                      <div className={`absolute top-0 left-0 h-full w-full ${isSuccess ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500`} />
                    ) : (
                      <div className="absolute top-0 left-0 h-full w-full bg-primary/20 animate-pulse" />
                    )}
                  </div>
                  <div className="w-32 text-right text-xs font-medium">
                    {isDone ? (
                      isSuccess ? (
                        <span className="text-green-600 dark:text-green-400 flex items-center justify-end gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Complete
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400 flex items-center justify-end gap-1">
                          <XCircle className="h-3 w-3" />
                          Failed
                        </span>
                      )
                    ) : (
                      <span className="text-muted-foreground flex items-center justify-end gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing...
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isComplete && (
            <div className="pt-6 mt-6 border-t border-border space-y-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <span className="font-medium">Aggregation Engine</span>
                    </div>
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Synthesized
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={() => router.push(`/dashboard/disputes/${disputeId}/opinion`)} className="w-full gap-2">
                View Full Opinion <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
