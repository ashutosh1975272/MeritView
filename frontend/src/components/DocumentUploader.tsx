'use client';

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { apiClient } from '@/lib/api-client';

interface DocumentUploaderProps {
  disputeId: string;
  partyId: string;
  isSealed: boolean;
  onUploadComplete?: () => void;
}

export function DocumentUploader({ disputeId, partyId, isSealed, onUploadComplete }: DocumentUploaderProps) {
  const { accessToken } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSealed) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF and DOCX files are supported');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Get Presigned URL (Local Mock URL in this case)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const initRes = await fetch(`${baseUrl}/v1/disputes/${disputeId}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!initRes.ok) {
        throw new Error('Failed to initialize upload');
      }

      const { uploadUrl, documentId } = await initRes.json();

      // 2. Upload file directly to URL
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch(`${baseUrl}${uploadUrl}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload file');
      }

      setSuccess(`Successfully uploaded ${file.name}`);
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  }, [disputeId, partyId, isSealed, accessToken, onUploadComplete]);

  return (
    <div className="space-y-4 pt-6 mt-6 border-t border-border">
      <div>
        <h3 className="text-lg font-medium">Supporting Evidence</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload PDF or DOCX files to support your arguments (Max 10MB per file).
        </p>
      </div>

      {!isSealed && (
        <div className="flex items-center gap-4">
          <label className="relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-6 hover:bg-accent/50 hover:border-primary transition-all w-full h-32 group">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <div className="text-center">
              <div className="text-2xl mb-2">📄</div>
              {isUploading ? (
                <span className="text-sm font-medium animate-pulse">Uploading file...</span>
              ) : (
                <span className="text-sm font-medium group-hover:text-primary">Click to select or drag & drop</span>
              )}
            </div>
          </label>
        </div>
      )}

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
          {success}
        </div>
      )}
    </div>
  );
}
