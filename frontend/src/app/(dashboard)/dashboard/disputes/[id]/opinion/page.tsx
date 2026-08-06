'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Download, FileText, Users, Zap, CheckCircle2, ArrowLeft, CreditCard } from 'lucide-react';

interface PartyAnalysis {
  strongest_arguments: string[];
  weakest_points: string[];
  factual_concerns: string[];
}

interface ConfidenceIndicators {
  overall_confidence: number;
  evaluator_agreement: number | null;
}

interface SuggestedConsiderations {
  party_a: string[];
  party_b: string[];
}

interface RestructuredOpinion {
  id: string;
  dispute_id: string;
  generated_at: string;
  prompt_version: string;
  evaluators_used: string[];
  executive_summary: string;
  key_issues: Array<{ issue: string; agreement_level: string }>;
  party_a_analysis: PartyAnalysis;
  party_b_analysis: PartyAnalysis;
  comparative_assessment: string;
  confidence_indicators: ConfidenceIndicators;
  suggested_considerations: SuggestedConsiderations;
  disclaimers: string[];
}

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');

function formatConfidence(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

function getConfidenceColor(score: number): string {
  if (score >= 0.7) return 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-900/50';
  if (score >= 0.4) return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-900/50';
  return 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-900/50';
}

function getConfidenceLabel(score: number): string {
  if (score >= 0.7) return 'High Confidence';
  if (score >= 0.4) return 'Moderate Confidence';
  return 'Low Confidence';
}

function Disclaimers({ disclaimers }: { disclaimers: string[] }) {
  if (!disclaimers || disclaimers.length === 0) return null;

  return (
    <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50 dark:bg-yellow-900/10">
      <CardContent className="pt-6">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-600 text-sm mb-2">Important Disclaimers</h3>
        <ol className="list-decimal ml-4 space-y-1">
          {disclaimers.map((d, i) => (
            <li key={i} className="text-xs text-yellow-700 dark:text-yellow-600">{d}</li>
          ))}
        </ol>
        <p className="text-xs text-yellow-800 dark:text-yellow-600 font-bold mt-3">
          This is an AI-generated decision support tool, not legal advice.
        </p>
      </CardContent>
    </Card>
  );
}

function PartyAnalysisPanel({ title, analysis, color }: { title: string, analysis: PartyAnalysis, color: 'blue' | 'purple' }) {
  const bgClass = color === 'blue' ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50' : 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-900/50';
  const textTitle = color === 'blue' ? 'text-blue-800 dark:text-blue-400' : 'text-purple-800 dark:text-purple-400';
  const iconColor = color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400';

  return (
    <Card className={`${bgClass}`}>
      <CardHeader>
        <CardTitle className={`text-lg ${textTitle}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            Strongest Arguments
          </h4>
          {analysis.strongest_arguments.length > 0 ? (
            <ul className="list-disc ml-5 space-y-1">
              {analysis.strongest_arguments.map((arg, i) => <li key={i} className="text-sm">{arg}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">None identified</p>}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Weakest Points
          </h4>
          {analysis.weakest_points.length > 0 ? (
            <ul className="list-disc ml-5 space-y-1">
              {analysis.weakest_points.map((arg, i) => <li key={i} className="text-sm">{arg}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">None identified</p>}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Factual Concerns
          </h4>
          {analysis.factual_concerns.length > 0 ? (
            <ul className="list-disc ml-5 space-y-1">
              {analysis.factual_concerns.map((concern, i) => <li key={i} className="text-sm">{concern}</li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">None identified</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function OpinionPage() {
  const params = useParams();
  const disputeId = params.id as string;
  const { accessToken } = useAuthStore();

  const { data: dispute } = useQuery({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.getDispute(disputeId),
    enabled: !!disputeId && !!accessToken,
  });

  const [opinion, setOpinion] = useState<RestructuredOpinion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOpinion = useCallback(async () => {
    if (!accessToken) return;

    try {
      const res = await fetch(`${API_ROOT}/v1/disputes/${disputeId}/opinion`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setOpinion(data.opinion);
        return;
      }

      const err = await res.json().catch(() => ({ error: { message: 'Failed to load opinion' } }));
      throw new Error(err.error?.message || 'Failed to load opinion');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, disputeId]);

  useEffect(() => {
    fetchOpinion();
  }, [fetchOpinion]);

  const handlePdfDownload = async () => {
    if (!accessToken) return;
    setIsPdfLoading(true);

    try {
      const res = await fetch(`${API_ROOT}/v1/disputes/${disputeId}/opinion/pdf`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error('PDF not available');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `opinion-${disputeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Failed to download PDF');
    } finally {
      setIsPdfLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400">
        <h2 className="font-semibold mb-1">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!opinion) return null;

  const confidenceScore = opinion.confidence_indicators.overall_confidence;
  const agreementScore = opinion.confidence_indicators.evaluator_agreement;
  const confidenceColor = getConfidenceColor(confidenceScore);
  const confidenceLabel = getConfidenceLabel(confidenceScore);

  const succeededPayment = dispute?.payments?.find((p: any) => p.status === 'SUCCEEDED');

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/disputes" className="hover:text-foreground transition-colors">
          Disputes
        </Link>
        <span>/</span>
        <span className="text-foreground truncate max-w-[200px]">{dispute?.title || opinion.dispute_id}</span>
      </div>

      {succeededPayment && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Payment Completed</p>
                <p className="text-sm text-green-700">
                  ${Number(succeededPayment.amountUsd).toFixed(2)} • {(dispute?.pricingTier || 'Standard').toLowerCase()} • {new Date(succeededPayment.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opinion of Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated {new Date(opinion.generated_at).toLocaleString()}
          </p>
        </div>
        <Button onClick={handlePdfDownload} disabled={isPdfLoading} className="gap-2">
          <Download className="h-4 w-4" />
          {isPdfLoading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      <Disclaimers disclaimers={opinion.disclaimers} />

      {/* Confidence Meters */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground mb-2">Overall Confidence</span>
              <span className={`text-3xl font-bold ${confidenceColor.split(' ')[0]}`}>
                {formatConfidence(confidenceScore)}
              </span>
              <span className={`text-xs mt-1 px-2 py-0.5 rounded-full ${confidenceColor}`}>
                {confidenceLabel}
              </span>
              <Progress value={confidenceScore * 100} className="h-2 w-full mt-4" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground mb-2">Evaluator Agreement</span>
              <span className="text-3xl font-bold">
                {agreementScore ? formatConfidence(agreementScore) : 'N/A'}
              </span>
              {agreementScore && (
                <>
                  <span className="text-xs mt-1 text-muted-foreground">
                    {agreementScore >= 0.7 ? 'High agreement' : agreementScore >= 0.4 ? 'Moderate agreement' : 'Low agreement'}
                  </span>
                  <Progress value={agreementScore * 100} className="h-2 w-full mt-4" />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary */}
      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{opinion.executive_summary}</p>
        </CardContent>
      </Card>

      {/* Key Issues */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Key Issues</h2>
        <div className="space-y-3">
          {opinion.key_issues.length > 0 ? opinion.key_issues.map((issue, i) => (
            <Card key={i}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{issue.issue}</p>
                  <Badge variant="outline" className="whitespace-nowrap">
                    {issue.agreement_level} agreement
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )) : <p className="text-sm text-muted-foreground">No key issues identified.</p>}
        </div>
      </div>

      {/* Comparative Assessment */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Comparative Assessment</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{opinion.comparative_assessment}</p>
          </CardContent>
        </Card>
      </div>

      {/* Party Analysis */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Party Analysis
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <PartyAnalysisPanel title="Party A Analysis" analysis={opinion.party_a_analysis} color="blue" />
          <PartyAnalysisPanel title="Party B Analysis" analysis={opinion.party_b_analysis} color="purple" />
        </div>
      </div>

      {/* Suggested Considerations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Suggested Considerations</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For Party A</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc ml-5 space-y-1">
                {opinion.suggested_considerations.party_a.map((sg, i) => <li key={i} className="text-sm">{sg}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">For Party B</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc ml-5 space-y-1">
                {opinion.suggested_considerations.party_b.map((sg, i) => <li key={i} className="text-sm">{sg}</li>)}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-muted-foreground text-center pt-8 border-t border-border space-y-1">
        <p className="flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          Evaluators used: {opinion.evaluators_used.length}
        </p>
        <p className="flex items-center justify-center gap-1">
          <FileText className="h-3 w-3" />
          Prompts: {opinion.prompt_version}
        </p>
        <p>Dispute ID: {opinion.dispute_id}</p>
      </div>
    </div>
  );
}
