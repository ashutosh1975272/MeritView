import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten().fieldErrors;
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateBody(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten().fieldErrors;
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateQuery(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten().fieldErrors;
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.flatten().fieldErrors;
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}