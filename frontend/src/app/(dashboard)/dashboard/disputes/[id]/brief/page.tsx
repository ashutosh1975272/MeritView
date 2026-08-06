'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/useAuthStore';
import { DocumentUploader } from '@/components/DocumentUploader';
import { DisputeStatusPanel } from '@/components/disputes/DisputeStatusPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Save, FileText, User, AlertCircle, CheckCircle2, Clock, Sparkles } from 'lucide-react';

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

const ASSISTANT_MODELS = [
  { label: 'Groq Fast', provider: 'groq', model: 'llama-3.1-8b-instant' },
  { label: 'Groq Best', provider: 'groq', model: 'llama-3.3-70b-versatile' },
];

export default function BriefPage() {
  const params = useParams();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const disputeId = params.id as string;
  const [activeMobileView, setActiveMobileView] = useState<'assistant' | 'editor'>('assistant');

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
  const [assistantModel, setAssistantModel] = useState('groq/llama-3.1-8b-instant');
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
        const brief = await apiClient.getBriefMaybe(disputeId, myParty.id);
        if (brief) {
          setSections(brief.sections);
          setBriefStatus(brief.status);
        }
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
      const data = await apiClient.createBriefPrepSession(disputeId, pid, llmProvider, modelPreference);
      setChatSessionId(data.session.id);
      setMessages([{ role: 'assistant', content: data.initial_message || 'Hello! I am your AI assistant. Describe your dispute to me and I will help you draft your brief sections.' }]);
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
      const data = await apiClient.sendBriefPrepMessage(disputeId, partyId, chatSessionId, userMsg);
      setMessages(prev => [...prev, { role: 'assistant', content: data.assistantMessage?.content || data.message?.content || 'I received your message.' }]);
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

    const filledSections = SECTION_KEYS.filter(key => sections[key] && sections[key].trim().length > 0);
    if (filledSections.length === 0) {
      setError('Please add at least one section before submitting');
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
  const filledSections = SECTION_KEYS.filter(key => sections[key] && sections[key].trim().length > 0);
  const hasAnyContent = filledSections.length > 0;
  const canSubmit = hasAnyContent && !isSubmitting && totalWordCount <= MAX_WORDS;
  const isSealed = briefStatus === 'SEALED' || briefStatus === 'SUBMITTED';
  const wordProgress = Math.min((totalWordCount / MAX_WORDS) * 100, 100);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && !sections.factualBackground) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg p-6 text-center max-w-xl mx-auto">
        <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
        <Button onClick={loadExistingBrief} className="mt-4">Retry</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-80px)] overflow-hidden">
      <div className="lg:hidden border-b border-border bg-background px-4 py-3">
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={activeMobileView === 'assistant' ? 'default' : 'outline'}
            onClick={() => setActiveMobileView('assistant')}
            className="gap-2"
          >
            <Bot className="h-4 w-4" />
            AI Assistant
          </Button>
          <Button
            type="button"
            variant={activeMobileView === 'editor' ? 'default' : 'outline'}
            onClick={() => setActiveMobileView('editor')}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Brief Editor
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
      {/* LEFT PANE: AI Chat Assistant */}
      <div className={`${activeMobileView === 'assistant' ? 'flex' : 'hidden'} lg:flex w-full lg:w-1/3 flex-col border-r border-border bg-card shadow-sm h-full min-h-0 rounded-tl-xl rounded-bl-xl overflow-hidden`}>
        <div className="p-4 border-b border-border bg-primary/5 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" aria-hidden="true" />
              AI Assistant
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Private to your side. The other party cannot see this chat.</p>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="assistant-model" className="sr-only">Assistant Model</Label>
            <select
              id="assistant-model"
              value={assistantModel}
              onChange={(event) => handleAssistantModelChange(event.target.value)}
              className="text-xs border-border bg-background rounded-md px-2 py-1"
              aria-label="Assistant model"
            >
              {ASSISTANT_MODELS.map((model) => (
                <option key={`${model.provider}/${model.model}`} value={`${model.provider}/${model.model}`}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <ScrollArea className="flex-1 min-h-0 p-4 space-y-4 bg-muted/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-br-none' 
                  : 'bg-background border border-border shadow-sm rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce delay-150" />
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        <form onSubmit={handleSendMessage} className="p-3 bg-background border-t border-border">
          <div className="flex items-end gap-2">
            <Textarea
              id="chat-input"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask for help drafting a section..."
              className="flex-1 max-h-32 min-h-[44px] bg-muted/50 border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              rows={1}
              aria-label="Chat message"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button type="submit" disabled={!chatInput.trim() || isChatLoading} size="icon" aria-label="Send message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* RIGHT PANE: Brief Editor */}
      <div className={`${activeMobileView === 'editor' ? 'flex' : 'hidden'} lg:flex w-full lg:w-2/3 flex-col h-full min-h-0 bg-background relative`}>
        
        {/* Header */}
        <div className="p-5 border-b border-border bg-background flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div>
            <h1 className="text-xl font-bold">Brief Editor</h1>
            <div className="flex items-center gap-3 mt-1">
              {myRole && (
                <Badge variant="secondary" className="gap-1">
                  <User className="h-3 w-3" />
                  {myRole === 'INITIATOR' ? 'Party A / Initiator' : 'Party B / Respondent'}
                </Badge>
              )}
              <Badge variant={
                briefStatus === 'DRAFT' ? 'outline' :
                briefStatus === 'SUBMITTED' ? 'default' :
                'secondary'
              }>
                {briefStatus || 'DRAFT'}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Words: <span className={totalWordCount > WARNING_WORDS ? 'text-red-500 font-bold' : ''}>{totalWordCount}</span> / {MAX_WORDS}
              </span>
              {lastSaved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Saved {lastSaved.toLocaleTimeString()}</span>}
            </div>
            <Progress value={wordProgress} className="h-1.5 mt-2" />
          </div>

          {!isSealed && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canSubmit}
                title={!hasAnyContent ? 'Add at least one section before submitting' : totalWordCount > MAX_WORDS ? 'Brief exceeds maximum word count' : 'Submit available sections'}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit Available Sections
              </Button>
            </div>
          )}
        </div>

        {/* Form Fields */}
        <ScrollArea className="flex-1 min-h-0 p-6">
          <div className="max-w-3xl space-y-8">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Your private workspace</p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Your draft and AI assistant messages are visible only to you until you submit your final sealed brief.
                    </p>
                    <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-2">
                      All sections are optional. Add only what you want, and the latest saved values will be used when you submit.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {SECTION_KEYS.map((key) => {
              const wordCount = countWords(sections[key]);
              const isOverLimit = wordCount > WARNING_WORDS;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm font-semibold">{SECTION_LABELS[key]}</Label>
                    <span className={`text-xs ${isOverLimit ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                      {wordCount} words
                    </span>
                  </div>
                  <Textarea
                    id={key}
                    value={sections[key]}
                    onChange={(e) => handleSectionChange(key, e.target.value)}
                    disabled={isSealed}
                    rows={6}
                    className={`${isSealed ? 'opacity-60 cursor-not-allowed' : ''} ${isOverLimit ? 'border-red-400 focus-visible:ring-red-500' : ''}`}
                    placeholder={`Write your ${SECTION_LABELS[key].toLowerCase()} here, or ask the AI to help you draft it...`}
                  />
                </div>
              );
            })}

            <Separator />

            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Supporting Documents</h3>
              <DocumentUploader disputeId={disputeId} partyId={partyId || ''} isSealed={isSealed} />
            </div>

            <div className="h-12" />
          </div>
        </ScrollArea>

        {dispute && (
          <div className="hidden xl:block sticky top-24 h-fit">
            <DisputeStatusPanel dispute={dispute} currentUserId={user?.id} />
          </div>
        )}
      </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Submit Available Sections?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Any filled sections will be sealed and submitted, while blank sections stay empty.
            </DialogDescription>
          </DialogHeader>

          <Card className="border-border bg-muted/30">
            <CardContent className="pt-4">
              <p className="font-medium text-sm mb-3">Sections included</p>
              {filledSections.length > 0 ? (
                <ul className="space-y-2">
                  {filledSections.map((key) => (
                    <li key={key} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      {SECTION_LABELS[key]}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No sections have content yet.</p>
              )}
              {totalWordCount > MAX_WORDS && (
                <p className="text-red-600 dark:text-red-400 mt-3 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Word count exceeds the {MAX_WORDS} word limit.
                </p>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {isSubmitting ? 'Submitting...' : canSubmit ? 'Submit Brief' : 'Add Any Content'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
