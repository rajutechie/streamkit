import type { Request, Response, NextFunction } from 'express';
import { verifyWebhookSignature } from '@rajutechie-streamkit/server-sdk';
import type { WebhookEvent } from '@rajutechie-streamkit/server-sdk';

export interface WebhookMiddlewareConfig {
  secret: string;
  tolerance?: number;
}

export function streamKitWebhook(config: WebhookMiddlewareConfig) {
  return (req: Request & { rajutechie-streamkitEvent?: WebhookEvent }, res: Response, next: NextFunction) => {
    const signature = req.headers['x-rajutechie-streamkit-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing X-RajutechieStreamKit-Signature header' });
      return;
    }

    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      try {
        const event = verifyWebhookSignature(body, signature, config.secret, config.tolerance);
        req.rajutechie-streamkitEvent = event;
        next();
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    });
  };
}

export type { WebhookEvent };
