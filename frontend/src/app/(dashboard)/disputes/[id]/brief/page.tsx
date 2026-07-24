'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from '@/components/ui/button';

const SECTIONS: { key: BriefField; label: string }[] = [
  { key: 'factual_background', label: 'Factual Background' },
  { key: 'my_position', label: 'My Position' },
  { key: 'supporting_arguments', label: 'Supporting Arguments' },
  { key: 'acknowledgment_of_opposing', label: 'Acknowledgment of Opposing Arguments' },
  { key: 'desired_resolution', label: 'Desired Resolution' },
];

type BriefField = 'factual_background' | 'my_position' | 'supporting_arguments' | 'acknowledgment_of_opposing' | 'desired_resolution';

interface BriefData {
  id: string;
  dispute_id: string;
  party_id: string;
  factual_background: string;
  my_position: string;
  supporting_arguments: string;
  acknowledgment_of_opposing: string;
  desired_resolution: string;
  status: 'draft' | 'submitted' | 'sealed';
  created_at: string;
  updated_at: string;
  submitted_at?: string;
}

interface DisputeDetail {
  id: string;
  parties: { id: string; user_id: string; role: string }[];
}

const WORD_LIMIT_WARN = 4500;
const WORD_LIMIT_HARD = 5000;

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'submitted':
      return 'bg-blue-100 text-blue-800';
    case 'sealed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const disputeId = params.id as string;

  const [formData, setFormData] = useState<Record<BriefField, string>>({
    factual_background: '',
    my_position: '',
    supporting_arguments: '',
    acknowledgment_of_opposing: '',
    desired_resolution: '',
  });
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const disputeQuery = useQuery<DisputeDetail>({
    queryKey: ['dispute', disputeId],
    queryFn: () => apiClient.get<DisputeDetail>(`/disputes/${disputeId}`),
    enabled: !!disputeId,
  });

  const party = disputeQuery.data?.parties?.find((p) => p.user_id === user?.id);
  const partyId = party?.id;

  const briefQuery = useQuery<BriefData>({
    queryKey: ['brief', disputeId, partyId],
    queryFn: () => apiClient.get<BriefData>(`/disputes/${disputeId}/parties/${partyId}/brief`),
    enabled: !!disputeId && !!partyId,
  });

  useEffect(() => {
    if (briefQuery.data && !initialLoadDone) {
      setFormData({
        factual_background: briefQuery.data.factual_background || '',
        my_position: briefQuery.data.my_position || '',
        supporting_arguments: briefQuery.data.supporting_arguments || '',
        acknowledgment_of_opposing: briefQuery.data.acknowledgment_of_opposing || '',
        desired_resolution: briefQuery.data.desired_resolution || '',
      });
      setInitialLoadDone(true);
    }
  }, [briefQuery.data, initialLoadDone]);

  const isSubmitted = briefQuery.data?.status === 'submitted' || briefQuery.data?.status === 'sealed';

  const totalWords = Object.values(formData).reduce((sum, val) => sum + wordCount(val), 0);
  const allSectionsFilled = SECTIONS.every((s) => wordCount(formData[s.key]) > 0);
  const overWarning = totalWords >= WORD_LIMIT_WARN;
  const overLimit = totalWords >= WORD_LIMIT_HARD;

  const handleChange = useCallback((field: BriefField, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      apiClient.put<BriefData>(`/disputes/${disputeId}/parties/${partyId}/brief`, data),
    onSuccess: (result) => {
      setLastSaved(new Date().toLocaleTimeString());
      queryClient.setQueryData(['brief', disputeId, partyId], result);
    },
  });

  const submitBriefMutation = useMutation({
    mutationFn: () =>
      apiClient.post<BriefData>(`/disputes/${disputeId}/parties/${partyId}/brief/submit`, {}),
    onSuccess: (result) => {
      queryClient.setQueryData(['brief', disputeId, partyId], result);
      setShowSubmitDialog(false);
    },
  });

  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSubmitted) return;
    autoSaveRef.current = setInterval(() => {
      saveDraftMutation.mutate(formData);
    }, 30000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [isSubmitted, formData]);

  const handleSaveDraft = () => {
    saveDraftMutation.mutate(formData);
  };

  const handleSubmitConfirm = () => {
    submitBriefMutation.mutate();
  };

  const isLoading = disputeQuery.isLoading || briefQuery.isLoading;
  const isError = disputeQuery.isError || briefQuery.isError;
  const errorMessage = disputeQuery.error instanceof Error ? disputeQuery.error.message
    : briefQuery.error instanceof Error ? briefQuery.error.message
    : 'Failed to load brief';

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
        <div className="h-4 w-96 bg-slate-200 rounded animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
            <div className="h-32 w-full bg-slate-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-red-600 mb-4">{errorMessage}</p>
        <Button variant="outline" onClick={() => { disputeQuery.refetch(); briefQuery.refetch(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!partyId) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <p className="text-red-600">You are not a party to this dispute.</p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Brief Submitted</h1>
          <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(briefQuery.data!.status)}`}>
            {briefQuery.data!.status.charAt(0).toUpperCase() + briefQuery.data!.status.slice(1)}
          </span>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <p className="text-green-800 text-lg font-semibold mb-2">Your brief has been submitted successfully.</p>
          <p className="text-green-700 text-sm">It can no longer be edited.</p>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.key} className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm text-slate-500 mb-2">{section.label}</h3>
              <p className="text-slate-900 whitespace-pre-wrap">{formData[section.key]}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <Button onClick={() => router.push(`/disputes/${disputeId}/payment`)}>
            Proceed to Payment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Brief Preparation</h1>
          <p className="text-slate-500 text-sm mt-1">
            Provide your account of the facts and your position for analysis.
          </p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass(briefQuery.data?.status || 'draft')}`}>
          {(briefQuery.data?.status || 'draft').charAt(0).toUpperCase() + (briefQuery.data?.status || 'draft').slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className={overLimit ? 'text-red-600 font-semibold' : overWarning ? 'text-yellow-600 font-semibold' : 'text-slate-500'}>
            Total words: {totalWords} {overLimit ? '(limit reached)' : overWarning ? '(warning: approaching 5000 limit)' : ''}
          </span>
        </div>
        {lastSaved && (
          <span className="text-slate-400 text-xs">Last saved: {lastSaved}</span>
        )}
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {SECTIONS.map((section) => {
          const wc = wordCount(formData[section.key]);
          return (
            <div key={section.key}>
              <label htmlFor={`field-${section.key}`} className="block text-sm font-medium text-slate-700 mb-1">
                {section.label}
              </label>
              <textarea
                id={`field-${section.key}`}
                value={formData[section.key]}
                onChange={(e) => handleChange(section.key, e.target.value)}
                disabled={isSubmitted}
                rows={6}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400 resize-y"
              />
              <div className="text-right text-xs text-slate-400 mt-1">
                {wc} {wc === 1 ? 'word' : 'words'}
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={saveDraftMutation.isPending}
            disabled={overLimit}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowSubmitDialog(true)}
            disabled={!allSectionsFilled || overLimit || submitBriefMutation.isPending}
            loading={submitBriefMutation.isPending}
          >
            Submit Brief
          </Button>
        </div>
      </form>

      {showSubmitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4">
            <h2 className="text-lg font-semibold">Submit Brief</h2>
            <p className="text-sm text-slate-600">This cannot be edited after submission. Are you sure you want to submit your brief?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitConfirm}
                loading={submitBriefMutation.isPending}
              >
                Confirm Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
