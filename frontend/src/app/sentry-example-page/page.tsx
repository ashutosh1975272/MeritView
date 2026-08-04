'use client';

export default function SentryExamplePage() {
  if (process.env.NODE_ENV === 'production') {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-bold">Sentry test page disabled</h1>
        <p className="mt-2 text-muted-foreground">This page is only available outside production.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-2xl font-bold">Sentry Test Page</h1>
      <p className="text-muted-foreground">
        Use these buttons to verify Sentry captures real frontend and Next.js server errors.
      </p>
      <button
        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        onClick={() => {
          throw new Error(`Sentry frontend test error ${new Date().toISOString()}`);
        }}
      >
        Trigger Frontend Error
      </button>
      <div>
        <a className="text-primary underline" href="/api/sentry-example-api">
          Trigger Next.js Server Error
        </a>
      </div>
    </main>
  );
}
