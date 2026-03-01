import type { Request, Response, NextFunction } from 'express';
import { RajutechieStreamKitServer } from '@rajutechie-streamkit/server-sdk';

export interface RajutechieStreamKitMiddlewareConfig {
  apiKey: string;
  apiSecret: string;
}

export function streamKitAuth(config: RajutechieStreamKitMiddlewareConfig) {
  const server = new RajutechieStreamKitServer({
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
  });

  return (req: Request & { rajutechie-streamkitUser?: Record<string, unknown> }, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    try {
      const token = authHeader.slice(7);
      const decoded = server.verifyToken(token);
      req.rajutechie-streamkitUser = decoded as Record<string, unknown>;
      next();
    } catch {
      next();
    }
  };
}

export function requireRajutechieStreamKitAuth() {
  return (req: Request & { rajutechie-streamkitUser?: Record<string, unknown> }, res: Response, next: NextFunction) => {
    if (!req.rajutechie-streamkitUser) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    next();
  };
}
