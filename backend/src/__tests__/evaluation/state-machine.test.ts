import { describe, it, expect } from 'vitest';
import { validateTransition, getAvailableTransitions, isTwoPartyState, isTerminalState } from '../../services/disputes/state-machine';

describe('DisputeStateMachine', () => {
  it('should allow valid transitions', () => {
    expect(() => validateTransition('DRAFT' as any, 'BRIEF_SUBMITTED' as any)).not.toThrow();
    expect(() => validateTransition('DRAFT' as any, 'AWAITING_COUNTERPARTY' as any)).not.toThrow();
    expect(() => validateTransition('AWAITING_COUNTERPARTY' as any, 'AWAITING_BRIEFS' as any)).not.toThrow();
    expect(() => validateTransition('BRIEF_SUBMITTED' as any, 'PAYMENT_PENDING' as any)).not.toThrow();
    expect(() => validateTransition('PAYMENT_PENDING' as any, 'UNDER_ANALYSIS' as any)).not.toThrow();
    expect(() => validateTransition('UNDER_ANALYSIS' as any, 'AWAITING_AGGREGATION' as any)).not.toThrow();
    expect(() => validateTransition('AWAITING_AGGREGATION' as any, 'COMPLETED' as any)).not.toThrow();
  });

  it('should reject invalid transitions', () => {
    expect(() => validateTransition('DRAFT' as any, 'COMPLETED' as any)).toThrow();
    expect(() => validateTransition('BRIEF_SUBMITTED' as any, 'COMPLETED' as any)).toThrow();
    expect(() => validateTransition('PAYMENT_PENDING' as any, 'COMPLETED' as any)).toThrow();
    expect(() => validateTransition('COMPLETED' as any, 'UNDER_ANALYSIS' as any)).toThrow();
  });

  it('should return available transitions', () => {
    const transitions = getAvailableTransitions('DRAFT' as any);
    expect(transitions).toContain('BRIEF_SUBMITTED');
    expect(transitions).toContain('WITHDRAWN');
    expect(transitions).toContain('AWAITING_COUNTERPARTY');
  });

  it('should identify two-party states', () => {
    expect(isTwoPartyState('AWAITING_COUNTERPARTY' as any)).toBe(true);
    expect(isTwoPartyState('AWAITING_BRIEFS' as any)).toBe(true);
    expect(isTwoPartyState('AWAITING_COUNTERPARTY_BRIEF' as any)).toBe(true);
    expect(isTwoPartyState('DRAFT' as any)).toBe(false);
    expect(isTwoPartyState('COMPLETED' as any)).toBe(false);
  });

  it('should identify terminal states', () => {
    expect(isTerminalState('COMPLETED' as any)).toBe(true);
    expect(isTerminalState('WITHDRAWN' as any)).toBe(true);
    expect(isTerminalState('DECLINED' as any)).toBe(true);
    expect(isTerminalState('FAILED' as any)).toBe(true);
    expect(isTerminalState('DRAFT' as any)).toBe(false);
  });
});
