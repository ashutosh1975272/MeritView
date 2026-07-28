import { Request, Response, NextFunction } from 'express';
import { getSupportedLocales } from '../utils/translations';

export interface LocalizedRequest extends Request {
  locale: string;
}

export function i18nMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const supportedLocales = getSupportedLocales();
  const acceptLanguage = req.headers['accept-language'] || 'en-US';

  const preferred = acceptLanguage
    .split(',')
    .map(l => {
      const [lang, q] = l.trim().split(';q=');
      return { lang: lang.split('-')[0], full: lang, quality: q ? parseFloat(q) : 1.0 };
    })
    .sort((a, b) => b.quality - a.quality);

  let locale = 'en-US';
  for (const p of preferred) {
    if (supportedLocales.includes(p.full)) {
      locale = p.full;
      break;
    }
    if (supportedLocales.includes(p.lang)) {
      locale = p.lang;
      break;
    }
  }

  (req as LocalizedRequest).locale = locale;
  next();
}
