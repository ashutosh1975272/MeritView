'use client';

import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Card({ title, subtitle, children, footer, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {(title || subtitle) && (
        <div className="border-b border-gray-100 px-6 py-4">
          {title && (
            <h3 className="text-base font-semibold leading-6 text-gray-900">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
      )}
      <div className="px-6 py-4">{children}</div>
      {footer && (
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
          {footer}
        </div>
      )}
    </div>
  );
}
