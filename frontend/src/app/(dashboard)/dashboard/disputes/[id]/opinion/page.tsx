'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

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
      <p className="text-xs text-yellow-800 font-bold mt-3">This is an AI-generated decision support tool, not legal advice.</p>
    </div>
  );
}

function PartyAnalysisPanel({ title, analysis, color }: { title: string, analysis: PartyAnalysis, color: 'blue' | 'purple' }) {
  const bg = color === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200';
  const textTitle = color === 'blue' ? 'text-blue-800' : 'text-purple-800';

  return (
    <div className={`p-5 rounded-lg border ${bg} space-y-4`}>
      <h3 className={`font-semibold ${textTitle}`}>{title}</h3>
      
      <div>
        <h4 className="text-sm font-semibold text-green-700 mb-1">Strongest Arguments</h4>
        {analysis.strongest_arguments.length > 0 ? (
          <ul className="list-disc ml-5 space-y-1">
            {analysis.strongest_arguments.map((arg, i) => <li key={i} className="text-sm text-foreground">{arg}</li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None identified</p>}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-red-700 mb-1">Weakest Points</h4>
        {analysis.weakest_points.length > 0 ? (
          <ul className="list-disc ml-5 space-y-1">
            {analysis.weakest_points.map((arg, i) => <li key={i} className="text-sm text-foreground">{arg}</li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None identified</p>}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-amber-700 mb-1">Factual Concerns</h4>
        {analysis.factual_concerns.length > 0 ? (
          <ul className="list-disc ml-5 space-y-1">
            {analysis.factual_concerns.map((concern, i) => <li key={i} className="text-sm text-foreground">{concern}</li>)}
          </ul>
        ) : <p className="text-sm text-muted-foreground">None identified</p>}
      </div>
    </div>
  );
}

export default function OpinionPage() {
  const params = useParams();
  const disputeId = params.id as string;
  const { accessToken } = useAuthStore();

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
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 bg-muted rounded w-1/3 mb-8" />
        <div className="h-24 bg-muted rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-48 bg-muted rounded" />
          <div className="h-48 bg-muted rounded" />
        </div>
        <div className="h-32 bg-muted rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
        <h2 className="font-semibold mb-1">Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!opinion) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-16">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Opinion of Analysis</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated {new Date(opinion.generated_at).toLocaleString()}</p>
        </div>
        <button
          onClick={handlePdfDownload}
          disabled={isPdfLoading}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isPdfLoading ? 'Generating PDF...' : 'Download PDF'}
        </button>
      </div>

      <Disclaimers disclaimers={opinion.disclaimers} />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-4 rounded-lg bg-card border border-border flex flex-col justify-center items-center">
          <span className="text-sm text-muted-foreground">Overall Confidence</span>
          <span className={`text-2xl font-bold mt-1 ${getConfidenceColor(opinion.confidence_indicators.overall_confidence).split(' ')[0]}`}>
            {formatConfidence(opinion.confidence_indicators.overall_confidence)}
          </span>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border flex flex-col justify-center items-center">
          <span className="text-sm text-muted-foreground">Evaluator Agreement</span>
          <span className="text-2xl font-bold mt-1">
            {opinion.confidence_indicators.evaluator_agreement ? formatConfidence(opinion.confidence_indicators.evaluator_agreement) : 'N/A'}
          </span>
        </div>
      </div>

      <div className="p-6 rounded-lg bg-primary/5 border border-primary/20">
        <h2 className="text-xl font-semibold mb-3">Executive Summary</h2>
        <p className="text-foreground whitespace-pre-wrap">{opinion.executive_summary}</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Key Issues</h2>
        <div className="space-y-3">
          {opinion.key_issues.length > 0 ? opinion.key_issues.map((issue, i) => (
            <div key={i} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{issue.issue}</p>
                <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                  {issue.agreement_level} agreement
                </span>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No key issues identified.</p>}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Comparative Assessment</h2>
        <div className="p-6 rounded-lg bg-card border border-border">
          <p className="text-foreground whitespace-pre-wrap">{opinion.comparative_assessment}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PartyAnalysisPanel title="Party A Analysis" analysis={opinion.party_a_analysis} color="blue" />
        <PartyAnalysisPanel title="Party B Analysis" analysis={opinion.party_b_analysis} color="purple" />
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Suggested Considerations</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium mb-2">For Party A</h3>
            <ul className="list-disc ml-5 space-y-1">
              {opinion.suggested_considerations.party_a.map((sg, i) => <li key={i} className="text-sm">{sg}</li>)}
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <h3 className="font-medium mb-2">For Party B</h3>
            <ul className="list-disc ml-5 space-y-1">
              {opinion.suggested_considerations.party_b.map((sg, i) => <li key={i} className="text-sm">{sg}</li>)}
            </ul>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center pt-8 border-t border-border">
        <p>Evaluators used: {opinion.evaluators_used.length}</p>
        <p>Prompts: {opinion.prompt_version}</p>
        <p>Dispute ID: {opinion.dispute_id}</p>
      </div>
    </div>
  );
}
