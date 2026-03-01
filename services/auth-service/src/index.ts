import express, { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { config } from './config/index.js';
import { createAuthRouter } from './routes/auth.routes.js';

// ---------------------------------------------------------------------------
// Redis client
// ---------------------------------------------------------------------------

const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 10) {
      console.error('[redis] Max reconnection attempts reached – giving up');
      return null;
    }
    const delay = Math.min(times * 200, 5000);
    console.warn(`[redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  lazyConnect: true,
});

redis.on('connect', () => console.log('[redis] Connected'));
redis.on('error', (err) => console.error('[redis] Error:', err.message));

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------

const app = express();

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  const redisStatus = redis.status === 'ready' ? 'connected' : redis.status;
  res.status(200).json({
    service: 'auth-service',
    status: 'healthy',
    version: '0.1.0',
    uptime: process.uptime(),
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

app.use('/auth', createAuthRouter(redis));

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
  });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // Attempt Redis connection – the service can still start without it but
    // token revocation / blacklisting will be unavailable.
    try {
      await redis.connect();
    } catch (err) {
      console.warn('[redis] Initial connection failed – running without Redis:', (err as Error).message);
    }

    app.listen(config.PORT, () => {
      console.log(`[auth-service] Listening on port ${config.PORT}`);
      console.log(`[auth-service] Health check: http://localhost:${config.PORT}/health`);
    });
  } catch (err) {
    console.error('[auth-service] Failed to start:', err);
    process.exit(1);
  }
}

start();

export { app };
