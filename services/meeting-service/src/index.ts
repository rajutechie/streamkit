import express from 'express';
import { config } from './config/index.js';
import { meetingRouter } from './routes/meeting.routes.js';
import { pollRouter } from './routes/poll.routes.js';

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'meeting-service',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/', meetingRouter);
app.use('/', pollRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`Meeting service running on port ${config.PORT}`);
});

export default app;
