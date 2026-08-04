import { DisputeState } from '@prisma/client';
import { BadRequestError, ConflictError } from '../../utils/errors';

export const VALID_TRANSITIONS: Record<DisputeState, DisputeState[]> = {
  DRAFT: ['WITHDRAWN', 'PAYMENT_PENDING'],
  AWAITING_COUNTERPARTY: ['WITHDRAWN', 'AWAITING_BRIEFS', 'AWAITING_COUNTERPARTY_BRIEF', 'DECLINED', 'EXPIRED'],
  IN_PROGRESS: ['WITHDRAWN', 'AWAITING_BRIEFS', 'AWAITING_COUNTERPARTY_BRIEF'],
  AWAITING_BRIEFS: ['WITHDRAWN', 'AWAITING_COUNTERPARTY_BRIEF', 'UNDER_ANALYSIS', 'FAILED'],
  AWAITING_COUNTERPARTY_BRIEF: ['WITHDRAWN', 'UNDER_ANALYSIS', 'EXPIRED'],
  PAYMENT_PENDING: ['WITHDRAWN', 'AWAITING_COUNTERPARTY', 'AWAITING_BRIEFS', 'FAILED'],
  UNDER_ANALYSIS: ['COMPLETED', 'FAILED'],
  COMPLETED: ['REANALYSIS_IN_PROGRESS'],
  WITHDRAWN: [],
  DECLINED: [],
  EXPIRED: [],
  FAILED: [],
  REANALYSIS_IN_PROGRESS: ['COMPLETED', 'FAILED'],
};

export const TERMINAL_STATES: DisputeState[] = ['COMPLETED', 'WITHDRAWN', 'DECLINED', 'EXPIRED', 'FAILED'];

export function validateTransition(currentState: DisputeState, targetState: DisputeState): void {
  if (currentState === targetState) {
    throw new BadRequestError(`Dispute is already in state ${currentState}`);
  }

  if (TERMINAL_STATES.includes(currentState)) {
    throw new ConflictError(`Cannot transition from terminal state ${currentState}`);
  }

  const allowed = VALID_TRANSITIONS[currentState];
  if (!allowed.includes(targetState)) {
    throw new ConflictError(
      `Invalid state transition from ${currentState} to ${targetState}`
    );
  }
}

export function getAllowedTransitions(state: DisputeState): DisputeState[] {
  return VALID_TRANSITIONS[state] || [];
}

export function isTerminalState(state: DisputeState): boolean {
  return TERMINAL_STATES.includes(state);
}
