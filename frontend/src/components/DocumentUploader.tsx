'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

interface DocumentUploaderProps {
  disputeId: string;
  partyId: string;
  isSealed: boolean;
  onUploadComplete?: () => void;
}

export function DocumentUploader({ disputeId, partyId, isSealed, onUploadComplete }: DocumentUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isSealed) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError('File size must be less than 25MB');
      return;
    }

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/heic',
      'image/heif',
      'application/rtf',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, DOC, DOCX, text, RTF, JPG, PNG, TIFF, or HEIC files are supported');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.uploadDocument(disputeId, partyId, file);

      setSuccess(`Successfully uploaded ${file.name}`);
      if (onUploadComplete) onUploadComplete();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  }, [disputeId, partyId, isSealed, onUploadComplete]);

  return (
    <div className="space-y-4 pt-6 mt-6 border-t border-border">
      <div>
        <h3 className="text-lg font-medium">Supporting Evidence</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload supporting evidence files (Max 25MB per file).
        </p>
      </div>

      {!isSealed && (
        <div className="flex items-center gap-4">
          <label className="relative flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border p-6 hover:bg-accent/50 hover:border-primary transition-all w-full h-32 group">
            <input
              type="file"
              className="hidden"
                accept=".pdf,.docx,.doc,.txt,.rtf,.jpg,.jpeg,.png,.tif,.tiff,.heic,.heif"
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
