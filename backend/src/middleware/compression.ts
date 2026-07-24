import compression from 'compression';
import { Request, Response } from 'express';

function shouldCompress(req: Request, res: Response) {
  if (req.headers['x-no-compression']) {
    return false;
  }
  return compression.filter(req, res);
}

export const compressionMiddleware = compression({
  filter: shouldCompress,
  level: 6,
  threshold: 1024,
});
