'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'NOT_SENT' | string;

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || '';
}

export default function InvitationLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const { user, setTokens, setUser, logout } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const autoAcceptAttemptedRef = useRef(false);

  const { data: invitation, isLoading, isError, error: invitationError, refetch } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => apiClient.getInvitation(token),
    enabled: !!token,
    retry: false,
  });

  const callbackUrl = `/invitations/${token}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}${invitation?.email ? `&email=${encodeURIComponent(invitation.email)}` : ''}`;
  const registerHref = `/register?callbackUrl=${encodeURIComponent(callbackUrl)}${invitation?.email ? `&email=${encodeURIComponent(invitation.email)}` : ''}`;

  const invitationStatus = (invitation?.status || 'PENDING') as InvitationStatus;
  const invitedEmail = normalizeEmail(invitation?.email);
  const currentEmail = normalizeEmail(user?.email);
  const isPending = invitationStatus === 'PENDING';
  const isAccepted = invitationStatus === 'ACCEPTED';
  const isExpired = invitationStatus === 'EXPIRED' || invitationStatus === 'DECLINED';
  const emailMatches = !!user && invitedEmail && currentEmail === invitedEmail;

  const acceptInvitation = async () => {
    if (isAccepting) return;
    setIsAccepting(true);
    setError(null);

    try {
      const result = await apiClient.acceptInvitation(token);

      if ((result as any).access_token && (result as any).refresh_token && (result as any).user) {
        setTokens((result as any).access_token, (result as any).refresh_token);
        setUser((result as any).user);
      }

      router.replace(`/dashboard/disputes/${result.disputeId}/draft`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to join invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  useEffect(() => {
    if (!invitation || !isPending || autoAcceptAttemptedRef.current || isAccepting) return;
    if (!user || !emailMatches) return;

    autoAcceptAttemptedRef.current = true;
    void acceptInvitation();
  }, [emailMatches, invitation, isAccepting, isPending, user]);

  useEffect(() => {
    if (invitationError) {
      setError((invitationError as any)?.message || 'Invalid or expired invitation');
    }
  }, [invitationError]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Invitation unavailable</CardTitle>
            <CardDescription>This link has expired, was revoked, or is no longer valid.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link href="/login" className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/80 transition-colors">
              Go to Login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4 py-12">
      <Card className="w-full max-w-lg border-border shadow-xl">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-2xl">
            ⚖️
          </div>
          <CardTitle className="text-2xl font-bold">
            {isPending ? 'You have been invited to join a dispute' : isAccepted ? 'You are already joined' : 'Invitation expired'}
          </CardTitle>
          <CardDescription>
            {invitation.disputeTitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-4 text-sm space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Invite email</span>
              <span className="font-medium break-all">{invitation.email}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium">{invitationStatus.replace(/_/g, ' ').toLowerCase()}</span>
            </div>
            {invitation.expiresAt && (
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Expires</span>
                <span className="font-medium">{new Date(invitation.expiresAt).toLocaleString()}</span>
              </div>
            )}
          </div>

          {isPending && !user && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                If you already have an account, sign in. If not, create one using the invited email and we will take you straight into the dispute workspace.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href={loginHref} className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/80 transition-colors">
                  I have an account
                </Link>
                <Link href={registerHref} className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Create account
                </Link>
              </div>
            </div>
          )}

          {isPending && user && emailMatches && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                You are signed in as the invited email. Joining the dispute now...
              </div>
              <Button onClick={acceptInvitation} disabled={isAccepting} className="w-full">
                {isAccepting ? 'Joining...' : 'Join dispute'}
              </Button>
            </div>
          )}

          {isPending && user && !emailMatches && (
            <div className="space-y-3">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                You are signed in as <strong>{user.email}</strong>, but this invitation was sent to <strong>{invitation.email}</strong>.
                Please switch accounts to continue.
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link href={loginHref} className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/80 transition-colors">
                  Sign in as invited email
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await logout();
                    router.push(loginHref);
                  }}
                >
                  Sign out
                </Button>
              </div>
            </div>
          )}

          {isAccepted && (
            <div className="space-y-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                This invitation has already been accepted.
              </div>
              <Link href={user ? `/dashboard/disputes/${invitation.disputeId}/draft` : loginHref} className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/80 transition-colors">
                Open workspace
              </Link>
            </div>
          )}

          {isExpired && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                This invitation is no longer active. Ask the initiator to send a new invite if needed.
              </div>
              <Link href="/login" className="inline-flex h-8 w-full items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Go to Login
              </Link>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="pt-2 text-xs text-muted-foreground text-center">
            Joining will open the dispute workspace where you can draft your own brief.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
