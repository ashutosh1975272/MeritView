import { Response, Request } from 'express';

export interface SSEClient {
  id: string;
  res: Response;
  disputeId: string;
}

const clients = new Map<string, SSEClient[]>();

export function sseSend(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export function sseSetup(req: Request, res: Response): SSEClient {
  const disputeId = req.params.disputeId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`event: connected\ndata: {}\n\n`);

  const client: SSEClient = {
    id: `${disputeId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    res,
    disputeId,
  };

  const existing = clients.get(client.disputeId) || [];
  existing.push(client);
  clients.set(client.disputeId, existing);

  req.on('close', () => {
    const list = clients.get(client.disputeId) || [];
    clients.set(
      client.disputeId,
      list.filter((c) => c.id !== client.id)
    );
  });

  return client;
}

export function sseBroadcast(disputeId: string, event: string, data: unknown): void {
  const list = clients.get(disputeId) || [];
  for (const client of list) {
    try {
      sseSend(client.res, event, data);
    } catch {
      // client disconnected
    }
  }
}

export function sseCleanup(disputeId: string): void {
  clients.delete(disputeId);
}
