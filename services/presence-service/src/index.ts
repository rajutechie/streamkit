import express, { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from './config/index.js';
import { createPresenceRouter } from './routes/presence.routes.js';

/* ------------------------------------------------------------------ */
/*  Redis client                                                      */
/* ------------------------------------------------------------------ */

const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('connect', () => console.log('[presence-service] Redis connected'));
redis.on('error', (err) => console.error('[presence-service] Redis error:', err.message));

/* ------------------------------------------------------------------ */
/*  Express application                                               */
/* ------------------------------------------------------------------ */

const app = express();

app.use(express.json());

/** Health-check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'presence-service', timestamp: new Date().toISOString() });
});

/** API routes (Redis client injected via factory) */
app.use(createPresenceRouter(redis));

/** Global error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[presence-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

const server = app.listen(config.PORT, () => {
  console.log(`[presence-service] HTTP server listening on port ${config.PORT}`);
  console.log(`[presence-service] Presence TTL: ${config.PRESENCE_TTL_SECONDS}s`);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

async function shutdown(): Promise<void> {
  console.log('[presence-service] Shutting down gracefully...');
  server.close(async () => {
    await redis.quit();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
