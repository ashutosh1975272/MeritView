'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DisputeStatusPanel } from '@/components/disputes/DisputeStatusPanel';

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

const API_ROOT = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/v1\/?$/, '');

const ASSISTANT_MODELS = [
  { label: 'GPT-4o', provider: 'openai', model: 'gpt-4o' },
  { label: 'GPT-4o Mini', provider: 'openai', model: 'gpt-4o-mini' },
  { label: 'Fallback', provider: 'fallback', model: 'fallback-local-v1' },
];

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const disputeId = params.id as string;

  const [sections, setSections] = useState<Record<string, string>>({
    factualBackground: '',
    myPosition: '',
    supportingArguments: '',
    acknowledgmentOfOpposing: '',
    desiredResolution: '',
  });
  
  const [briefStatus, setBriefStatus] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [dispute, setDispute] = useState<any>(null);
  const [myRole, setMyRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Chat state
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: string, content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [assistantModel, setAssistantModel] = useState('openai/gpt-4o');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadExistingBrief();
  }, [disputeId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (briefStatus === 'SEALED' || briefStatus === 'SUBMITTED') return;
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setInterval(() => {
      const hasContent = Object.values(sections).some(s => s.trim().length > 0);
      if (hasContent && partyId) handleSaveDraft();
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(autoSaveTimerRef.current as any);
  }, [sections, partyId, briefStatus]);

  async function loadExistingBrief() {
    try {
      setIsLoading(true);
      const disputesResponse = await apiClient.getDisputes();
      const disputes = Array.isArray(disputesResponse) ? disputesResponse : (disputesResponse as any).data || [];
      const dispute = disputes.find((d: any) => d.id === disputeId);

      if (!dispute) throw new Error('Dispute not found');
      setDispute(dispute);

      const myParty = dispute.parties?.find((p: any) => p.userId === user?.id);
      if (!myParty) throw new Error('You are not a party to this dispute');

      setPartyId(myParty.id);
      setMyRole(myParty.role);

      try {
        const brief = await apiClient.getBrief(disputeId, myParty.id);
        setSections(brief.sections);
        setBriefStatus(brief.status);
      } catch (err: any) {
        if (err.status !== 404) throw err;
      }
      
      // Initialize Chat session
      initChatSession(myParty.id);
      
    } catch (err: any) {
      setError(err.message || 'Failed to load brief');
    } finally {
      setIsLoading(false);
    }
  }

  async function initChatSession(pid: string, selected = assistantModel) {
    if (!accessToken) return;
    const [llmProvider, modelPreference] = selected.split('/');
    try {
      const res = await fetch(`${API_ROOT}/v1/disputes/${disputeId}/parties/${pid}/brief/session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ llmProvider, modelPreference })
      });
      if (res.ok) {
        const data = await res.json();
        setChatSessionId(data.session.id);
        setMessages([{ role: 'assistant', content: data.initial_message || 'Hello! I am your AI assistant. Describe your dispute to me and I will help you draft your brief sections.' }]);
      } else {
        const data = await res.json().catch(() => null);
        setMessages([{ role: 'assistant', content: data?.error?.message || 'I could not start the assistant session. Please retry or select another model.' }]);
      }
    } catch (e: any) {
      console.error('Failed to init chat', e);
      setMessages([{ role: 'assistant', content: e?.message || 'I could not start the assistant session. Please retry.' }]);
    }
  }

  async function handleAssistantModelChange(value: string) {
    setAssistantModel(value);
    setChatSessionId(null);
    setMessages([{ role: 'assistant', content: 'Switching assistant model...' }]);
    if (partyId) {
      await initChatSession(partyId, value);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatSessionId || !partyId || !accessToken) return;

    const userMsg = chatInput.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch(`${API_ROOT}/v1/disputes/${disputeId}/parties/${partyId}/brief/session/${chatSessionId}/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMsg })
      });
      
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: data.assistantMessage?.content || data.message?.content || 'I received your message.' }]);
      } else {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message || 'Failed to send');
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: err?.message || 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSectionChange = useCallback((key: string, value: string) => {
    const wordCount = countWords(value);
    if (wordCount > MAX_WORDS) return;
    setSections(prev => ({ ...prev, [key]: value }));
  }, []);

  async function handleSaveDraft() {
    if (!partyId) return;
    setIsSaving(true);
    try {
      const result = await apiClient.saveDraft(disputeId, partyId, sections);
      setBriefStatus(result.status);
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

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await apiClient.submitBrief(disputeId, partyId, sections);
      setBriefStatus(result.brief.status);
      router.push(`/dashboard/disputes/${disputeId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to submit brief');
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalWordCount = SECTION_KEYS.reduce((sum, key) => sum + countWords(sections[key]), 0);
  const allSectionsFilled = SECTION_KEYS.every(key => sections[key] && sections[key].trim().length > 0);
  const missingSections = SECTION_KEYS.filter(key => !sections[key] || sections[key].trim().length === 0);
  const canSubmit = allSectionsFilled && !isSubmitting && totalWordCount <= MAX_WORDS;
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-xl mx-auto">
        <p className="text-red-700 font-medium">{error}</p>
        <button onClick={loadExistingBrief} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">Retry</button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden">
      {/* LEFT PANE: AI Chat Assistant */}
      <div className="w-1/3 flex flex-col border-r border-border bg-card shadow-sm h-full rounded-tl-xl rounded-bl-xl overflow-hidden">
        <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-xl">🤖</span> AI Assistant
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Private to your side. The other party cannot see this chat.</p>
          </div>
          <select
            value={assistantModel}
            onChange={(event) => handleAssistantModelChange(event.target.value)}
            className="text-xs border-border bg-background rounded-md px-2 py-1"
          >
            {ASSISTANT_MODELS.map((model) => (
              <option key={`${model.provider}/${model.model}`} value={`${model.provider}/${model.model}`}>
                {model.label}
              </option>
            ))}
          </select>
        </div>
        
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-white border border-border shadow-sm rounded-bl-none text-foreground'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-white border border-border rounded-xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-border">
          <div className="flex items-end gap-2">
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask for help drafting a section..."
              className="flex-1 max-h-32 min-h-[44px] bg-muted/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="h-[44px] px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT PANE: Brief Editor */}
      <div className="w-2/3 flex flex-col h-full bg-background relative">
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-white flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div>
            <h1 className="text-xl font-bold">Brief Editor</h1>
            <div className="flex items-center gap-3 mt-1">
              {myRole && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {myRole === 'INITIATOR' ? 'Party A / Initiator' : 'Party B / Respondent'}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                briefStatus === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                briefStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                'bg-green-100 text-green-700'
              }`}>
                {briefStatus || 'DRAFT'}
              </span>
              <span className="text-xs text-muted-foreground">
                Words: <span className={totalWordCount > WARNING_WORDS ? 'text-red-500 font-bold' : ''}>{totalWordCount}</span> / {MAX_WORDS}
              </span>
              {lastSaved && <span className="text-xs text-muted-foreground ml-2">Saved {lastSaved.toLocaleTimeString()}</span>}
            </div>
          </div>

          {!isSealed && (
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-muted/50 disabled:opacity-50 transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Draft'}
              </button>
              <button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canSubmit}
                title={!allSectionsFilled ? 'Fill all five brief sections before submitting' : totalWordCount > MAX_WORDS ? 'Brief exceeds maximum word count' : 'Submit final sealed brief'}
                className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                Submit Brief
              </button>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {error && <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="max-w-3xl space-y-8">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <strong>Your private workspace.</strong> Your draft and AI assistant messages are visible only to you until you submit your final sealed brief.
            </div>
            {SECTION_KEYS.map((key) => {
              const wordCount = countWords(sections[key]);
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold">{SECTION_LABELS[key]}</label>
                    <span className="text-xs text-muted-foreground">{wordCount} words</span>
                  </div>
                  <textarea
                    value={sections[key]}
                    onChange={(e) => handleSectionChange(key, e.target.value)}
                    disabled={isSealed}
                    rows={6}
                    className={`w-full px-4 py-3 border rounded-lg bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y ${
                      isSealed ? 'opacity-60 cursor-not-allowed border-border' : 'border-border/60 shadow-sm'
                    } ${wordCount > WARNING_WORDS ? 'border-red-400 focus:ring-red-500' : ''}`}
                    placeholder={`Write your ${SECTION_LABELS[key].toLowerCase()} here, or ask the AI to help you draft it...`}
                  />
                </div>
              );
            })}

            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-semibold mb-4">Supporting Documents</h3>
              <DocumentUploader disputeId={disputeId} partyId={partyId || ''} isSealed={isSealed} />
            </div>
            
            <div className="h-12" />
          </div>

          {dispute && (
            <div className="hidden xl:block sticky top-24 h-fit">
              <DisputeStatusPanel dispute={dispute} currentUserId={user?.id} />
            </div>
          )}
          </div>
        </div>
      </div>

      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">Submit Final Brief?</h2>
            <p className="text-muted-foreground text-sm mb-6">
              This action cannot be undone. Once submitted, your brief will be permanently sealed until all parties have submitted.
            </p>

            <div className="rounded-lg border border-border bg-slate-50 p-3 text-sm mb-6">
              <p className="font-medium text-slate-900 mb-2">Submission checklist</p>
              <ul className="space-y-1">
                {SECTION_KEYS.map((key) => {
                  const complete = !missingSections.includes(key);
                  return (
                    <li key={key} className={complete ? 'text-green-700' : 'text-red-600'}>
                      {complete ? '✓' : '•'} {SECTION_LABELS[key]}
                    </li>
                  );
                })}
              </ul>
              {totalWordCount > MAX_WORDS && (
                <p className="text-red-600 mt-2">Word count exceeds the {MAX_WORDS} word limit.</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-950 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : canSubmit ? 'Submit Final Brief' : 'Complete All Sections'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
