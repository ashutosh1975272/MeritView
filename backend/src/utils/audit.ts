import crypto from 'crypto';
import { getEnv } from '../config/env';
import { prisma } from '../db/prisma';

const env = getEnv();

function computeAuditSignature(prevSignature: string | null, eventType: string, resourceType: string, resourceId: string, metadataJson: string): string {
  const hmac = crypto.createHmac('sha256', env.ENCRYPTION_KEY);
  hmac.update(prevSignature || '');
  hmac.update(eventType);
  hmac.update(resourceType);
  hmac.update(resourceId);
  hmac.update(metadataJson);
  return hmac.digest('hex');
}

export async function createAuditEvent(data: {
  actorId: string;
  actorType: string;
  eventType: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  tx?: any;
}): Promise<string> {
  const metadataJson = JSON.stringify(data.metadata || {});

  const lastEvent = await prisma.auditEvent.findFirst({
    where: { resourceType: data.resourceType, resourceId: data.resourceId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, signature: true },
  });

  const signature = computeAuditSignature(
    lastEvent?.signature || null,
    data.eventType,
    data.resourceType,
    data.resourceId,
    metadataJson
  );

  const createData = {
    actorId: data.actorId,
    actorType: data.actorType,
    eventType: data.eventType,
    resourceType: data.resourceType,
    resourceId: data.resourceId,
    metadata: data.metadata as any || undefined,
    requestId: data.requestId || null,
    ipAddress: data.ipAddress || null,
    userAgent: data.userAgent || null,
    prevEventId: lastEvent?.id || null,
    signature,
  };

  if (data.tx) {
    await data.tx.auditEvent.create({ data: createData });
  } else {
    await prisma.auditEvent.create({ data: createData });
  }

  return signature;
}
