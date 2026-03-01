import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { usageConsumer } from './consumers/usage.consumer.js';

/* ------------------------------------------------------------------ */
/*  Express application                                               */
/* ------------------------------------------------------------------ */

const app = express();

app.use(express.json());

/** Health-check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'analytics-service', timestamp: new Date().toISOString() });
});

/** API routes */
app.use(analyticsRouter);
app.use(billingRouter);

/** Global error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[analytics-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

const server = app.listen(config.PORT, () => {
  console.log(`[analytics-service] HTTP server listening on port ${config.PORT}`);
});

// Start the Kafka usage consumer in the background (non-blocking)
usageConsumer.start().catch((err) => {
  console.warn('[analytics-service] Kafka consumer startup failed (service will run without event consumption):', err);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

async function shutdown(signal: string): Promise<void> {
  console.log(`[analytics-service] Received ${signal}, shutting down gracefully...`);
  server.close();
  await usageConsumer.stop();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
