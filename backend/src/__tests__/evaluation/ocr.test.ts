import { describe, it, expect } from 'vitest';
import { isFileTypeSupported, getMaxFileSize, getMaxFilesPerBrief } from '../../services/ocr';

describe('OCRService', () => {
  it('should support PDF MIME type', () => {
    expect(isFileTypeSupported('application/pdf')).toBe(true);
  });

  it('should support DOCX MIME type', () => {
    expect(isFileTypeSupported('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
  });

  it('should support JPEG and PNG', () => {
    expect(isFileTypeSupported('image/jpeg')).toBe(true);
    expect(isFileTypeSupported('image/png')).toBe(true);
  });

  it('should support HEIC', () => {
    expect(isFileTypeSupported('image/heic')).toBe(true);
  });

  it('should reject unsupported types', () => {
    expect(isFileTypeSupported('text/plain')).toBe(false);
    expect(isFileTypeSupported('video/mp4')).toBe(false);
  });

  it('should return correct max file size', () => {
    expect(getMaxFileSize()).toBe(25 * 1024 * 1024);
  });

  it('should return correct max files per brief', () => {
    expect(getMaxFilesPerBrief()).toBe(5);
  });
});
