import { logger } from '../../utils/logger';

interface DispatchProfileEntry {
  providerKey: string;
  attemptNumber: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

const profiles = new Map<string, DispatchProfileEntry[]>();

export function startProfile(disputeId: string, providerKey: string, attemptNumber: number): string {
  const profileId = `${disputeId}:${providerKey}:${attemptNumber}:${Date.now()}`;
  if (!profiles.has(disputeId)) {
    profiles.set(disputeId, []);
  }
  profiles.get(disputeId)!.push({
    providerKey,
    attemptNumber,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    success: false,
  });
  return profileId;
}

export function endProfile(disputeId: string, providerKey: string, attemptNumber: number, success: boolean, error?: string): void {
  const entries = profiles.get(disputeId);
  if (!entries) return;

  const entry = entries.find(
    e => e.providerKey === providerKey && e.attemptNumber === attemptNumber && e.endTime === 0
  );
  if (!entry) return;

  entry.endTime = Date.now();
  entry.durationMs = entry.endTime - entry.startTime;
  entry.success = success;
  entry.error = error;

  logger.info('Provider dispatch profile', {
    disputeId,
    providerKey,
    attemptNumber,
    durationMs: entry.durationMs,
    success,
    error,
  });
}

export function getProfileSummary(disputeId: string): {
  totalTimeMs: number;
  entries: DispatchProfileEntry[];
  averagePerProvider: number;
  successRate: number;
} {
  const entries = profiles.get(disputeId) || [];
  if (entries.length === 0) {
    return { totalTimeMs: 0, entries: [], averagePerProvider: 0, successRate: 0 };
  }

  const totalTimeMs = Math.max(...entries.map(e => e.endTime)) - Math.min(...entries.map(e => e.startTime));
  const averagePerProvider = entries.reduce((s, e) => s + e.durationMs, 0) / entries.length;
  const successRate = entries.filter(e => e.success).length / entries.length;

  return { totalTimeMs, entries, averagePerProvider, successRate };
}

export function clearProfile(disputeId: string): void {
  profiles.delete(disputeId);
}
