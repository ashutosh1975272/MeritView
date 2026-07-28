const STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  AWAITING_COUNTERPARTY: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  AWAITING_BRIEFS: 'bg-purple-100 text-purple-700',
  AWAITING_COUNTERPARTY_BRIEF: 'bg-indigo-100 text-indigo-700',
  UNDER_ANALYSIS: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  WITHDRAWN: 'bg-red-100 text-red-700',
  DECLINED: 'bg-red-100 text-red-700',
  BRIEF_NOT_STARTED: 'bg-gray-100 text-gray-700',
  BRIEF_IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  BRIEF_SUBMITTED: 'bg-blue-100 text-blue-700',
  BRIEF_SEALED: 'bg-green-100 text-green-700',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-700',
  PAYMENT_COMPLETED: 'bg-green-100 text-green-700',
  PAYMENT_FAILED: 'bg-red-100 text-red-700',
  PAYMENT_REFUNDED: 'bg-purple-100 text-purple-700',
};

export function StateBadge({ state, className = '' }: { state: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATE_COLORS[state] || 'bg-gray-100 text-gray-700'} ${className}`}
    >
      {state.replace(/_/g, ' ')}
    </span>
  );
}
