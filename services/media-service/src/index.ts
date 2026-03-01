import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { mediaRouter } from './routes/media.routes.js';

/* ------------------------------------------------------------------ */
/*  Express application                                               */
/* ------------------------------------------------------------------ */

const app = express();

app.use(express.json());

/** Health-check endpoint */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'media-service', timestamp: new Date().toISOString() });
});

/** API routes */
app.use(mediaRouter);

/** Global error handler */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[media-service] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

const server = app.listen(config.PORT, () => {
  console.log(`[media-service] HTTP server listening on port ${config.PORT}`);
  console.log(`[media-service] S3 endpoint: ${config.S3_ENDPOINT}`);
  console.log(`[media-service] S3 bucket: ${config.S3_BUCKET_MEDIA}`);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

process.on('SIGTERM', () => {
  console.log('[media-service] Received SIGTERM, shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('[media-service] Received SIGINT, shutting down gracefully...');
  server.close(() => process.exit(0));
});
