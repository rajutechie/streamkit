import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { moderationRouter } from './routes/moderation.routes.js';
import { contentConsumer } from './consumers/content.consumer.js';

/* ------------------------------------------------------------------ */
/*  Express application                                               */
/* ------------------------------------------------------------------ */

const app = express();

app.use(express.json());

/** Health-check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'moderation-service', timestamp: new Date().toISOString() });
});

/** API routes */
app.use(moderationRouter);

/** Global error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[moderation-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

const server = app.listen(config.PORT, () => {
  console.log(`[moderation-service] HTTP server listening on port ${config.PORT}`);
});

// Start the Kafka content consumer in the background (non-blocking)
contentConsumer.start().catch((err) => {
  console.warn('[moderation-service] Kafka consumer startup failed (service will run without content scanning):', err);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

async function shutdown(signal: string): Promise<void> {
  console.log(`[moderation-service] Received ${signal}, shutting down gracefully...`);
  server.close();
  await contentConsumer.stop();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
