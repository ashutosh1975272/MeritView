import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../../db/prisma.js';
import { NotFoundError, UnauthorizedError, BadRequestError, InternalError } from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { generateId } from '../../utils/id.js';
import { getEnv } from '../../config/env.js';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

const env = getEnv();

const UPLOAD_DIR = path.join(os.tmpdir(), 'meritview-uploads');

let s3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client;
  if (env.S3_BUCKET) {
    s3Client = new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return s3Client;
}

export async function uploadToS3(key: string, buffer: Buffer, mimeType: string) {
  const client = getS3Client();
  if (!client || !env.S3_BUCKET) {
    return handleLocalUpload(key, buffer);
  }
  await client.send(new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  const client = getS3Client();
  if (!client || !env.S3_BUCKET) {
    const baseUrl = env.NEXT_PUBLIC_API_URL;
    return `${baseUrl}/uploads/${key.replace(/\//g, '_')}`;
  }
  const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function initStorage() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export async function createUploadUrl(
  disputeId: string,
  userId: string,
  partyId: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
  description?: string
) {
  // Check if dispute and party exist
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId } });
  if (!dispute) throw new NotFoundError('Dispute not found');
  
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.userId !== userId) throw new UnauthorizedError('Not authorized for this party');

  const fileExt = path.extname(filename);
  const storageKey = `disputes/${disputeId}/documents/${crypto.randomUUID()}${fileExt}`;
  
  // Local mock for S3 Presigned URL
  const encryptionKeyId = 'local-mock-key';

  const document = await prisma.document.create({
    data: {
      id: generateId('doc'),
      disputeId,
      uploadedByUserId: userId,
      uploadedByPartyId: partyId,
      filename,
      sizeBytes,
      mimeType,
      storageKey,
      storageBucket: 'local-mock',
      encryptionKeyId,
      ocrStatus: 'PENDING',
      description: description || null,
    }
  });

  return {
    documentId: document.id,
    uploadUrl: `/v1/documents/${document.id}/upload`,
    storageKey,
  };
}

export async function handleLocalUpload(documentId: string, fileBuffer: Buffer, runOcr: boolean = true) {
  await initStorage();
  
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError('Document not found');

  const client = getS3Client();
  if (client && env.S3_BUCKET) {
    await client.send(new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: document.storageKey,
      Body: fileBuffer,
      ContentType: document.mimeType,
    }));
  }

  const filePath = path.join(UPLOAD_DIR, document.storageKey.replace(/\//g, '_'));
  fs.writeFileSync(filePath, fileBuffer);
  
  if (runOcr) {
    extractText(document.id, filePath).catch((err: any) => {
      logger.error('OCR Extraction failed', err);
    });
  }

  return { success: true };
}

export async function extractText(documentId: string, filePath: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) return;

  await prisma.document.update({ where: { id: documentId }, data: { ocrStatus: 'PROCESSING' } });

  try {
    let extractedText = '';
    const fileBuffer = fs.readFileSync(filePath);

    if (document.mimeType === 'application/pdf') {
      const data = await pdfParse(fileBuffer);
      extractedText = data.text;
    } else if (
      document.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      document.mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      extractedText = result.value;
    } else {
      extractedText = `[File uploaded: ${document.filename}. Text extraction not supported for ${document.mimeType}]`;
    }

    // Save extracted text to local mock storage
    const extractedTextStorageKey = `${document.storageKey}_text.txt`;
    const textFilePath = path.join(UPLOAD_DIR, extractedTextStorageKey.replace(/\//g, '_'));
    fs.writeFileSync(textFilePath, extractedText);

    await prisma.document.update({
      where: { id: documentId },
      data: {
        ocrStatus: 'COMPLETED',
        extractedTextStorageKey,
      }
    });

    logger.info('OCR text extraction completed', { documentId });
  } catch (error: any) {
    logger.error('OCR Extraction error', error);
    await prisma.document.update({ where: { id: documentId }, data: { ocrStatus: 'FAILED' } });
  }
}

export async function getDownloadUrl(documentId: string) {
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) throw new NotFoundError('Document not found');

  const client = getS3Client();
  let signedUrl: string;
  if (client && env.S3_BUCKET) {
    const command = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: document.storageKey });
    signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 });
  } else {
    const baseUrl = env.NEXT_PUBLIC_API_URL;
    signedUrl = `${baseUrl}/uploads/${document.storageKey.replace(/\//g, '_')}`;
  }
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  return { signedUrl, expiresAt: expiresAt.toISOString() };
}
