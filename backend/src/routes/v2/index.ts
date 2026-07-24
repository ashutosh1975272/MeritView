import { Router } from 'express';
import { invitationsRouter } from './invitations.routes';
import { documentsRouterV2 } from './documents.routes';

const router = Router() as ReturnType<typeof Router>;

router.use(invitationsRouter);
router.use(documentsRouterV2);

router.get('/version', (req, res) => {
  res.json({
    version: '2.0.0',
    name: 'MeritView API v2',
    changelog: [
      'Added two-party invitation system',
      'Added document upload and OCR endpoints',
      'Added WebSocket brief prep support',
      'Added pricing tier selection',
      'Added all 3 dispute categories',
    ],
    deprecation: 'v1 will be supported until July 2027',
  });
});

export { router as v2Router };
