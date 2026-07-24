import { DisputeState } from '@prisma/client';
import { ValidationError } from '../../utils/errors';

const VALID_TRANSITIONS: Record<DisputeState, DisputeState[]> = {
  DRAFT: ['BRIEF_SUBMITTED', 'WITHDRAWN', 'AWAITING_COUNTERPARTY'],
  AWAITING_COUNTERPARTY: ['AWAITING_BRIEFS', 'AWAITING_COUNTERPARTY_BRIEF', 'WITHDRAWN', 'DECLINED'],
  IN_PROGRESS: ['AWAITING_BRIEFS', 'WITHDRAWN'],
  AWAITING_BRIEFS: ['BRIEF_SUBMITTED', 'AWAITING_COUNTERPARTY_BRIEF', 'WITHDRAWN'],
  AWAITING_COUNTERPARTY_BRIEF: ['BRIEF_SUBMITTED', 'WITHDRAWN'],
  BRIEF_SUBMITTED: ['PAYMENT_PENDING', 'UNDER_ANALYSIS', 'AWAITING_COUNTERPARTY_BRIEF', 'WITHDRAWN'],
  PAYMENT_PENDING: ['UNDER_ANALYSIS', 'FAILED', 'WITHDRAWN'],
  UNDER_ANALYSIS: ['AWAITING_AGGREGATION', 'FAILED', 'WITHDRAWN'],
  AWAITING_AGGREGATION: ['COMPLETED', 'FAILED', 'WITHDRAWN'],
  COMPLETED: ['WITHDRAWN'],
  WITHDRAWN: [],
  DECLINED: [],
  FAILED: [],
};

export function validateTransition(
  currentState: DisputeState,
  targetState: DisputeState
): void {
  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed || !allowed.includes(targetState)) {
    throw new ValidationError(
      `Cannot transition from ${currentState} to ${targetState}`
    );
  }
}

export function getAvailableTransitions(state: DisputeState): DisputeState[] {
  return VALID_TRANSITIONS[state] || [];
}

export function isTwoPartyState(state: DisputeState): boolean {
  return [
    'AWAITING_COUNTERPARTY',
    'IN_PROGRESS',
    'AWAITING_BRIEFS',
    'AWAITING_COUNTERPARTY_BRIEF',
  ].includes(state);
}

export function isTerminalState(state: DisputeState): boolean {
  return ['COMPLETED', 'WITHDRAWN', 'DECLINED', 'FAILED'].includes(state);
}
