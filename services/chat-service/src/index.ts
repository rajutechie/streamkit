import express, { Request, Response, NextFunction } from 'express';
import { config } from './config/index.js';
import { channelRoutes } from './routes/channel.routes.js';
import { messageRoutes } from './routes/message.routes.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use(express.json());

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'chat-service',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Channel routes are mounted at / (paths already include /channels prefix)
app.use('/', channelRoutes);

// Message routes are mounted under /channels (paths start with /:id/messages)
app.use('/channels', messageRoutes);

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[chat-service] Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV !== 'production' ? err.message : undefined,
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(config.PORT, () => {
  console.log(`[chat-service] Listening on port ${config.PORT}`);
});

export default app;
