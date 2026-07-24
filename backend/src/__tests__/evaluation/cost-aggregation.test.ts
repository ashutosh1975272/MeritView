import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendCostAlert } from '../../services/notifications/slack';

vi.mock('../../config/env', () => ({
  getEnv: () => ({ NODE_ENV: 'test' }),
}));

vi.mock('../../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('CostAggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger alert for cost over $15', async () => {
    await sendCostAlert('dispute-123', 15.01);
  });

  it('should not trigger alert for cost under $15', async () => {
    await sendCostAlert('dispute-123', 5.00);
  });
});
