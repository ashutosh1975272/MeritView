'use client';

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface OptimisticConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  onMutate?: (variables: TVariables) => TData | Partial<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables = void>({
  mutationFn,
  queryKey,
  onMutate,
  onSuccess,
  onError,
}: OptimisticConfig<TData, TVariables>) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    setIsLoading(true);
    setError(null);

    const previousData = queryClient.getQueryData<TData>(queryKey);

    if (onMutate) {
      queryClient.setQueryData(queryKey, onMutate(variables));
    }

    try {
      const result = await mutationFn(variables);

      if (onSuccess) {
        onSuccess(result, variables);
      }

      queryClient.invalidateQueries({ queryKey });
      return result;
    } catch (err: any) {
      if (previousData) {
        queryClient.setQueryData(queryKey, previousData);
      }

      setError(err);
      if (onError) {
        onError(err, variables);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [mutationFn, queryKey, onMutate, onSuccess, onError, queryClient]);

  return { mutate, isLoading, error };
}
