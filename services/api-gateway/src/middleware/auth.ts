import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';

export interface AuthUser {
  userId: string;
  role: string;
  appId?: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Extracts and validates authentication from either:
 * - Authorization: Bearer <jwt> header
 * - X-API-Key header (treated as a pre-shared token; validated as JWT internally)
 *
 * On success, attaches decoded payload to req.user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (apiKey) {
    token = apiKey;
  }

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing authentication token. Provide Authorization: Bearer <token> or X-API-Key header.',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError
      ? 'Token has expired'
      : 'Invalid authentication token';

    res.status(401).json({ error: 'Unauthorized', message });
  }
}

/**
 * Optional auth - does not reject unauthenticated requests but attaches user if present.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  let token: string | undefined;
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (apiKey) {
    token = apiKey;
  }

  if (token) {
    try {
      req.user = jwt.verify(token, config.JWT_SECRET) as AuthUser;
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }

  next();
}
