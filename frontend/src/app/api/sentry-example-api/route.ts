export function GET() {
  if (process.env.NODE_ENV === 'production') {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  throw new Error(`Sentry Next.js server test error ${new Date().toISOString()}`);
}
