import { describe, it, expect, vi, beforeEach } from 'vitest';

const queueState = vi.hoisted(() => ({
  addMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: queueState.addMock,
  })),
  Worker: vi.fn(),
}));

vi.mock('../../config/env', () => ({
  getEnv: () => ({
    REDIS_URL: 'redis://localhost:6379',
  }),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { addEvaluationJob } from '../../jobs/queues';

describe('job queue helpers', () => {
  beforeEach(() => {
    queueState.addMock.mockClear();
  });

  it('queues evaluation jobs with a BullMQ-safe id format', async () => {
    await addEvaluationJob('disp_123', 'user_456');

    expect(queueState.addMock).toHaveBeenCalledTimes(1);
    expect(queueState.addMock).toHaveBeenCalledWith(
      'evaluate-dispute',
      { disputeId: 'disp_123', userId: 'user_456' },
      expect.objectContaining({
        jobId: 'eval-disp_123',
      })
    );
  });
});
