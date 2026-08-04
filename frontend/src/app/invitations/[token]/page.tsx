'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

export default function AcceptInvitationPublicPage() {
  const params = useParams();
  const router = useRouter();
  const { user, setTokens, setUser } = useAuthStore();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'input' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [disputeId, setDisputeId] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);

  // Form states
  const [mode, setMode] = useState<'guest' | 'register'>('guest');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Fetch invitation details first
    const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');
    fetch(`${apiRoot}/v1/invitations/${token}`)
      .then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data?.error?.message || 'Failed to load invitation');
        if (data.status !== 'PENDING') throw new Error(`Invitation is ${data.status}`);
        setInviteData(data);
        
        // If already logged in as the invited user, try accepting immediately
        if (user && user.email === data.email) {
          submitAccept();
        } else {
          setStatus('input');
        }
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err.message || 'Invalid or expired invitation');
      });
  }, [token, user]);

  const submitAccept = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user && !acceptTerms) {
      setErrorMsg('You must accept the terms of service to join this dispute.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const payload: any = {};
    if (!user) {
      if (mode === 'guest') {
        payload.displayName = displayName;
        payload.acceptTerms = acceptTerms;
      } else {
        payload.createAccount = {
          email: inviteData?.email,
          password: password,
          displayName: displayName
        };
        payload.acceptTerms = acceptTerms;
      }
    }

    try {
      const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');
      const res = await fetch(`${apiRoot}/v1/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to accept');

      setDisputeId(data.disputeId);
      if (data.access_token && data.refresh_token && data.user) {
        setTokens(data.access_token, data.refresh_token);
        setUser(data.user);
      }
      setStatus('success');

      setTimeout(() => router.push(`/dashboard/disputes/${data.disputeId}/brief`), 1200);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to accept invitation');
    }
  };

  const submitDecline = async () => {
    setStatus('loading');
    setErrorMsg('');

    try {
      const apiRoot = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');
      const res = await fetch(`${apiRoot}/v1/invitations/${token}/decline`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to decline');
      setStatus('error');
      setErrorMsg('Invitation declined. The dispute initiator will be notified.');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to decline invitation');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 px-4">
      <div className="max-w-md w-full p-8 bg-card border border-border rounded-xl shadow-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
            ⚖️
          </div>
          <h1 className="text-2xl font-bold">Dispute Invitation</h1>
        </div>
        
        {status === 'loading' && (
          <div className="space-y-4 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-muted-foreground">Processing your invitation...</p>
          </div>
        )}

        {status === 'input' && inviteData && (
          <div className="space-y-6">
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-center">
              <p>You have been invited to participate in the dispute:</p>
              <p className="font-semibold text-foreground mt-1">{inviteData.disputeTitle}</p>
              <p className="text-xs text-muted-foreground mt-3">
                MeritView is AI decision support, not legal advice. Both parties submit briefs before a final opinion is generated.
              </p>
            </div>

            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button 
                onClick={() => setMode('guest')} 
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${mode === 'guest' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Continue as Guest
              </button>
              <button 
                onClick={() => setMode('register')} 
                className={`flex-1 text-sm py-2 rounded-md font-medium transition-colors ${mode === 'register' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={submitAccept} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" value={inviteData.email} disabled className="w-full px-3 py-2 border rounded-md bg-muted text-muted-foreground text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <input 
                  type="text" 
                  required 
                  value={displayName} 
                  onChange={e => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary/50 text-sm"
                  placeholder="John Doe" 
                />
              </div>

              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <input 
                      type="password" 
                      required 
                      value={password} 
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary/50 text-sm"
                      placeholder="Min 8 chars, 1 letter, 1 number" 
                    />
                  </div>
                </>
              )}

              {!user && (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    required
                    checked={acceptTerms}
                    onChange={e => setAcceptTerms(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-muted-foreground">
                    I agree to the <a href="/terms" target="_blank" className="text-primary hover:underline">Terms of Service</a>, <a href="/privacy" target="_blank" className="text-primary hover:underline">Privacy Policy</a>, and understand this is AI decision support, not legal advice.
                  </span>
                </label>
              )}

              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}

              <button type="submit" className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors mt-2">
                Accept Invitation
              </button>
              <button
                type="button"
                onClick={submitDecline}
                className="w-full py-2.5 border border-border text-foreground rounded-lg font-semibold hover:bg-muted/50 transition-colors"
              >
                Decline Invitation
              </button>
            </form>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <p className="text-foreground font-medium">Invitation accepted successfully!</p>
            <p className="text-sm text-muted-foreground">You are now a party to this dispute.</p>
            <button
              onClick={() => router.push(`/dashboard/disputes/${disputeId}/brief`)}
              className="w-full mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Start Your Brief
            </button>
            <p className="text-sm text-primary animate-pulse mt-4">Redirecting to your brief...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl">
              !
            </div>
            <p className="text-red-600 font-medium">Invitation Error</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full mt-4 px-4 py-2 border border-border text-foreground rounded-md hover:bg-muted/50 transition-colors"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
