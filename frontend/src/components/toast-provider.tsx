'use client';

import { useCallback } from 'react';
import { useToastManager } from '@/components/ui/toast';

type ToastType = 'success' | 'error' | 'warning' | 'info';

export function useToast() {
  const { add } = useToastManager();

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    add({
      title: message,
      type: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : undefined,
    });
  }, [add]);

  return { showToast };
}
