import express, { type Express, Request, Response, NextFunction } from 'express';
import { Kafka, Producer, logLevel } from 'kafkajs';
import { config } from './config/index.js';
import { createUserRouter } from './routes/user.routes.js';
import { createDeviceRouter } from './routes/device.routes.js';

// ---------------------------------------------------------------------------
// Kafka producer
// ---------------------------------------------------------------------------

const kafka = new Kafka({
  clientId: 'user-service',
  brokers: config.KAFKA_BROKERS,
  logLevel: logLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 10,
  },
});

let producer: Producer | null = null;

async function initKafka(): Promise<Producer | null> {
  try {
    const p = kafka.producer({
      allowAutoTopicCreation: true,
      transactionTimeout: 30000,
    });
    await p.connect();
    console.log('[kafka] Producer connected');
    return p;
  } catch (err) {
    console.warn('[kafka] Producer connection failed – running without Kafka:', (err as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Express application
// ---------------------------------------------------------------------------

const app: Express = express();

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    service: 'user-service',
    status: 'healthy',
    version: '0.1.0',
    uptime: process.uptime(),
    kafka: producer ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Routes – mounted after Kafka initialisation (see start())
// ---------------------------------------------------------------------------

function mountRoutes(): void {
  // User CRUD
  app.use('/users', createUserRouter(producer));

  // Device management (nested under /users)
  app.use('/users', createDeviceRouter());

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({
      error: 'Internal server error',
      ...(process.env.NODE_ENV !== 'production' && { message: err.message }),
    });
  });
}

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  try {
    // Initialise Kafka – non-fatal if it fails
    producer = await initKafka();

    // Mount routes (needs producer reference)
    mountRoutes();

    app.listen(config.PORT, () => {
      console.log(`[user-service] Listening on port ${config.PORT}`);
      console.log(`[user-service] Health check: http://localhost:${config.PORT}/health`);
    });
  } catch (err) {
    console.error('[user-service] Failed to start:', err);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('[user-service] Shutting down...');
  if (producer) {
    try {
      await producer.disconnect();
      console.log('[kafka] Producer disconnected');
    } catch {
      // Ignore errors during shutdown
    }
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

export { app };
