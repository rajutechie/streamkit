import { createHmac, timingSafeEqual } from 'crypto';
import type { IncomingMessage, ServerResponse } from 'http';

export interface WebhookEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  secret: string;
  tolerance?: number; // max age in seconds, default 300
}

export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  tolerance: number = 300,
): WebhookEvent {
  const parts = signature.split(',');
  const timestampPart = parts.find((p) => p.startsWith('t='));
  const signaturePart = parts.find((p) => p.startsWith('v1='));

  if (!timestampPart || !signaturePart) {
    throw new Error('Invalid webhook signature format');
  }

  const timestamp = parseInt(timestampPart.slice(2), 10);
  const expectedSig = signaturePart.slice(3);

  // Check timestamp tolerance
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > tolerance) {
    throw new Error('Webhook timestamp outside tolerance');
  }

  // Compute HMAC
  const body = typeof payload === 'string' ? payload : payload.toString('utf-8');
  const signedPayload = `${timestamp}.${body}`;
  const computedSig = createHmac('sha256', secret).update(signedPayload).digest('hex');

  // Constant-time comparison
  const expected = Buffer.from(expectedSig, 'hex');
  const computed = Buffer.from(computedSig, 'hex');

  if (expected.length !== computed.length || !timingSafeEqual(expected, computed)) {
    throw new Error('Webhook signature verification failed');
  }

  return JSON.parse(body) as WebhookEvent;
}

export function webhookMiddleware(config: WebhookConfig) {
  return (req: IncomingMessage & { body?: unknown; rajutechie-streamkitEvent?: WebhookEvent }, res: ServerResponse, next: (err?: Error) => void) => {
    const signature = (req.headers['x-rajutechie-streamkit-signature'] as string) ?? '';
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      try {
        const event = verifyWebhookSignature(body, signature, config.secret, config.tolerance);
        req.rajutechie-streamkitEvent = event;
        req.body = event;
        next();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: (err as Error).message }));
      }
    });
  };
}

export function generateWebhookSignature(payload: string, secret: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
