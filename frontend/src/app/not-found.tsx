import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="text-center max-w-md space-y-6">
        <div className="text-6xl font-bold text-primary/30">404</div>
        <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2.5 border border-border rounded-md text-sm font-medium hover:bg-accent transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
