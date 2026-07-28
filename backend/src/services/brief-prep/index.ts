import crypto from 'crypto';
import { prisma } from '../../db/prisma';
import { encrypt, decrypt } from '../../utils/crypto';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { providerRegistry } from '../../providers/registry';
import { modelRouter } from '../../providers/model-router';
import { getEnv } from '../../config/env';
import { generateId } from '../../utils/id';

const env = getEnv();

const BRIEF_PREP_SYSTEM_PROMPT = `You are MeritView's AI Brief Assistant. Your role is to help users prepare a structured legal brief for a dispute analysis.

Guide the user through each of the 5 required sections:
1. Factual Background - What happened, when, and who was involved
2. My Position - What the user believes is the correct outcome
3. Supporting Arguments - Legal or logical reasoning supporting their position
4. Acknowledgment of Opposing Position - Fair summary of the other side's view
5. Desired Resolution - What outcome the user is seeking

Keep responses concise, ask clarifying questions, and help organize thoughts.
Do not provide legal advice. Remind users this is for analysis purposes only.`;

const SESSION_KEY_ID = 'brief-prep-session';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function serializeMessages(messages: Message[]): Buffer {
  return encrypt(JSON.stringify(messages), SESSION_KEY_ID).encryptedContent;
}

function deserializeMessages(buffer: Buffer): Message[] {
  return JSON.parse(decrypt(buffer, SESSION_KEY_ID));
}

export async function createSession(
  partyId: string,
  disputeId: string,
  userId: string,
  llmProvider?: string,
  modelPreference?: string
) {
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.disputeId !== disputeId) {
    throw new NotFoundError('Party not found');
  }
  if (party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }

  const existing = await prisma.briefPrepSession.findFirst({
    where: { partyId, status: 'ACTIVE' },
  });
  if (existing) {
    const messages = deserializeMessages(existing.encryptedMessages);
    const apiUrl = env.NEXT_PUBLIC_API_URL;
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const websocketUrl = `${wsProtocol}://${apiUrl.replace(/^https?:\/\//, '')}/v1/brief-sessions/${existing.id}`;
    const websocketToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return {
      session: {
        id: existing.id,
        dispute_id: existing.disputeId,
        party_id: existing.partyId,
        llm_provider: existing.llmProvider,
        model_id: existing.modelId,
        websocket_url: websocketUrl,
        websocket_token: websocketToken,
        expires_at: expiresAt.toISOString(),
      },
      initial_message: messages[0]?.content || '',
    };
  }

  let llmProviderValue: string;
  let modelIdValue: string;

  if (llmProvider) {
    llmProviderValue = llmProvider;
    modelIdValue = modelPreference || 'default';
  } else {
    const routed = modelRouter.resolve('brief-prep');
    llmProviderValue = routed.providerName;
    modelIdValue = routed.modelId;
  }

  const initialMessages: Message[] = [
    {
      role: 'assistant',
      content: 'Welcome! I\'ll help you prepare a structured brief. Let\'s start with the **Factual Background**. What happened in this dispute? Please describe the key events, dates, and people involved.',
      timestamp: new Date().toISOString(),
    },
  ];

  const encryptedMessages = serializeMessages(initialMessages);

  const session = await prisma.briefPrepSession.create({
    data: {
      id: generateId('bps'),
      partyId,
      disputeId,
      llmProvider: llmProviderValue,
      modelId: modelIdValue,
      encryptedMessages,
      messageCount: 1,
      status: 'ACTIVE',
    },
  });

  logger.info('Brief prep session created', { sessionId: session.id, partyId, disputeId });

  const apiUrl = env.NEXT_PUBLIC_API_URL;
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
  const websocketUrl = `${wsProtocol}://${apiUrl.replace(/^https?:\/\//, '')}/v1/brief-sessions/${session.id}`;
  const websocketToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return {
    session: {
      id: session.id,
      dispute_id: session.disputeId,
      party_id: session.partyId,
      llm_provider: session.llmProvider,
      model_id: session.modelId,
      websocket_url: websocketUrl,
      websocket_token: websocketToken,
      expires_at: expiresAt.toISOString(),
    },
    initial_message: initialMessages[0].content,
  };
}

export async function sendMessage(
  sessionId: string,
  userId: string,
  content: string
) {
  const session = await prisma.briefPrepSession.findUnique({
    where: { id: sessionId },
    include: { party: true },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (session.party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }
  if (session.status !== 'ACTIVE') {
    throw new ForbiddenError('Session is not active');
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

  let aiResponse = 'Thank you. Could you provide more details about that?';

  try {
    const provider = providerRegistry.get(session.llmProvider);

    if (provider) {
      const result = await provider.generateCompletion(
        fullPrompt,
        BRIEF_PREP_SYSTEM_PROMPT
      );
      aiResponse = result.content;

      await prisma.briefPrepSession.update({
        where: { id: sessionId },
        data: {
          totalInputTokens: { increment: result.inputTokens },
          totalOutputTokens: { increment: result.outputTokens },
        },
      });
    }
  } catch (error) {
    logger.warn('AI provider failed for brief prep, using fallback', {
      sessionId,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const assistantMessage: Message = {
    role: 'assistant',
    content: aiResponse,
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
    },
  });

  return {
    userMessage,
    assistantMessage,
    messages: [userMessage, assistantMessage],
  };
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.briefPrepSession.findUnique({
    where: { id: sessionId },
    include: { party: true },
  });

  if (!session) {
    throw new NotFoundError('Session not found');
  }
  if (session.party.userId !== userId) {
    throw new ForbiddenError('You are not a member of this party');
  }

  const messages = deserializeMessages(session.encryptedMessages);

  return {
    id: session.id,
    messages,
    status: session.status,
    messageCount: session.messageCount,
    createdAt: session.createdAt,
    lastActivityAt: session.lastActivityAt,
  };
}
