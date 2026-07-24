import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
];
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_FILES_PER_BRIEF = 5;

export async function requestOcrDocument(
  documentId: string,
  disputeId: string,
  partyId: string
): Promise<any> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  if (!SUPPORTED_MIME_TYPES.includes(document.mimeType)) {
    throw new ValidationError(
      `Unsupported file type: ${document.mimeType}. Supported: PDF, DOCX, JPG, PNG, HEIC`
    );
  }

  const bufferSize = Number(document.sizeBytes);
  if (bufferSize > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError(`File too large: ${bufferSize} bytes (max ${MAX_FILE_SIZE_BYTES})`);
  }

  const existingDocs = await prisma.document.count({
    where: { uploadedByPartyId: partyId, disputeId, deletedAt: null },
  });

  if (existingDocs >= MAX_FILES_PER_BRIEF) {
    throw new ValidationError(`Maximum ${MAX_FILES_PER_BRIEF} files per brief`);
  }

  const updated = await prisma.document.update({
    where: { id: documentId },
    data: { ocrStatus: 'PENDING' },
  });

  processOcrJob(documentId).catch(error => {
    logger.error('OCR processing failed', error, { documentId });
  });

  return updated;
}

async function processOcrJob(documentId: string): Promise<void> {
  await prisma.document.update({
    where: { id: documentId },
    data: { ocrStatus: 'PROCESSING' },
  });

  try {
    const extractedText = await performOcrExtraction(documentId);

    const extractedTextKey = `ocr/${documentId}/extracted.txt`;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'COMPLETED',
        extractedTextStorageKey: extractedTextKey,
      },
    });

    logger.info('OCR processing completed', { documentId });
  } catch (error: any) {
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'FAILED' },
    });
    logger.error('OCR processing failed', error, { documentId });
  }
}

async function performOcrExtraction(documentId: string): Promise<string> {
  const textractEndpoint = process.env.TEXTRACT_ENDPOINT;
  const visionEndpoint = process.env.GOOGLE_VISION_ENDPOINT;

  if (!textractEndpoint && !visionEndpoint) {
    return '[OCR stub] No OCR service configured. Would extract text from document here.';
  }

  if (visionEndpoint) {
    const response = await fetch(`${visionEndpoint}/v1/images:annotate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { source: { imageUri: `documents/${documentId}` } }, features: [{ type: 'DOCUMENT_TEXT_DETECTION' }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status}`);
    }

    const data = await response.json();
    return data.responses?.[0]?.fullTextAnnotation?.text || '';
  }

  const response = await fetch(`${textractEndpoint}/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentId }),
  });

  if (!response.ok) {
    throw new Error(`Textract API error: ${response.status}`);
  }

  const data = await response.json();
  return data.text || '';
}

export async function getOcrStatus(documentId: string): Promise<any> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, ocrStatus: true, extractedTextStorageKey: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  return document;
}

export function isFileTypeSupported(mimeType: string): boolean {
  return SUPPORTED_MIME_TYPES.includes(mimeType);
}

export function getMaxFileSize(): number {
  return MAX_FILE_SIZE_BYTES;
}

export function getMaxFilesPerBrief(): number {
  return MAX_FILES_PER_BRIEF;
}
