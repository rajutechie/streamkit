import express from 'express';
import { config } from './config/index.js';
import { streamRouter } from './routes/stream.routes.js';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'stream-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', streamRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`Stream service running on port ${config.PORT}`);
});

export default app;
