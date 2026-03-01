import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rate-limiter';
import { corsMiddleware } from './middleware/cors';
import { createRoutes } from './routes';

const app = express();

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(corsMiddleware());
app.use(authMiddleware);
app.use(rateLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

app.use('/v1', createRoutes());

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(config.PORT, () => {
  console.log(`API Gateway running on port ${config.PORT}`);
});

export default app;
