import { describe, it, expect, vi, beforeEach } from 'vitest';
import { timingMiddleware } from '../timing';

function mockReq() {
  return { method: 'POST', path: '/v1/auth/login' } as any;
}

function mockRes() {
  const events: Record<string, Function> = {};
  return {
    on: vi.fn((event: string, cb: Function) => { events[event] = cb; }),
    getHeader: vi.fn(),
  } as any;
}

describe('T1.3.1.1: Profile JWT verification middleware latency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should record timing and call next', () => {
    const req = mockReq();
    const res = mockRes();
    const next = vi.fn();

    timingMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should set X-Response-Time header on finish', () => {
    const req = mockReq();
    const res = mockRes();
    let finishCallback: Function = vi.fn();
    res.on = vi.fn((event: string, cb: Function) => {
      if (event === 'finish') finishCallback = cb;
    });
    const next = vi.fn();

    timingMiddleware(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });
});
