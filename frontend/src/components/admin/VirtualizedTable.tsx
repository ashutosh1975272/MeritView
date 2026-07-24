'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render: (item: T) => React.ReactNode;
  width?: string;
}

interface VirtualizedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  rowHeight?: number;
  keyExtractor: (item: T) => string;
}

export function VirtualizedTable<T>({
  data,
  columns,
  pageSize = 50,
  rowHeight = 48,
  keyExtractor,
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: pageSize });

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const clientHeight = el.clientHeight;
    const totalHeight = data.length * rowHeight;

    const start = Math.floor(scrollTop / rowHeight);
    const end = Math.min(start + Math.ceil(clientHeight / rowHeight) + 2, data.length);

    setVisibleRange({ start, end });
  }, [data.length, rowHeight]);

  useEffect(() => {
    handleScroll();
  }, [handleScroll, data]);

  const totalHeight = data.length * rowHeight;
  const visibleData = data.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: 'auto', maxHeight: '600px', position: 'relative' }}
      role="table"
      aria-label="Admin disputes table"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${visibleRange.start * rowHeight}px)`,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
              fontWeight: 600,
              borderBottom: '2px solid #e5e7eb',
              padding: '8px 12px',
              background: '#f9fafb',
              position: 'sticky',
              top: 0,
              zIndex: 1,
            }}
            role="row"
            aria-label="Header row"
          >
            {columns.map(col => (
              <div key={String(col.key)} role="columnheader">
                {col.header}
              </div>
            ))}
          </div>
          {visibleData.map(item => (
            <div
              key={keyExtractor(item)}
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map(c => c.width || '1fr').join(' '),
                padding: '8px 12px',
                borderBottom: '1px solid #f3f4f6',
                alignItems: 'center',
                minHeight: rowHeight,
              }}
              role="row"
            >
              {columns.map(col => (
                <div key={String(col.key)} role="cell">
                  {col.render(item)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function createDisputeColumns(): Column<any>[] {
  return [
    { key: 'title', header: 'Title', render: (d: any) => d.title || 'Untitled', width: '2fr' },
    { key: 'state', header: 'Status', render: (d: any) => (
      <span className={`status-badge status-${d.state?.toLowerCase() || 'draft'}`}>
        {d.state?.replace(/_/g, ' ') || 'DRAFT'}
      </span>
    ), width: '1fr' },
    { key: 'category', header: 'Category', render: (d: any) => d.category?.replace(/_/g, ' ') || '-', width: '1fr' },
    { key: 'initiator', header: 'Initiator', render: (d: any) => d.initiator?.displayName || d.initiator?.email || '-', width: '1fr' },
    { key: 'createdAt', header: 'Created', render: (d: any) => new Date(d.createdAt).toLocaleDateString(), width: '0.8fr' },
    { key: 'actions', header: 'Actions', render: (d: any) => (
      <a href={`/admin/disputes/${d.id}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>
        View
      </a>
    ), width: '0.5fr' },
  ];
}
