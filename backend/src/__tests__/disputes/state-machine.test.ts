import { describe, it, expect } from 'vitest';
import { validateDisputeStateTransition, getDefaultPriceForTier } from '../../services/disputes';

describe('Disputes State Machine', () => {
  describe('validateDisputeStateTransition', () => {
    const allowedTransitions: Record<string, string[]> = {
      DRAFT: ['BRIEF_SUBMITTED', 'WITHDRAWN'],
      BRIEF_SUBMITTED: ['PAYMENT_PENDING', 'DRAFT'],
      PAYMENT_PENDING: ['UNDER_ANALYSIS', 'DRAFT', 'FAILED'],
      UNDER_ANALYSIS: ['AWAITING_AGGREGATION', 'FAILED'],
      AWAITING_AGGREGATION: ['COMPLETED', 'FAILED'],
      COMPLETED: [],
      WITHDRAWN: [],
      FAILED: [],
      DECLINED: [],
    };

    Object.entries(allowedTransitions).filter(([_, allowed]) => allowed.length > 0).forEach(([from, allowedNexts]) => {
      describe(`from ${from}`, () => {
        allowedNexts.forEach((next) => {
          it(`allows ${from} -> ${next}`, () => {
            expect(validateDisputeStateTransition(from as any, next as any)).toBe(true);
          });
        });
      });
    });

    it('rejects DRAFT -> PAYMENT_PENDING', () => {
      expect(validateDisputeStateTransition('DRAFT', 'PAYMENT_PENDING')).toBe(false);
    });

    it('rejects DRAFT -> UNDER_ANALYSIS', () => {
      expect(validateDisputeStateTransition('DRAFT', 'UNDER_ANALYSIS')).toBe(false);
    });

    it('rejects COMPLETED -> any state', () => {
      expect(validateDisputeStateTransition('COMPLETED', 'DRAFT')).toBe(false);
      expect(validateDisputeStateTransition('COMPLETED', 'UNDER_ANALYSIS')).toBe(false);
      expect(validateDisputeStateTransition('COMPLETED', 'WITHDRAWN')).toBe(false);
    });

    it('rejects WITHDRAWN -> any state', () => {
      expect(validateDisputeStateTransition('WITHDRAWN', 'DRAFT')).toBe(false);
    });

    it('rejects FAILED -> any state', () => {
      expect(validateDisputeStateTransition('FAILED', 'DRAFT')).toBe(false);
      expect(validateDisputeStateTransition('FAILED', 'UNDER_ANALYSIS')).toBe(false);
      expect(validateDisputeStateTransition('FAILED', 'COMPLETED')).toBe(false);
    });

    it('rejects DECLINED -> any state', () => {
      expect(validateDisputeStateTransition('DECLINED', 'UNDER_ANALYSIS')).toBe(false);
    });

    it('rejects unknown state transitions', () => {
      expect(validateDisputeStateTransition('UNKNOWN' as any, 'DRAFT')).toBe(false);
    });
  });

  describe('getDefaultPriceForTier', () => {
    it('returns 49 for STANDARD', () => {
      expect(getDefaultPriceForTier('STANDARD')).toBe(49);
    });

    it('returns 99 for EXPEDITED', () => {
      expect(getDefaultPriceForTier('EXPEDITED')).toBe(99);
    });

    it('returns 199 for EXTENDED', () => {
      expect(getDefaultPriceForTier('EXTENDED')).toBe(199);
    });

    it('returns 49 for REANALYSIS', () => {
      expect(getDefaultPriceForTier('REANALYSIS')).toBe(49);
    });
  });
});
