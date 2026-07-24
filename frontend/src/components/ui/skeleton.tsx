'use client';

import React from 'react';

type SkeletonVariant = 'text' | 'circular' | 'rectangular';

interface SkeletonProps {
  className?: string;
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  const variantClass =
    variant === 'circular' ? 'rounded-full' : variant === 'rectangular' ? 'rounded-lg' : 'rounded-md';

  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  if (variant === 'text' && !height) style.height = '16px';

  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse bg-gray-200',
        variantClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
    />
  );
}
