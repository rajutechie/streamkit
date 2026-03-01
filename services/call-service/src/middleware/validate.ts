import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Generic Zod validation middleware factory.
 *
 * Returns Express middleware that validates `req.body` against the provided
 * schema.  On success the parsed (and potentially transformed) body is written
 * back to `req.body` so downstream handlers receive clean, typed data.
 *
 * On failure a 400 response is returned with structured validation errors.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body);
      req.body = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        });
        return;
      }
      next(error);
    }
  };
}
