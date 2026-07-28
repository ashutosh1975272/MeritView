import { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { encrypt, decrypt } from '../../utils/crypto';
import { providerRegistry } from '../../providers/registry';

const env = getEnv();
const SESSION_KEY_ID = 'brief-prep-session';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface WSClient {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  partyId: string;
  disputeId: string;
}

function deserializeMessages(buffer: Buffer): Message[] {
  return JSON.parse(decrypt(buffer, SESSION_KEY_ID));
}

function serializeMessages(messages: Message[]): Buffer {
  return encrypt(JSON.stringify(messages), SESSION_KEY_ID).encryptedContent;
}

const clients = new Map<string, WSClient>();

function authenticate(req: IncomingMessage): { userId: string; sessionId: string } | null {
  const url = new URL(req.url || '', 'http://localhost');

  const protocolHeader = req.headers['sec-websocket-protocol'];
  const token = typeof protocolHeader === 'string' ? protocolHeader.split(',')[0].trim() : null;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; type: string };
    if (decoded.type !== 'access') return null;

    const pathParts = url.pathname.split('/');
    const sessionId = pathParts[pathParts.length - 1];

    return { userId: decoded.userId, sessionId };
  } catch {
    return null;
  }
}

async function handleUserMessage(client: WSClient, content: string): Promise<void> {
  const { ws, sessionId, userId } = client;

  const session = await prisma.briefPrepSession.findUnique({
    where: { id: sessionId },
    include: { party: true },
  });

  if (!session || session.party.userId !== userId) {
    ws.send(JSON.stringify({
      type: 'error',
      error: { code: 'SESSION_NOT_FOUND', message: 'Session not found or access denied' },
    }));
    return;
  }

  if (session.status !== 'ACTIVE') {
    ws.send(JSON.stringify({
      type: 'error',
      error: { code: 'SESSION_INACTIVE', message: 'Session is no longer active' },
    }));
    return;
  }

  const messages = deserializeMessages(session.encryptedMessages);

  const userMessage: Message = {
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  };
  messages.push(userMessage);

  const previousMessages = messages
    .slice(-10)
    .map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
    .join('\n\n');

  const fullPrompt = `Previous conversation:\n${previousMessages}\n\nUser: ${content}\n\nRespond helpfully to guide the user through their brief preparation.`;

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = '';

  try {
    const provider = providerRegistry.get(session.llmProvider);
    const stream = provider.generateCompletionStream(fullPrompt, `You are MeritView's AI Brief Assistant. Your role is to help users prepare a structured legal brief for a dispute analysis.

Guide the user through each of the 5 required sections:
1. Factual Background - What happened, when, and who was involved
2. My Position - What the user believes is the correct outcome
3. Supporting Arguments - Legal or logical reasoning supporting their position
4. Acknowledgment of Opposing Position - Fair summary of the other side's view
5. Desired Resolution - What outcome the user is seeking

Keep responses concise, ask clarifying questions, and help organize thoughts.`);

    for await (const chunk of stream) {
      if (chunk.isFinal) {
        totalInputTokens = chunk.inputTokens || 0;
        totalOutputTokens = chunk.outputTokens || 0;
      } else {
        finalContent += chunk.content;
        ws.send(JSON.stringify({
          type: 'assistant_message_chunk',
          content: chunk.content,
          is_final: false,
        }));
      }
    }
  } catch (error) {
    logger.warn('AI provider failed for brief prep WebSocket, using fallback', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });

    finalContent = 'Thank you. Could you provide more details about that?';
    ws.send(JSON.stringify({
      type: 'assistant_message_chunk',
      content: finalContent,
      is_final: false,
    }));
  }

  const assistantMessage: Message = {
    role: 'assistant',
    content: finalContent,
    timestamp: new Date().toISOString(),
  };
  messages.push(assistantMessage);

  const encryptedMessages = serializeMessages(messages);

  await prisma.briefPrepSession.update({
    where: { id: sessionId },
    data: {
      encryptedMessages,
      messageCount: messages.length,
      lastActivityAt: new Date(),
      totalInputTokens: { increment: totalInputTokens },
      totalOutputTokens: { increment: totalOutputTokens },
    },
  });

  ws.send(JSON.stringify({
    type: 'assistant_message_complete',
    message_id: `${sessionId}-${Date.now()}`,
    total_tokens: totalInputTokens + totalOutputTokens,
  }));
}

