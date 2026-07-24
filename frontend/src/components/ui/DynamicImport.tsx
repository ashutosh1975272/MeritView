'use client';

import dynamic from 'next/dynamic';
import { Suspense, ComponentType } from 'react';

interface DynamicImportOptions {
  loading?: React.ReactNode;
  ssr?: boolean;
}

function DefaultLoading() {
  return (
    <div className="animate-pulse p-4">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
}

export function createDynamicComponent<T>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: DynamicImportOptions = {}
): ComponentType<T> {
  const DynamicComponent = dynamic(importFn, {
    loading: () => options.loading || <DefaultLoading />,
    ssr: options.ssr ?? true,
  }) as ComponentType<T>;

  return DynamicComponent;
}

export function withSuspense<T>(
  Component: ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function SuspenseWrapper(props: T) {
    return (
      <Suspense fallback={fallback || <DefaultLoading />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export const DynamicOpinionPage = createDynamicComponent(
  () => import('../opinion/OptimizedOpinionPage').then(m => ({ default: m.OptimizedOpinionPage }))
);

export const DynamicVirtualizedTable = createDynamicComponent(
  () => import('../admin/VirtualizedTable').then(m => ({ default: m.VirtualizedTable as any })),
  { ssr: false }
);

export const DynamicNotificationComponent = createDynamicComponent(
  () => import('../notifications/NotificationComponent').then(m => ({ default: m.NotificationComponent })),
  { ssr: false }
);

export const DynamicPdfDownloadButton = createDynamicComponent(
  () => import('../opinion/PdfDownloadButton').then(m => ({ default: m.PdfDownloadButton })),
  { ssr: false }
);
