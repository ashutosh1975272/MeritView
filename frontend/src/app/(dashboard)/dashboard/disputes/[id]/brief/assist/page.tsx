'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const SECTION_LABELS: Record<string, string> = {
  factualBackground: 'Factual Background',
  myPosition: 'My Position',
  supportingArguments: 'Supporting Arguments',
  acknowledgmentOfOpposing: 'Acknowledgment of Opposing Position',
  desiredResolution: 'Desired Resolution',
};

export default function BriefAssistPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSession();
  }, [disputeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function initSession() {
    try {
      setIsLoading(true);
      const disputesResponse = await apiClient.getDisputes();
      const disputes = Array.isArray(disputesResponse) ? disputesResponse : (disputesResponse as any).data || [];
      const dispute = disputes.find((d: any) => d.id === disputeId);

      if (!dispute) {
        setError('Dispute not found');
        return;
      }

      const user = await apiClient.get('/users/me');
      const myParty = dispute.parties?.find((p: any) => p.userId === (user as any).id);

      if (!myParty) {
        setError('You are not a party to this dispute');
        return;
      }

      setPartyId(myParty.id);

      const session = await apiClient.post(
        `/disputes/${disputeId}/parties/${myParty.id}/brief-prep/session`,
        {}
      );

      setSessionId(session.id);
      setMessages(session.messages || []);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize session');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || !sessionId || !partyId || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const result = await apiClient.post(
        `/disputes/${disputeId}/parties/${partyId}/brief-prep/session/${sessionId}/message`,
        { content: input }
      );

      setMessages(prev => [...prev, result.userMessage, result.assistantMessage]);
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function extractSectionContent(text: string): { section: string; content: string } | null {
    for (const key of Object.keys(SECTION_LABELS)) {
      const label = SECTION_LABELS[key].toLowerCase();
      const patterns = [
        new RegExp(`(?:^|\\n)\\*\\*${label}\\*\\*[\\s\\:]*([\\s\\S]*?)(?=\\n\\*\\*|$)`),
        new RegExp(`(?:^|\\n)${label}[\\s\\:]*([\\s\\S]*?)(?=\\n\\w|$)`, 'i'),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1].trim().length > 20) {
          return { section: key, content: match[1].trim() };
        }
      }
    }
    return null;
  }

  function handleUseResponse(messageContent: string) {
    const sectionContent = extractSectionContent(messageContent);
    if (sectionContent) {
      setCompletedSections(prev =>
        prev.includes(sectionContent!.section) ? prev : [...prev, sectionContent!.section]
      );
    }
    router.push(`/dashboard/disputes/${disputeId}/brief`);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error && messages.length === 0) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
        <div className="bg-destructive/10 border border-destructive rounded-lg p-6 text-center">
          <p className="text-destructive font-medium">{error}</p>
          <button
            onClick={initSession}
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
          <h1 className="text-2xl font-bold tracking-tight">AI Brief Assistant</h1>
          <p className="text-muted-foreground mt-1">
            Get AI-guided help drafting your brief sections.
          </p>
        </div>
        <button
          onClick={() => router.push(`/dashboard/disputes/${disputeId}/brief`)}
          className="px-4 py-2 text-sm border border-border rounded-md hover:bg-accent transition-colors"
        >
          Manual Brief
        </button>
      </div>

      <div className="flex gap-2">
        {Object.entries(SECTION_LABELS).map(([key, label]) => (
          <div
            key={key}
            className={`text-xs px-2 py-1 rounded-full ${
              completedSections.includes(key)
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {completedSections.includes(key) ? '✓ ' : ''}{label.split(' ')[0]}
          </div>
        ))}
      </div>

      <div className="border border-border rounded-lg bg-card h-[60vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-xs mt-1 ${
                  msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                }`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
                {msg.role === 'assistant' && i === messages.length - 1 && (
                  <button
                    onClick={() => handleUseResponse(msg.content)}
                    className="mt-2 text-xs font-medium text-primary bg-primary-foreground/10 px-2 py-1 rounded hover:bg-primary-foreground/20 transition-colors"
                  >
                    Use Response
                  </button>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-2 mb-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your dispute or answer the AI's questions..."
              rows={2}
              className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              disabled={isSending}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 self-end"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
