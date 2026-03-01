import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { notificationRouter } from './routes/notification.routes.js';
import { eventConsumer } from './consumers/event.consumer.js';

/* ------------------------------------------------------------------ */
/*  Express application                                               */
/* ------------------------------------------------------------------ */

const app = express();

app.use(express.json());

/** Health-check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

/** API routes */
app.use(notificationRouter);

/** Global error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[notification-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

const server = app.listen(config.PORT, () => {
  console.log(`[notification-service] HTTP server listening on port ${config.PORT}`);
});

// Start the Kafka event consumer in the background (non-blocking)
eventConsumer.start().catch((err) => {
  console.warn('[notification-service] Kafka consumer startup failed (service will run without event consumption):', err);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

async function shutdown(signal: string): Promise<void> {
  console.log(`[notification-service] Received ${signal}, shutting down gracefully...`);
  server.close();
  await eventConsumer.stop();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
