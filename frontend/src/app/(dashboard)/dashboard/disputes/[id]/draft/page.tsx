'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useToast } from '@/components/toast-provider';
import { DisputeStatusPanel } from '@/components/disputes/DisputeStatusPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Copy, Trash2, Send, Save, CheckCircle2, AlertCircle, Clock, Loader2, ArrowLeft, CreditCard, Users, Sparkles, ShieldCheck, MessageSquareText, FileText
} from 'lucide-react';

const SECTION_LABELS: Record<string, string> = {
  factualBackground: 'Factual Background',
  myPosition: 'My Position',
  supportingArguments: 'Supporting Arguments',
  acknowledgmentOfOpposing: 'Acknowledgment of Opposing Position',
  desiredResolution: 'Desired Resolution',
};

const SECTION_KEYS = [
  'factualBackground',
  'myPosition',
  'supportingArguments',
  'acknowledgmentOfOpposing',
  'desiredResolution',
] as const;

const MAX_WORDS = 5000;
const AUTOSAVE_INTERVAL = 30000;

function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
}

function formatElapsed(savedAt: Date | null) {
  if (!savedAt) return 'Not saved yet';
  const elapsedMs = Date.now() - savedAt.getTime();
  if (elapsedMs < 60_000) {
    const seconds = Math.max(1, Math.round(elapsedMs / 1000));
    return `Saved ${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }
  const minutes = Math.round(elapsedMs / 60_000);
  if (minutes < 60) {
    return `Saved ${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  const hours = Math.round(elapsedMs / 3_600_000);
  return `Saved ${hours} hour${hours === 1 ? '' : 's'} ago`;
}

function stateLabel(state?: string) {
  return state ? state.replace(/_/g, ' ') : 'unknown';
}

export default function DraftWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const disputeId = params.id as string;

  const [dispute, setDispute] = useState<any>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [sections, setSections] = useState<Record<string, string>>({
    factualBackground: '',
    myPosition: '',
    supportingArguments: '',
    acknowledgmentOfOpposing: '',
    desiredResolution: '',
  });

  const [briefStatus, setBriefStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: disputeData, refetch: refetchDispute } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId,
  });

  const saveDraftMutation = useMutation({
    mutationFn: (sects: Record<string, string>) => apiClient.saveDraft(disputeId, partyId!, sects),
    onSuccess: (result) => {
      setBriefStatus(result.status);
      setLastSaved(new Date());
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
    },
  });

  const submitBriefMutation = useMutation({
    mutationFn: (sects: Record<string, string>) => apiClient.submitBrief(disputeId, partyId!, sects),
    onSuccess: (result) => {
      setBriefStatus(result.brief.status);
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      showToast('Brief submitted successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to submit brief', 'error');
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => apiClient.sendInvitation(disputeId, email),
    onSuccess: () => {
      setInviteEmail('');
      showToast('Invitation sent', 'success');
      refetchDispute();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to send invitation', 'error');
    },
  });

  const expireMutation = useMutation({
    mutationFn: (token: string) => apiClient.expireInvitation(token),
    onSuccess: () => {
      showToast('Invitation deleted', 'success');
      refetchDispute();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to delete invitation', 'error');
    },
  });

  useEffect(() => {
    if (!disputeData) return;

    setDispute(disputeData);
    const myParty = disputeData.parties?.find((p: any) => p.userId === user?.id);
    if (myParty) {
      setPartyId(myParty.id);
      setMyRole(myParty.role);
    }
    setIsLoading(false);
  }, [disputeData, user?.id]);

  useEffect(() => {
    const loadBrief = async () => {
      if (!partyId || !disputeId) return;
      try {
        const brief = await apiClient.getBriefMaybe(disputeId, partyId);
        if (brief) {
          setSections(brief.sections);
          setBriefStatus(brief.status);
        } else {
          setBriefStatus('DRAFT');
        }
      } catch (err: any) {
        if (err.status !== 404) {
          console.error('Failed to load brief', err);
        }
      }
    };
    if (partyId) loadBrief();
  }, [partyId, disputeId]);

  useEffect(() => {
    if (briefStatus === 'SEALED' || briefStatus === 'SUBMITTED') return;
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      const hasContent = Object.values(sections).some((s) => s.trim().length > 0);
      if (hasContent && partyId) handleSaveDraft();
    }, AUTOSAVE_INTERVAL);
    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [sections, partyId, briefStatus]);

  const handleSaveDraft = useCallback(async () => {
    if (!partyId || isSaving) return;
    setIsSaving(true);
    try {
      await saveDraftMutation.mutateAsync(sections);
      setLastSaved(new Date());
    } catch (err: any) {
      showToast(err.message || 'Failed to save draft', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [partyId, sections, saveDraftMutation, showToast, isSaving]);

  const handleSectionChange = useCallback((key: string, value: string) => {
    if (countWords(value) > MAX_WORDS) return;
    setSections((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSubmit = async () => {
    const emptySections = SECTION_KEYS.filter((key) => !sections[key] || sections[key].trim().length === 0);
    if (emptySections.length > 0) {
      showToast(`Please fill in: ${emptySections.map((k) => SECTION_LABELS[k]).join(', ')}`, 'error');
      return;
    }

    const total = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);
    if (total > MAX_WORDS) {
      showToast(`Brief exceeds ${MAX_WORDS} word limit`, 'error');
      return;
    }

    try {
      await submitBriefMutation.mutateAsync(sections);
    } catch {
      // handled by mutation
    }
  };

  const handleContinueToPayment = async () => {
    setShowPayment(true);
    setIsPaymentLoading(true);
    setPaymentError(null);
    try {
      const pi = await apiClient.createPaymentIntent(disputeId);
      setPaymentIntentId(pi.paymentIntentId || null);
      setPaymentAmount(pi.amount || Number(dispute?.priceUsd || 9900));
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to initialize payment');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentIntentId) return;
    try {
      await apiClient.confirmPayment(disputeId, paymentIntentId);
      setPaymentSuccess(true);
      setShowPayment(false);
      showToast('Payment completed successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['dispute', disputeId] });
      refetchDispute();
    } catch (err: any) {
      setPaymentError(err.message || 'Payment confirmation failed');
    }
  };

  const handleCopyLink = (token: string) => {
    const link = `${window.location.origin}/invitations/${token}`;
    navigator.clipboard.writeText(link);
    showToast('Invitation link copied', 'success');
  };

  const handleDeleteInvitation = (token: string) => {
    expireMutation.mutate(token);
  };

  const currentParty = dispute?.parties?.find((p: any) => p.userId === user?.id);
  const isInitiator = currentParty?.role === 'INITIATOR';
  const isRespondent = currentParty?.role === 'RESPONDENT';
  const respondentParty = dispute?.parties?.find((p: any) => p.role === 'RESPONDENT');
  const activeInvitation = respondentParty?.invitationStatus === 'PENDING' ? respondentParty : null;
  const invitationAccepted = respondentParty?.invitationStatus === 'ACCEPTED';
  const invitationExpired = respondentParty?.invitationStatus === 'EXPIRED' || respondentParty?.invitationStatus === 'DECLINED';
  const canInvite = isInitiator && !invitationAccepted;
  const briefSubmitted = briefStatus === 'SEALED' || briefStatus === 'SUBMITTED';
  const totalWordCount = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);
  const wordProgress = Math.min((totalWordCount / MAX_WORDS) * 100, 100);
  const isPaid = dispute?.payments?.some((p: any) => p.status === 'SUCCEEDED');
  const needsPayment = isInitiator && !isPaid && (dispute?.state === 'DRAFT' || dispute?.state === 'PAYMENT_PENDING');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50 border border-red-200 rounded-lg text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!dispute || !partyId) {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-amber-50 border border-amber-200 rounded-lg text-center">
        <p className="text-amber-800 font-medium">You are not linked to this dispute yet.</p>
        <p className="text-amber-700 text-sm mt-1">If you just joined, refresh in a moment.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] pb-16">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Link href="/dashboard/disputes" className="hover:text-foreground transition-colors">
                Disputes
              </Link>
              <span>/</span>
              <span className="text-foreground truncate max-w-[260px]">{dispute.title}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{dispute.title}</h1>
              <Badge variant="secondary" className="capitalize">
                {stateLabel(dispute.state)}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {isInitiator ? 'Initiator view' : isRespondent ? 'Respondent view' : myRole || 'Member'}
              </Badge>
            </div>
            <p className="text-muted-foreground max-w-3xl">
              This workspace is shared across both parties. Draft your brief, track invitation status, and complete payment without bouncing between pages.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {lastSaved && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatElapsed(lastSaved)}
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium">
              <FileText className="h-3.5 w-3.5" />
              {briefStatus || 'DRAFT'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard/disputes/${disputeId}/brief`)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Open Groq Assistant
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Your role</p>
                  <p className="font-semibold capitalize">{isInitiator ? 'Initiator' : isRespondent ? 'Respondent' : myRole || 'Party'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Counterparty</p>
                  <p className="font-semibold">
                    {invitationAccepted ? 'Joined' : activeInvitation ? 'Invited' : invitationExpired ? 'Expired' : 'Not invited'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Payment</p>
                  <p className="font-semibold">{isPaid ? 'Completed' : 'Pending'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Draft progress</p>
                  <p className="font-semibold">{Math.round(wordProgress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Progress value={wordProgress} className="h-1.5" />
        <p className="text-xs text-muted-foreground -mt-2">
          {totalWordCount} / {MAX_WORDS} words
          {totalWordCount > MAX_WORDS && <span className="text-red-500 ml-2">Over limit</span>}
        </p>

        {paymentSuccess && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-900">Payment Completed</p>
              <p className="text-xs text-green-700">
                ${Number(dispute?.priceUsd || paymentAmount / 100).toFixed(2)} • {(dispute?.pricingTier || 'Standard').toLowerCase()} • {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {paymentError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Payment Error</p>
              <p className="text-xs text-red-700">{paymentError}</p>
              <Button variant="outline" size="sm" onClick={() => setPaymentError(null)} className="mt-2">
                Dismiss
              </Button>
            </div>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
          <main className="space-y-6">
            <Card className="border-blue-200 bg-blue-50/60">
              <CardContent className="pt-5">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-blue-900">
                      {isRespondent ? 'Your response workspace' : 'Your private workspace'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {isRespondent
                        ? 'Draft your own side of the dispute. Your brief is autosaved and will update the shared dispute timeline.'
                        : 'Draft your brief here. It autosaves every 30 seconds and can be submitted once complete.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {SECTION_KEYS.map((key) => {
              const wordCount = countWords(sections[key]);
              return (
                <Card key={key}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <CardTitle className="text-base">{SECTION_LABELS[key]}</CardTitle>
                      <span className="text-xs text-muted-foreground">{wordCount} words</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Textarea
                      id={key}
                      value={sections[key]}
                      onChange={(e) => handleSectionChange(key, e.target.value)}
                      onBlur={() => {
                        const hasContent = Object.values(sections).some((s) => s.trim().length > 0);
                        if (partyId && hasContent && !briefSubmitted) {
                          handleSaveDraft();
                        }
                      }}
                      disabled={briefSubmitted}
                      rows={8}
                      className="min-h-[180px] resize-y"
                      placeholder={`Write your ${SECTION_LABELS[key].toLowerCase()} here...`}
                    />
                  </CardContent>
                </Card>
              );
            })}

            {briefSubmitted && (
              <Card className="border-green-200 bg-green-50/70">
                <CardContent className="pt-5 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">Brief Submitted</p>
                    <p className="text-xs text-green-700 mt-1">
                      This brief is sealed and can no longer be edited.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </main>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto xl:pr-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Invitation
                </CardTitle>
                <CardDescription>
                  {isInitiator
                    ? 'Invite one counterparty by email. You can delete the active invite and re-send another one.'
                    : 'This is the invite that brought you into the dispute.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isInitiator && !invitationAccepted && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (inviteEmail.trim()) inviteMutation.mutate(inviteEmail.trim());
                    }}
                    className="space-y-3"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail" className="text-sm font-medium">Invite by email</Label>
                      <div className="flex gap-2">
                        <Input
                          id="inviteEmail"
                          type="email"
                          placeholder="counterparty@example.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          className="flex-1 text-sm"
                          required
                        />
                        <Button
                          type="submit"
                          size="sm"
                          disabled={inviteMutation.isPending || !inviteEmail.trim()}
                          className="whitespace-nowrap gap-2"
                        >
                          {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Send
                        </Button>
                      </div>
                    </div>
                    {activeInvitation && (
                      <div className="p-3 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground">
                        One invitation is already active. Delete it first if you want to invite someone else.
                      </div>
                    )}
                  </form>
                )}

                {respondentParty && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium truncate">{respondentParty.invitationEmail}</span>
                        <Badge variant={invitationAccepted ? 'default' : 'secondary'} className="capitalize">
                          {respondentParty.invitationStatus?.toLowerCase() || 'not sent'}
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between gap-3">
                          <span>Joined as</span>
                          <span className="font-medium text-foreground capitalize">{respondentParty.role.toLowerCase()}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Joined state</span>
                          <span className="font-medium text-foreground">
                            {invitationAccepted ? 'Joined' : activeInvitation ? 'Pending' : invitationExpired ? 'Expired' : 'Not invited'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {activeInvitation && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyLink(activeInvitation.invitationToken || '')}
                          className="gap-2"
                          disabled={!activeInvitation.invitationToken}
                        >
                          <Copy className="h-4 w-4" />
                          Copy link
                        </Button>
                        {isInitiator && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteInvitation(activeInvitation.invitationToken || '')}
                            className="gap-2 text-red-600 hover:text-red-700"
                            disabled={!activeInvitation.invitationToken || expireMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        )}
                      </div>
                    )}

                    {invitationAccepted && (
                      <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-sm text-green-900">
                        Your counterparty has joined and can draft their own brief in the same workspace.
                      </div>
                    )}
                  </div>
                )}

                {!respondentParty && (
                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    No counterparty has joined yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment
                </CardTitle>
                <CardDescription>
                  {isPaid
                    ? 'Payment completed'
                    : `Complete payment of $${Number(dispute?.priceUsd || 99).toFixed(2)} to activate the dispute`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPaid ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Paid</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      ${Number(dispute?.priceUsd || 99).toFixed(2)} • {(dispute?.pricingTier || 'Standard').toLowerCase()}
                    </p>
                  </div>
                ) : showPayment ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg border border-border">
                      <div className="flex justify-between text-sm mb-2 gap-4">
                        <span className="text-muted-foreground">Dispute</span>
                        <span className="font-medium truncate max-w-[180px]">{dispute?.title}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2 gap-4">
                        <span className="text-muted-foreground">Tier</span>
                        <span className="font-medium capitalize">{dispute?.pricingTier || 'Standard'}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t">
                        <span>Total</span>
                        <span className="text-primary">${Number(dispute?.priceUsd || paymentAmount / 100).toFixed(2)}</span>
                      </div>
                    </div>

                    {isPaymentLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">Initializing payment...</span>
                      </div>
                    )}

                    {paymentError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {paymentError}
                      </div>
                    )}

                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Demo mode: click below to simulate a successful payment.
                      </p>
                      <Button
                        onClick={handleConfirmPayment}
                        disabled={!paymentIntentId || isPaymentLoading}
                        className="w-full"
                      >
                        {isPaymentLoading ? 'Processing...' : `Pay $${Number(dispute?.priceUsd || paymentAmount / 100).toFixed(2)} (Demo)`}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      onClick={handleContinueToPayment}
                      disabled={!needsPayment}
                      className="w-full"
                    >
                      Continue to Payment
                    </Button>
                    {!isInitiator && (
                      <p className="text-xs text-muted-foreground">
                        Payment is controlled by the initiator. You can still draft and submit your brief.
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {(dispute.state === 'UNDER_ANALYSIS' || dispute.state === 'COMPLETED') && (
              <Card className="border-blue-200 bg-blue-50/60">
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Analysis ready</p>
                      <p className="text-xs text-blue-700">
                        The full evaluation can now be opened from the analysis page.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/dashboard/disputes/${disputeId}/analysis`)}
                  >
                    Generate Full Analysis
                  </Button>
                </CardContent>
              </Card>
            )}

            <DisputeStatusPanel dispute={dispute} currentUserId={user?.id} />

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  What happens next
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>1. Save or submit your brief.</p>
                <p>2. Invite a counterparty, or proceed solo.</p>
                <p>3. Complete payment to unlock analysis.</p>
                <p>4. View the opinion once evaluation completes.</p>
              </CardContent>
            </Card>
          </aside>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/dashboard/disputes/${disputeId}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dispute
          </Button>
        </div>
      </div>
    </div>
  );
}
