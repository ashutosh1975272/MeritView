'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="text-5xl" aria-hidden="true">⚠️</div>
        <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-left text-red-600 overflow-auto max-h-48">
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2.5 border border-border rounded-md text-sm font-medium hover:bg-accent transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  );
}
