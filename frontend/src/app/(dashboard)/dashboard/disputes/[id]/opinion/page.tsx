'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

interface OpinionContent {
  ruling: string;
  reasoning: string;
  strengths: Array<{ party: string; argument: string; weight: number }>;
  weaknesses: Array<{ party: string; argument: string; weight: number }>;
  applicableLaw: string;
  decision: string;
  confidenceScore: number;
}

interface OpinionResponse {
  id: string;
  disputeId: string;
  content: OpinionContent;
  evalPromptVersion: string;
  aggPromptVersion: string;
  evaluatorOutputIds: string[];
  interEvaluatorAgreement: number | null;
  overallConfidence: number | null;
  aggregatorProvider: string;
  aggregatorModelId: string;
  totalCostUsd: number;
  pdfStorageKey: string | null;
  pdfGeneratedAt: string | null;
  disclaimers: string[];
  createdAt: string;
  deliveredAt: string | null;
}

interface OpinionStatus {
  disputeId: string;
  status: 'pending' | 'delivered' | 'error';
  deliveredAt: string | null;
  pdfAvailable: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.7) return 'text-green-700 bg-green-50 border-green-200';
  if (score >= 0.4) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
  return 'text-red-700 bg-red-50 border-red-200';
}

function Disclaimers({ disclaimers }: { disclaimers: string[] }) {
  if (!disclaimers || disclaimers.length === 0) return null;

  return (
    <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
      <h3 className="font-semibold text-yellow-800 text-sm mb-2">Important Disclaimers</h3>
      <ol className="list-decimal ml-4 space-y-1">
        {disclaimers.map((d, i) => (
          <li key={i} className="text-xs text-yellow-700">{d}</li>
        ))}
      </ol>
    </div>
  );
}

