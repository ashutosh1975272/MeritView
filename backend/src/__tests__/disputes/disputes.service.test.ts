import { describe, it, expect } from 'vitest';
import {
  validateDisputeStateTransition,
  getDefaultPriceForTier,
} from '../../services/disputes';
import { calculateWordCount } from '../../services/briefs';

describe('DisputeService', () => {
  describe('validateDisputeStateTransition', () => {
    it('allows draft -> brief_submitted', () => {
      expect(validateDisputeStateTransition('DRAFT', 'BRIEF_SUBMITTED')).toBe(true);
    });

    it('allows draft -> withdrawn', () => {
      expect(validateDisputeStateTransition('DRAFT', 'WITHDRAWN')).toBe(true);
    });

    it('rejects draft -> payment_pending', () => {
      expect(validateDisputeStateTransition('DRAFT', 'PAYMENT_PENDING')).toBe(false);
    });

    it('allows payment_pending -> under_analysis', () => {
      expect(validateDisputeStateTransition('PAYMENT_PENDING', 'UNDER_ANALYSIS')).toBe(true);
    });

    it('allows under_analysis -> awaiting_aggregation', () => {
      expect(validateDisputeStateTransition('UNDER_ANALYSIS', 'AWAITING_AGGREGATION')).toBe(true);
    });

    it('allows awaiting_aggregation -> completed', () => {
      expect(validateDisputeStateTransition('AWAITING_AGGREGATION', 'COMPLETED')).toBe(true);
    });

    it('rejects completed -> any state', () => {
      expect(validateDisputeStateTransition('COMPLETED', 'DRAFT')).toBe(false);
      expect(validateDisputeStateTransition('COMPLETED', 'UNDER_ANALYSIS')).toBe(false);
    });

    it('rejects withdrawn -> any state', () => {
      expect(validateDisputeStateTransition('WITHDRAWN', 'DRAFT')).toBe(false);
    });
  });

  describe('getDefaultPriceForTier', () => {
    it('returns 49 for STANDARD tier', () => {
      expect(getDefaultPriceForTier('STANDARD')).toBe(49);
    });

    it('returns 99 for EXPEDITED tier', () => {
      expect(getDefaultPriceForTier('EXPEDITED')).toBe(99);
    });

    it('returns 199 for EXTENDED tier', () => {
      expect(getDefaultPriceForTier('EXTENDED')).toBe(199);
    });

    it('returns 49 for REANALYSIS tier', () => {
      expect(getDefaultPriceForTier('REANALYSIS')).toBe(49);
    });
  });

  describe('word count', () => {
    it('counts words correctly', () => {
      expect(calculateWordCount({
        factual_background: 'one two three',
        my_position: 'four five',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: 'six',
      })).toBe(6);
    });

    it('returns 0 for empty sections', () => {
      expect(calculateWordCount({
        factual_background: '',
        my_position: '',
        supporting_arguments: '',
        acknowledgment_of_opposing: '',
        desired_resolution: '',
      })).toBe(0);
    });
  });
});
