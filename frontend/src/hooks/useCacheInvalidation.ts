'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useCacheInvalidation() {
  const queryClient = useQueryClient();

  const invalidateDisputeList = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['disputes'] });
  }, [queryClient]);

  const invalidateDisputeDetail = useCallback((disputeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['disputes', disputeId] });
  }, [queryClient]);

  const invalidateEvaluationStatus = useCallback((disputeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['evaluation', 'status', disputeId] });
  }, [queryClient]);

  const invalidateOpinion = useCallback((disputeId: string) => {
    queryClient.invalidateQueries({ queryKey: ['opinion', disputeId] });
  }, [queryClient]);

  const invalidateAdminDisputes = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
  }, [queryClient]);

  const invalidateUserProfile = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
  }, [queryClient]);

  const invalidateNotifications = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  }, [queryClient]);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  const resetQueries = useCallback((queryKey: string[]) => {
    queryClient.resetQueries({ queryKey });
  }, [queryClient]);

  const removeQueries = useCallback((queryKey: string[]) => {
    queryClient.removeQueries({ queryKey });
  }, [queryClient]);

  return {
    invalidateDisputeList,
    invalidateDisputeDetail,
    invalidateEvaluationStatus,
    invalidateOpinion,
    invalidateAdminDisputes,
    invalidateUserProfile,
    invalidateNotifications,
    invalidateAll,
    resetQueries,
    removeQueries,
  };
}

export function createMutationOptions<TData, TVariables>(
  queryKey: string[],
  options?: {
    onMutate?: (variables: TVariables) => TData | Partial<TData>;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: Error, variables: TVariables) => void;
  }
) {
  return {
    mutationFn: null as unknown as (variables: TVariables) => Promise<TData>,
    onMutate: options?.onMutate,
    onSuccess: (data: TData, variables: TVariables) => {
      options?.onSuccess?.(data, variables);
    },
    onError: (error: Error, variables: TVariables) => {
      options?.onError?.(error, variables);
    },
    onSettled: () => undefined,
  };
}
