import { createWorker } from 'tesseract.js';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { InternalError, NotFoundError } from '../../utils/errors';

export async function processDocumentOcr(documentId: string): Promise<string> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, storageKey: true, mimeType: true, ocrStatus: true },
  });

  if (!document) {
    throw new NotFoundError('Document not found');
  }

  if (document.ocrStatus === 'COMPLETED') {
    const doc = await prisma.document.findUnique({
      where: { id: documentId },
      select: { extractedTextStorageKey: true },
    });
    return doc?.extractedTextStorageKey || '';
  }

  const supportedMimes = ['image/jpeg', 'image/png', 'image/tiff', 'application/pdf'];
  if (!supportedMimes.includes(document.mimeType)) {
    throw new InternalError('OCR is only supported for images and PDFs');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: { ocrStatus: 'PROCESSING' },
  });

  try {
    const worker = await createWorker('eng');
    const { data } = await worker.recognize(document.storageKey);
    await worker.terminate();

    const textStorageKey = `ocr/${documentId}_${Date.now()}.txt`;

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'COMPLETED',
        extractedTextStorageKey: textStorageKey,
      },
    });

    logger.info('OCR processing completed', { documentId, textLength: data.text.length });

    return textStorageKey;
  } catch (error) {
    await prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: 'FAILED' },
    });

    logger.error('OCR processing failed', error as Error, { documentId });
    throw new InternalError('OCR processing failed');
  }
}

export async function getOcrText(documentId: string): Promise<{ text: string; status: string }> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ocrStatus: true, extractedTextStorageKey: true },
  });

  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  if (doc.ocrStatus !== 'COMPLETED') {
    return { text: '', status: doc.ocrStatus };
  }

  return { text: `OCR text stored at: ${doc.extractedTextStorageKey}`, status: 'COMPLETED' };
}
