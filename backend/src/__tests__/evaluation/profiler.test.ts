import { describe, it, expect, vi, beforeEach } from 'vitest';
import { startProfile, endProfile, getProfileSummary, clearProfile } from '../../services/evaluation/profiler';

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));

describe('EvaluationProfiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start and end a profile entry', () => {
    const disputeId = 'dispute-1';
    startProfile(disputeId, 'groq-llama', 1);

    const summary = getProfileSummary(disputeId);
    expect(summary.entries).toHaveLength(1);
    expect(summary.entries[0].success).toBe(false);

    endProfile(disputeId, 'groq-llama', 1, true);
    const updated = getProfileSummary(disputeId);
    expect(updated.entries[0].success).toBe(true);
    expect(updated.entries[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should return empty summary for unknown dispute', () => {
    const summary = getProfileSummary('nonexistent');
    expect(summary.totalTimeMs).toBe(0);
    expect(summary.entries).toHaveLength(0);
  });

  it('should clear profile data', () => {
    startProfile('dispute-1', 'groq-llama', 1);
    clearProfile('dispute-1');
    const summary = getProfileSummary('dispute-1');
    expect(summary.entries).toHaveLength(0);
  });
});
