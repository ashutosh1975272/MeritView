'use client';

import { useMutation, useQueryClient, MutateOptions } from '@tanstack/react-query';
import { useCallback } from 'react';

interface OptimisticUpdateConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: string[];
  optimisticUpdater: (oldData: TData | undefined, variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables, context?: TData) => void;
}

export function useOptimisticUpdate<TData, TVariables = void>({
  mutationFn,
  queryKey,
  optimisticUpdater,
  onSuccess,
  onError,
}: OptimisticUpdateConfig<TData, TVariables>) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn,
    onMutate: async (variables: TVariables) => {
      await queryClient.cancelQueries({ queryKey });

      const previousData = queryClient.getQueryData<TData>(queryKey);

      queryClient.setQueryData<TData>(queryKey, (old) =>
        optimisticUpdater(old, variables)
      );

      return { previousData };
    },
    onSuccess: (data: TData, variables: TVariables) => {
      queryClient.setQueryData(queryKey, data);
      onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables, context?: { previousData?: TData }) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
      onError?.(error, variables, context?.previousData);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const mutate = useCallback(
    (variables: TVariables, options?: MutateOptions<TData, Error, TVariables>) => {
      return mutation.mutateAsync(variables, options);
    },
    [mutation]
  );

  return {
    mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset,
  };
}
