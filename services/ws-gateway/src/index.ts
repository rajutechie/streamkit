import { createServer } from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Kafka, logLevel as KafkaLogLevel } from 'kafkajs';
import { config, getKafkaBrokers, getCorsOrigins } from './config/index.js';
import { authMiddleware } from './middleware/auth.js';
import { registerChatHandler } from './handlers/chat.handler.js';
import { registerPresenceHandler } from './handlers/presence.handler.js';
import { registerCallHandler } from './handlers/call.handler.js';
import { registerMeetingHandler } from './handlers/meeting.handler.js';

// ── Express HTTP layer (health check, metrics) ─────────────────────────────

const app = express();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ws-gateway',
    uptime: process.uptime(),
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready', reason: 'redis unavailable' });
  }
});

// ── HTTP server ─────────────────────────────────────────────────────────────

const httpServer = createServer(app);

// ── Redis connections ───────────────────────────────────────────────────────

const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    console.log(`[redis] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  lazyConnect: false,
});

redis.on('connect', () => console.log('[redis] Connected'));
redis.on('error', (err) => console.error('[redis] Error:', err.message));

// Dedicated pub/sub client for the Socket.IO Redis adapter
const pubClient = new Redis(config.REDIS_URL);
const subClient = new Redis(config.REDIS_URL);

// Dedicated subscriber client for presence cross-instance pub/sub
// (separate from the adapter's sub client because a client in subscribe mode
//  cannot issue regular commands)
const presenceSubscriber = new Redis(config.REDIS_URL);

// ── Socket.IO server ────────────────────────────────────────────────────────

const corsOrigins = getCorsOrigins(config);

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Transport configuration
  transports: ['websocket', 'polling'],
  // Ping/pong heartbeat configuration
  pingInterval: config.WS_HEARTBEAT_INTERVAL,
  pingTimeout: 10_000,
  // Connection limits
  maxHttpBufferSize: 1e6, // 1 MB max payload
  connectTimeout: 10_000,
  // Allow v4 client compatibility
  allowEIO3: false,
});

// Attach the Redis adapter for multi-instance horizontal scaling
io.adapter(createAdapter(pubClient, subClient));

// ── Connection tracking for max connections enforcement ─────────────────────

let activeConnections = 0;

// ── Authentication middleware ────────────────────────────────────────────────

io.use((socket, next) => {
  // Enforce max connections before auth to avoid wasting resources
  if (activeConnections >= config.WS_MAX_CONNECTIONS) {
    const err = new Error('Server at capacity');
    (err as Error & { data: unknown }).data = { code: 'SERVER_AT_CAPACITY' };
    next(err);
    return;
  }
  next();
});

io.use(authMiddleware);

// ── Kafka producer ──────────────────────────────────────────────────────────

const kafka = new Kafka({
  clientId: 'ws-gateway',
  brokers: getKafkaBrokers(config),
  logLevel: KafkaLogLevel.WARN,
  retry: {
    initialRetryTime: 300,
    retries: 5,
  },
});

const kafkaProducer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30_000,
});

// ── Register connection handler ─────────────────────────────────────────────

io.on('connection', (socket) => {
  activeConnections++;
  const user = socket.data.user;

  console.log(
    `[ws] Connected: socket=${socket.id} user=${user?.userId ?? 'unknown'} ` +
      `transport=${socket.conn.transport.name} active=${activeConnections}`,
  );

  // Join user-specific room for targeted messaging
  socket.join(`user:${user.userId}`);

  // Register domain handlers
  registerChatHandler(io, socket, redis, kafkaProducer);
  registerPresenceHandler(io, socket, redis, presenceSubscriber);
  registerCallHandler(io, socket, redis);
  registerMeetingHandler(io, socket, redis);

  // ── Built-in ping/pong (in addition to Socket.IO engine-level heartbeats)
  socket.on('ping', (ack) => {
    if (typeof ack === 'function') {
      ack({ pong: true, timestamp: Date.now() });
    } else {
      socket.emit('pong', { timestamp: Date.now() });
    }
  });

  // ── Error handler per socket
  socket.on('error', (err) => {
    console.error(`[ws] Socket error: socket=${socket.id} user=${user?.userId}`, err);
  });

  // ── Disconnect
  socket.on('disconnect', (reason) => {
    activeConnections = Math.max(0, activeConnections - 1);
    console.log(
      `[ws] Disconnected: socket=${socket.id} user=${user?.userId} ` +
        `reason=${reason} active=${activeConnections}`,
    );
  });
});

// ── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`\n[ws-gateway] Received ${signal}, shutting down gracefully...`);

  // Stop accepting new connections
  io.close();

  // Disconnect Kafka
  try {
    await kafkaProducer.disconnect();
    console.log('[kafka] Producer disconnected');
  } catch (err) {
    console.error('[kafka] Error disconnecting producer:', err);
  }

  // Close Redis connections
  try {
    presenceSubscriber.disconnect();
    subClient.disconnect();
    pubClient.disconnect();
    redis.disconnect();
    console.log('[redis] All connections closed');
  } catch (err) {
    console.error('[redis] Error closing connections:', err);
  }

  httpServer.close(() => {
    console.log('[ws-gateway] HTTP server closed');
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    console.error('[ws-gateway] Forceful shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ── Startup ─────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // Connect Kafka producer
  try {
    await kafkaProducer.connect();
    console.log('[kafka] Producer connected');
  } catch (err) {
    console.error('[kafka] Failed to connect producer:', err);
    console.warn('[kafka] Continuing without Kafka -- messages will not be persisted');
  }

  // Start HTTP + WebSocket server
  httpServer.listen(config.PORT, () => {
    console.log(`[ws-gateway] Listening on port ${config.PORT}`);
    console.log(`[ws-gateway] Max connections: ${config.WS_MAX_CONNECTIONS}`);
    console.log(`[ws-gateway] Heartbeat interval: ${config.WS_HEARTBEAT_INTERVAL}ms`);
    console.log(`[ws-gateway] CORS origins: ${JSON.stringify(corsOrigins)}`);
  });
}

start().catch((err) => {
  console.error('[ws-gateway] Fatal startup error:', err);
  process.exit(1);
});

export { io, httpServer, app };