async function handleRequestBriefDraft(client: WSClient, currentSections?: Record<string, string>): Promise<void> {
  const { ws, sessionId, userId } = client;

  const session = await prisma.briefPrepSession.findUnique({
    where: { id: sessionId },
    include: { party: true },
  });

  if (!session || session.party.userId !== userId) {
    ws.send(JSON.stringify({
      type: 'error',
      error: { code: 'SESSION_NOT_FOUND', message: 'Session not found or access denied' },
    }));
    return;
  }

  const messages = deserializeMessages(session.encryptedMessages);

  const conversationText = messages
    .map(m => `${m.role === 'assistant' ? 'AI' : 'User'}: ${m.content}`)
    .join('\n\n');

  const sections: Record<string, string> = {
    factual_background: extractSection(conversationText, 'factual background', 'what happened'),
    my_position: extractSection(conversationText, 'my position', 'position'),
    supporting_arguments: extractSection(conversationText, 'supporting argument', 'argument'),
    acknowledgment_of_opposing: extractSection(conversationText, 'oppos', 'other side'),
    desired_resolution: extractSection(conversationText, 'resolution', 'outcome', 'seek'),
  };

  ws.send(JSON.stringify({
    type: 'brief_draft_ready',
    sections: { ...sections, ...currentSections },
  }));
}

function extractSection(text: string, ...keywords: string[]): string {
  const lines = text.split('\n');
  const relevantLines: string[] = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (keywords.some(k => lower.includes(k)) && !lower.startsWith('ai:') && !lower.startsWith('user:')) {
      relevantLines.push(line.trim());
    }
  }
  return relevantLines.length > 0 ? relevantLines.slice(0, 5).join('\n') : '';
}

export function setupBriefPrepWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const auth = authenticate(req);
    if (!auth) {
      ws.send(JSON.stringify({
        type: 'error',
        error: { code: 'AUTHENTICATION_FAILED', message: 'Invalid or missing authentication token' },
      }));
      ws.close();
      return;
    }

    const url = new URL(req.url || '', 'http://localhost');
    const pathParts = url.pathname.split('/');
    const sessionId = auth.sessionId;

    const client: WSClient = {
      ws,
      sessionId,
      userId: auth.userId,
      partyId: '',
      disputeId: '',
    };

    clients.set(sessionId, client);

    logger.info('Brief prep WebSocket connected', { sessionId, userId: auth.userId });

    ws.on('message', async (data: Buffer) => {
      let parsed: { type: string; content?: string; current_sections?: Record<string, string> };

      try {
        parsed = JSON.parse(data.toString());
      } catch {
        ws.send(JSON.stringify({
          type: 'error',
          error: { code: 'INVALID_MESSAGE', message: 'Invalid JSON message' },
        }));
        return;
      }

      switch (parsed.type) {
        case 'user_message':
          if (!parsed.content || typeof parsed.content !== 'string') {
            ws.send(JSON.stringify({
              type: 'error',
              error: { code: 'VALIDATION_ERROR', message: 'content is required and must be a string' },
            }));
            return;
          }
          await handleUserMessage(client, parsed.content);
          break;

        case 'request_brief_draft':
          await handleRequestBriefDraft(client, parsed.current_sections);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            error: { code: 'UNKNOWN_MESSAGE_TYPE', message: `Unknown message type: ${parsed.type}` },
          }));
      }
    });

    ws.on('close', () => {
      clients.delete(sessionId);
      logger.info('Brief prep WebSocket disconnected', { sessionId });
    });

    ws.on('error', (error: Error) => {
      logger.warn('Brief prep WebSocket error', { sessionId, error: error.message });
      clients.delete(sessionId);
    });
  });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url || '', 'http://localhost');

    const origin = (req.headers.origin || req.headers['sec-websocket-origin'] || '') as string;
    const allowedOrigins = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['http://localhost:5173', 'http://localhost:3000'];
    if (origin && !allowedOrigins.some(o => origin.startsWith(o.trim()))) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }

    if (url.pathname.startsWith('/v1/brief-sessions/')) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  logger.info('Brief prep WebSocket server initialized');
  return wss;
}
