'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiGet } from '../../lib/api-client';

interface EvaluationProgress {
  evaluatorsComplete: number;
  evaluatorsTotal: number;
  aggregationStatus: string;
}

interface EvaluationStatus {
  status: 'idle' | 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: EvaluationProgress;
  estimatedCompletion: string | null;
}

export function useEvaluationStatus(disputeId: string | null) {
  const [status, setStatus] = useState<EvaluationStatus>({
    status: 'idle',
    progress: { evaluatorsComplete: 0, evaluatorsTotal: 0, aggregationStatus: 'pending' },
    estimatedCompletion: null,
  });
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startPolling = useCallback(async () => {
    if (!disputeId) return;

    setStatus(prev => ({ ...prev, status: 'pending' }));
    setError(null);

    intervalRef.current = setInterval(async () => {
      try {
        const data = await apiGet<EvaluationStatus>(`/evaluation/${disputeId}/evaluation/status`);
        setStatus(data);

        if (data.status === 'completed' || data.status === 'failed') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch evaluation status');
      }
    }, 3000);
  }, [disputeId]);

  const optimisticStart = useCallback(() => {
    setStatus({
      status: 'in_progress',
      progress: { evaluatorsComplete: 0, evaluatorsTotal: 3, aggregationStatus: 'pending' },
      estimatedCompletion: new Date(Date.now() + 300000).toISOString(),
    });
  }, []);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    error,
    startPolling,
    stopPolling,
    optimisticStart,
  };
}

export function useOptimisticMutation<T>(
  mutationFn: () => Promise<T>,
  optimisticData: Partial<T>
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setData(prev => prev ? { ...prev, ...optimisticData } : prev);

    try {
      const result = await mutationFn();
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || 'Mutation failed');
      setData(null);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, optimisticData]);

  return { data, isLoading, error, execute };
}
