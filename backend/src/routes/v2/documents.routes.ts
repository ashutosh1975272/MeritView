import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { authRateLimiter } from '../../middleware/rateLimit';
import { prisma } from '../../db/prisma';
import { logger } from '../../utils/logger';
import { ValidationError, NotFoundError } from '../../utils/errors';
import {
  requestOcrDocument,
  getOcrStatus,
  isFileTypeSupported,
  getMaxFileSize,
  getMaxFilesPerBrief,
} from '../../services/ocr';

const router = Router() as ReturnType<typeof Router>;

router.use(authMiddleware());

const uploadSchema = z.object({
  body: z.object({
    disputeId: z.string().uuid(),
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1),
    contentBase64: z.string().min(1),
    description: z.string().optional(),
  }),
});

const documentIdParamSchema = z.object({
  params: z.object({
    documentId: z.string().uuid(),
  }),
});

const disputeIdParamSchema = z.object({
  params: z.object({
    disputeId: z.string().uuid(),
  }),
});

router.post(
  '/documents/upload',
  authRateLimiter,
  validate(uploadSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId, filename, mimeType, contentBase64, description } = req.body;

      if (!isFileTypeSupported(mimeType)) {
        throw new ValidationError(`Unsupported file type: ${mimeType}`);
      }

      const contentBuffer = Buffer.from(contentBase64, 'base64');
      if (contentBuffer.length > getMaxFileSize()) {
        throw new ValidationError(`File exceeds maximum size of ${getMaxFileSize() / 1024 / 1024}MB`);
      }

      const party = await prisma.party.findFirst({
        where: { disputeId, userId: req.user!.id },
      });

      if (!party) {
        throw new NotFoundError('Party not found for this dispute');
      }

      const existingCount = await prisma.document.count({
        where: { uploadedByPartyId: party.id, disputeId, deletedAt: null },
      });

      if (existingCount >= getMaxFilesPerBrief()) {
        throw new ValidationError(`Maximum ${getMaxFilesPerBrief()} files per brief`);
      }

      const storageKey = `documents/${disputeId}/${party.id}/${Date.now()}-${filename}`;

      const document = await prisma.document.create({
        data: {
          disputeId,
          uploadedByUserId: req.user!.id,
          uploadedByPartyId: party.id,
          filename,
          sizeBytes: BigInt(contentBuffer.length),
          mimeType,
          storageKey,
          storageBucket: 'meritview-documents',
          encryptionKeyId: 'doc-key-1',
          description: description || null,
          ocrStatus: 'NOT_REQUESTED',
        },
      });

      logger.info('Document uploaded', { documentId: document.id, disputeId, filename });

      res.status(201).json({
        id: document.id,
        filename: document.filename,
        sizeBytes: document.sizeBytes.toString(),
        mimeType: document.mimeType,
        ocrStatus: document.ocrStatus,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/documents/:documentId/ocr',
  authRateLimiter,
  validate(documentIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const doc = await prisma.document.findUnique({
        where: { id: req.params.documentId },
      });

      if (!doc) {
        throw new NotFoundError('Document not found');
      }

      const result = await requestOcrDocument(
        req.params.documentId,
        doc.disputeId,
        doc.uploadedByPartyId
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/documents/:documentId/ocr-status',
  authRateLimiter,
  validate(documentIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const status = await getOcrStatus(req.params.documentId);
      res.json(status);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/disputes/:disputeId/documents',
  authRateLimiter,
  validate(disputeIdParamSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const documents = await prisma.document.findMany({
        where: {
          disputeId: req.params.disputeId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: documents });
    } catch (error) {
      next(error);
    }
  }
);

export { router as documentsRouterV2 };
