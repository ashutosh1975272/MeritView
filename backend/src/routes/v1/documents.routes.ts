import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';
import { createUploadUrl, handleLocalUpload, getDownloadUrl } from '../../services/documents/index.js';
import { verifyDisputeOwnership } from '../../services/disputes/index.js';
import { processDocumentOcr, getOcrText } from '../../services/documents/ocr.js';
import { prisma } from '../../db/prisma.js';
import { NotFoundError, ForbiddenError } from '../../utils/errors.js';

const router: Router = Router();
const upload = multer(); // Memory storage for local mock

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/rtf',
];

router.post(
  '/v1/disputes/:disputeId/documents',
  authMiddleware(),
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'description', maxCount: 1 },
    { name: 'extract_text', maxCount: 1 },
  ]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const userId = req.user!.id;

      await verifyDisputeOwnership(disputeId, userId);

      const partyRecord = await prisma.party.findFirst({
        where: { disputeId, userId },
      });

      if (!partyRecord) {
        return res.status(403).json({ error: { message: 'User is not a party to this dispute' } });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const file = files?.file?.[0];

      if (!file) {
        return res.status(400).json({ error: { message: 'No file uploaded' } });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return res.status(400).json({ error: { message: `Unsupported file type: ${file.mimetype}` } });
      }

      const description = req.body.description as string | undefined;
      const extractText = req.body.extract_text === 'true' || req.body.extract_text === true;

      const result = await createUploadUrl(disputeId, userId, partyRecord.id, file.originalname, file.mimetype, file.size, description);
      await handleLocalUpload(result.documentId, file.buffer, extractText);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// Local mock upload endpoint (In production, client uploads directly to S3 via presigned URL)
router.post(
  '/v1/documents/:documentId/upload',
  authMiddleware(),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      
      if (!req.file) {
        return res.status(400).json({ error: { message: 'No file uploaded' } });
      }

      await handleLocalUpload(documentId, req.file.buffer);
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/disputes/:disputeId/documents',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { disputeId } = req.params;
      const userId = req.user!.id;

      await verifyDisputeOwnership(disputeId, userId);
      const documents = await prisma.document.findMany({ where: { disputeId } });
      res.json(documents);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/documents/:documentId',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const userId = req.user!.id;

      const document = await prisma.document.findUnique({
        where: { id: documentId },
        include: { dispute: { select: { initiatorUserId: true, parties: { where: { userId }, select: { id: true } } } } },
      });

      if (!document) {
        throw new NotFoundError('Document not found');
      }

      const isInitiator = document.dispute.initiatorUserId === userId;
      const isParty = document.dispute.parties.length > 0;

      if (!isInitiator && !isParty) {
        throw new ForbiddenError('You do not have access to this document');
      }

      const { dispute: _dispute, ...docMeta } = document;
      res.json(docMeta);
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/v1/documents/:documentId/ocr',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const result = await processDocumentOcr(documentId);
      res.json({ storageKey: result, status: 'PROCESSING' });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/documents/:documentId/ocr-text',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const result = await getOcrText(documentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/v1/documents/:documentId/download',
  authMiddleware(),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.params;
      const result = await getDownloadUrl(documentId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

export const documentRouter = router;
