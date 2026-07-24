'use client';

import { useState, useCallback } from 'react';

interface PdfDownloadButtonProps {
  disputeId: string;
  pdfStorageKey?: string | null;
}

export function PdfDownloadButton({ disputeId, pdfStorageKey }: PdfDownloadButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'complete' | 'error'>('idle');

  const handleDownload = useCallback(async () => {
    if (!pdfStorageKey) return;

    setStatus('downloading');
    setProgress(0);

    try {
      const response = await fetch(`/v1/disputes/${disputeId}/opinion/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) throw new Error('Download failed');

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        received += value.length;

        if (total > 0) {
          setProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MeritView-Opinion-${disputeId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setStatus('complete');
      setProgress(100);

      setTimeout(() => {
        setStatus('idle');
        setProgress(null);
      }, 3000);
    } catch (error) {
      setStatus('error');
      setProgress(null);
      console.error('PDF download failed', error);
    }
  }, [disputeId, pdfStorageKey]);

  if (!pdfStorageKey) {
    return (
      <span className="text-sm text-gray-400">
        PDF not available
      </span>
    );
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={status === 'downloading'}
        aria-label="Download opinion PDF"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === 'downloading'
          ? `Downloading... ${progress !== null ? `${progress}%` : ''}`
          : status === 'complete'
            ? 'Downloaded!'
            : status === 'error'
              ? 'Retry Download'
              : 'Download PDF'}
      </button>
      {status === 'downloading' && progress !== null && (
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="PDF download progress"
          style={{
            marginTop: '8px',
            height: '4px',
            width: '100%',
            background: '#e5e7eb',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: '#2563eb',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </div>
  );
}
