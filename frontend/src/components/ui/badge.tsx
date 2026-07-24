'use client';

import React from 'react';

type BadgeVariant =
  | 'DRAFT'
  | 'BRIEF_SUBMITTED'
  | 'PAYMENT_PENDING'
  | 'UNDER_ANALYSIS'
  | 'AWAITING_AGGREGATION'
  | 'COMPLETED'
  | 'WITHDRAWN'
  | 'FAILED'
  | 'DECLINED';

const variantClasses: Record<BadgeVariant, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 ring-gray-500/10',
  BRIEF_SUBMITTED: 'bg-yellow-100 text-yellow-800 ring-yellow-500/10',
  PAYMENT_PENDING: 'bg-blue-100 text-blue-800 ring-blue-500/10',
  UNDER_ANALYSIS: 'bg-purple-100 text-purple-800 ring-purple-500/10',
  AWAITING_AGGREGATION: 'bg-orange-100 text-orange-800 ring-orange-500/10',
  COMPLETED: 'bg-green-100 text-green-800 ring-green-500/10',
  WITHDRAWN: 'bg-red-100 text-red-800 ring-red-500/10',
  FAILED: 'bg-red-100 text-red-800 ring-red-500/10',
  DECLINED: 'bg-gray-100 text-gray-800 ring-gray-500/10',
};

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  );
}
