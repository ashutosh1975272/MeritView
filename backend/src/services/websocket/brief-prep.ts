import { logger } from '../../utils/logger';
import { WebSocket, WebSocketServer } from 'ws';

interface BriefPrepSession {
  partyId: string;
  disputeId: string;
  ws: WebSocket;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const activeSessions = new Map<string, BriefPrepSession>();

export function createBriefPrepWebSocketServer(server: any): WebSocketServer {
  const wss = new WebSocketServer({ server, path: '/v2/brief-prep' });

  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url || '', 'http://localhost');
    const partyId = url.searchParams.get('partyId');
    const disputeId = url.searchParams.get('disputeId');

    if (!partyId || !disputeId) {
      ws.close(4001, 'partyId and disputeId required');
      return;
    }

    const sessionId = `${disputeId}:${partyId}`;
    const session: BriefPrepSession = {
      partyId,
      disputeId,
      ws,
      messages: [],
    };

    activeSessions.set(sessionId, session);
    logger.info('Brief prep WebSocket connected', { partyId, disputeId });

    ws.on('message', async (raw: Buffer) => {
      try {
        const data = JSON.parse(raw.toString());

        if (data.type === 'prompt_suggestion') {
          const suggestion = await generateSuggestion(data.context);
          ws.send(JSON.stringify({ type: 'suggestion', content: suggestion }));
        } else if (data.type === 'section_suggestion') {
          const sectionContent = await generateSectionContent(data.section, data.context);
          ws.send(JSON.stringify({ type: 'section_content', section: data.section, content: sectionContent }));
        } else if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error: any) {
        logger.warn('Brief prep WebSocket message error', { error: error.message });
        ws.send(JSON.stringify({ type: 'error', message: error.message }));
      }
    });

    ws.on('close', () => {
      activeSessions.delete(sessionId);
      logger.info('Brief prep WebSocket disconnected', { partyId, disputeId });
    });

    ws.on('error', (error: Error) => {
      logger.error('Brief prep WebSocket error', error, { partyId, disputeId });
    });

    ws.send(JSON.stringify({
      type: 'connected',
      message: 'AI-assisted brief preparation is active',
    }));
  });

  return wss;
}

async function generateSuggestion(context: string): Promise<string> {
  return `Based on your input, consider addressing the following point: [AI suggestion for: "${context.slice(0, 100)}..."]`;
}

async function generateSectionContent(section: string, context: string): Promise<string> {
  const templates: Record<string, string> = {
    'statement_of_facts': 'Describe the key facts of the dispute chronologically...',
    'legal_arguments': 'Present your main legal arguments...',
    'evidence_summary': 'Summarize the key evidence supporting your position...',
    'requested_outcome': 'State clearly what outcome you are seeking...',
    'supporting_documents': 'List documents that support your case...',
  };

  return templates[section] || `Content for section "${section}" based on: ${context.slice(0, 200)}`;
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}
