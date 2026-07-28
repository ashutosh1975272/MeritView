'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { DocumentUploader } from '@/components/DocumentUploader';

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
const WARNING_WORDS = 4500;
const AUTOSAVE_INTERVAL = 30000;

function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const disputeId = params.id as string;

  const [sections, setSections] = useState<Record<string, string>>({
    factualBackground: '',
    myPosition: '',
    supportingArguments: '',
    acknowledgmentOfOpposing: '',
    desiredResolution: '',
  });
  const [briefStatus, setBriefStatus] = useState<string | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [moderationWarning, setModerationWarning] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadExistingBrief();
  }, [disputeId]);

  useEffect(() => {
    if (briefStatus === 'SEALED' || briefStatus === 'SUBMITTED') return;

    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setInterval(() => {
      const hasContent = Object.values(sections).some(s => s.trim().length > 0);
      if (hasContent && partyId) {
        handleSaveDraft();
      }
    }, AUTOSAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [sections, partyId, briefStatus]);

  async function loadExistingBrief() {
    try {
      setIsLoading(true);
      setError(null);

      const disputesResponse = await apiClient.getDisputes();
      const disputes = Array.isArray(disputesResponse) ? disputesResponse : (disputesResponse as any).data || [];
      const dispute = disputes.find((d: any) => d.id === disputeId);

      if (!dispute) {
        setError('Dispute not found');
        return;
      }

      const myParty = dispute.parties?.find((p: any) => p.userId === user?.id);
      if (!myParty) {
        setError('You are not a party to this dispute');
        return;
      }

      setPartyId(myParty.id);

      try {
        const brief = await apiClient.getBrief(disputeId, myParty.id);
        setSections(brief.sections);
        setBriefStatus(brief.status);
        setBriefId(brief.id);
      } catch (err: any) {
        if (err.status !== 404) {
          throw err;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load brief');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSectionChange = useCallback((key: string, value: string) => {
    const wordCount = countWords(value);
    if (wordCount > MAX_WORDS) return;

    setSections(prev => ({ ...prev, [key]: value }));
    setModerationWarning(null);
  }, []);

  async function handleSaveDraft() {
    if (!partyId) return;
    setIsSaving(true);
    setError(null);
    try {
      const result = await apiClient.saveDraft(disputeId, partyId, sections);
      setBriefStatus(result.status);
      setBriefId(result.id);
      setLastSaved(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit() {
    if (!partyId) return;
    setShowConfirmDialog(false);

    const emptySections = SECTION_KEYS.filter(key => !sections[key] || sections[key].trim().length === 0);
    if (emptySections.length > 0) {
      setError(`Please fill in: ${emptySections.map(k => SECTION_LABELS[k]).join(', ')}`);
      return;
    }

    const totalWords = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);
    if (totalWords > MAX_WORDS) {
      setError(`Total word count exceeds maximum of ${MAX_WORDS}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setModerationWarning(null);
    try {
      const result = await apiClient.submitBrief(disputeId, partyId, sections);
      setBriefStatus(result.status);
      setBriefId(result.id);
      setLastSaved(new Date());
      setSuccess('Brief submitted. Payment required.');
    } catch (err: any) {
      if (err.message?.includes('prohibited') || err.message?.includes('content')) {
        setModerationWarning(err.message);
      }
      setError(err.message || 'Failed to submit brief');
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalWordCount = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);
  const allSectionsFilled = SECTION_KEYS.every(key => sections[key] && sections[key].trim().length > 0);
  const isSealed = briefStatus === 'SEALED' || briefStatus === 'SUBMITTED';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !sections.factualBackground) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={loadExistingBrief}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brief Preparation</h1>
          <p className="text-muted-foreground mt-1">
            Provide your account of the dispute across all 5 sections.
          </p>
        </div>
        {briefStatus && (
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            briefStatus === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
            briefStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>
            {briefStatus === 'DRAFT' ? 'Draft' :
             briefStatus === 'SUBMITTED' ? 'Submitted' :
             'Sealed'}
          </div>
        )}
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {success}
          {isSealed && (
            <p className="mt-2 text-sm">
              <a href={`/disputes/${disputeId}`} className="underline font-medium">Return to dispute</a>
            </p>
          )}
        </div>
      )}

      {moderationWarning && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <strong>Content Warning:</strong> {moderationWarning}
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Total Word Count: <span className={`font-semibold ${
              totalWordCount > WARNING_WORDS ? 'text-destructive' : 'text-foreground'
            }`}>{totalWordCount}</span>
            <span className="text-muted-foreground"> / {MAX_WORDS}</span>
          </p>
          {totalWordCount > WARNING_WORDS && (
            <p className="text-xs text-destructive">
              Warning: Approaching word limit. Maximum is {MAX_WORDS} words.
            </p>
          )}
        </div>
        {lastSaved && (
          <p className="text-xs text-muted-foreground">
            Last saved: {lastSaved.toLocaleTimeString()}
          </p>
        )}
      </div>

      {SECTION_KEYS.map((key) => {
        const wordCount = countWords(sections[key]);
        return (
          <div key={key} className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor={`section-${key}`} className="text-sm font-medium">
                {SECTION_LABELS[key]}
              </label>
              <span className={`text-xs ${
                wordCount > WARNING_WORDS ? 'text-destructive font-medium' : 'text-muted-foreground'
              }`}>
                {wordCount} / {MAX_WORDS} words
              </span>
            </div>
            <textarea
              id={`section-${key}`}
              value={sections[key]}
              onChange={(e) => handleSectionChange(key, e.target.value)}
              disabled={isSealed}
              rows={8}
              className={`w-full px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y ${
                isSealed ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                wordCount > WARNING_WORDS ? 'border-destructive focus:ring-destructive' : ''
              }`}
              placeholder={`Enter your ${SECTION_LABELS[key].toLowerCase()}...`}
            />
          </div>
        );
      })}

      <DocumentUploader 
        disputeId={disputeId} 
        partyId={partyId || ''} 
        isSealed={isSealed} 
      />

      {!isSealed && (
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-6 py-2 border border-border rounded-md bg-card text-foreground font-medium hover:bg-accent transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>

          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!allSectionsFilled || isSubmitting || totalWordCount > MAX_WORDS}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Brief'}
          </button>

          {isSaving && (
            <span className="text-sm text-muted-foreground animate-pulse">Saving...</span>
          )}
        </div>
      )}

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-lg p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-semibold">Confirm Submission</h2>
            <p className="text-muted-foreground">
              This cannot be edited after submission. Please review your brief carefully before confirming.
            </p>
            {moderationWarning && (
              <p className="text-yellow-600 bg-yellow-50 p-3 rounded-md text-sm">
                {moderationWarning}
              </p>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-border rounded-md text-foreground font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="h-20" />
    </div>
  );
}