function OpinionContent({ content }: { content: OpinionContent }) {
  return (
    <div className="space-y-6">
      <div className="p-4 border border-primary/20 bg-primary/5 rounded-lg">
        <h2 className="font-semibold mb-2">Ruling</h2>
        <p>{content.ruling}</p>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Reasoning</h2>
        <p className="text-muted-foreground">{content.reasoning}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-2 text-green-700">Strengths</h3>
          {content.strengths.length > 0 ? (
            <ul className="space-y-2">
              {content.strengths.map((s, i) => (
                <li key={i} className="p-3 border border-green-200 bg-green-50 rounded-lg text-sm">
                  <span className="font-medium capitalize">{s.party}:</span> {s.argument}
                  <div className="text-xs text-muted-foreground mt-1">Weight: {s.weight}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None identified</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2 text-red-700">Weaknesses</h3>
          {content.weaknesses.length > 0 ? (
            <ul className="space-y-2">
              {content.weaknesses.map((w, i) => (
                <li key={i} className="p-3 border border-red-200 bg-red-50 rounded-lg text-sm">
                  <span className="font-medium capitalize">{w.party}:</span> {w.argument}
                  <div className="text-xs text-muted-foreground mt-1">Weight: {w.weight}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None identified</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Applicable Law</h2>
        <p className="text-muted-foreground">{content.applicableLaw}</p>
      </div>

      <div>
        <h2 className="font-semibold mb-2">Decision</h2>
        <p className="text-muted-foreground">{content.decision}</p>
      </div>

      <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
        <div>
          <span className="text-sm text-muted-foreground">Confidence Score</span>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mt-1 ${getConfidenceColor(content.confidenceScore)}`}>
            {formatConfidence(content.confidenceScore)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OpinionPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const { accessToken } = useAuthStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  const [opinion, setOpinion] = useState<OpinionResponse | null>(null);
  const [status, setStatus] = useState<OpinionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  const fetchOpinion = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${BASE_URL}/v1/disputes/${disputeId}/opinion`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOpinion(data);
        setStatus({
          disputeId,
          status: 'delivered',
          deliveredAt: data.deliveredAt,
          pdfAvailable: !!data.pdfStorageKey,
        });
        setShowNotification(true);
        setTimeout(() => setShowNotification(false), 5000);
        return data;
      }

      if (res.status === 404) {
        return null;
      }

      const err = await res.json().catch(() => ({ error: { message: 'Failed to load opinion' } }));
      throw new Error(err.error?.message || 'Failed to load opinion');
    } catch (err) {
      if (err instanceof Response) return null;
      throw err;
    }
  }, [accessToken, disputeId]);

  const fetchStatus = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${BASE_URL}/v1/disputes/${disputeId}/opinion/status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // ignore polling errors
    }
  }, [accessToken, disputeId]);

  useEffect(() => {
    if (!accessToken) return;

    fetchOpinion()
      .then((result) => {
        if (!result) {
          return fetchStatus();
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setIsLoading(false));
  }, [accessToken, fetchOpinion, fetchStatus]);

  useEffect(() => {
    if (!accessToken || !disputeId) return;

    const eventSource = new EventSource(
      `${BASE_URL}/v1/disputes/${disputeId}/opinion/stream?token=${accessToken}`
    );
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data);
      } catch {
        // ignore parse errors
      }
    });

    eventSource.addEventListener('pdf-ready', (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus((prev) => prev ? { ...prev, pdfAvailable: true } : prev);
      } catch {
        // ignore parse errors
      }
    });

    eventSource.addEventListener('delivered', () => {
      fetchOpinion().then((result) => {
        if (result) {
          setShowNotification(true);
          setTimeout(() => setShowNotification(false), 5000);
        }
      });
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [accessToken, disputeId, fetchOpinion]);

  const handlePdfDownload = async () => {
    if (!accessToken) return;
    setIsPdfLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/v1/disputes/${disputeId}/opinion/pdf`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: 'PDF not available' } }));
        throw new Error(err.error?.message || 'PDF not available');
      }

      const { downloadUrl } = await res.json();

      const pdfRes = await fetch(`${BASE_URL}/storage/${downloadUrl}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!pdfRes.ok) {
        throw new Error('Failed to download PDF');
      }

      const blob = await pdfRes.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `opinion-${disputeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Opinion of Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dispute ID: {disputeId}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {status?.status === 'delivered' && (
            <>
              {status.pdfAvailable ? (
                <button
                  onClick={handlePdfDownload}
                  disabled={isPdfLoading}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                >
                  {isPdfLoading ? (
                    <>
                      <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>Download PDF</>
                  )}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground">PDF not available</span>
              )}
            </>
          )}
        </div>
      </div>

      {showNotification && opinion && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-fade-in">
          Your opinion is now available for review.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4 animate-pulse">
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded" />
            <div className="h-32 bg-gray-200 rounded" />
          </div>
          <div className="h-20 bg-gray-200 rounded" />
        </div>
      )}

      {!isLoading && !opinion && status?.status === 'pending' && (
        <div className="p-12 rounded-lg border border-border text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-medium">Opinion Being Generated</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your opinion is being prepared. This typically takes a few moments.
            You will be notified when it is ready.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Listening for updates via SSE...
          </div>
        </div>
      )}

      {!isLoading && opinion && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-3 border rounded-lg bg-card text-center">
              <div className="text-xs text-muted-foreground">Aggregator</div>
              <div className="font-medium text-sm mt-1">{opinion.aggregatorProvider}</div>
              <div className="text-xs text-muted-foreground truncate">{opinion.aggregatorModelId}</div>
            </div>
            {opinion.interEvaluatorAgreement !== null && (
              <div className="p-3 border rounded-lg bg-card text-center">
                <div className="text-xs text-muted-foreground">Inter-Evaluator Agreement</div>
                <div className="font-medium text-sm mt-1">{(opinion.interEvaluatorAgreement * 100).toFixed(1)}%</div>
              </div>
            )}
            {opinion.overallConfidence !== null && (
              <div className="p-3 border rounded-lg bg-card text-center">
                <div className="text-xs text-muted-foreground">Overall Confidence</div>
                <div className="font-medium text-sm mt-1">{(opinion.overallConfidence * 100).toFixed(1)}%</div>
              </div>
            )}
            <div className="p-3 border rounded-lg bg-card text-center">
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="font-medium text-sm mt-1">${opinion.totalCostUsd.toFixed(2)}</div>
            </div>
          </div>

          <Disclaimers disclaimers={opinion.disclaimers} />

          <div className="p-3 border rounded-lg bg-card">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Eval Prompt: v{opinion.evalPromptVersion}</span>
              <span>Agg Prompt: v{opinion.aggPromptVersion}</span>
              <span>{opinion.evaluatorOutputIds.length} evaluator outputs</span>
              {opinion.createdAt && (
                <span>Created: {new Date(opinion.createdAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          <OpinionContent content={opinion.content} />

          <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
            <p className="text-xs text-yellow-700">
              This opinion was generated on {new Date(opinion.createdAt).toLocaleString()}.
              {opinion.deliveredAt && ` It was delivered on ${new Date(opinion.deliveredAt).toLocaleString()}.`}
            </p>
          </div>
        </>
      )}

      {!isLoading && status?.status === 'error' && !opinion && (
        <div className="p-8 rounded-lg border border-red-200 bg-red-50 text-center">
          <h2 className="text-lg font-medium text-red-700">Opinion Generation Failed</h2>
          <p className="text-sm text-red-600 mt-2">
            There was an error generating the opinion. Please contact support.
          </p>
        </div>
      )}
    </div>
  );
}
