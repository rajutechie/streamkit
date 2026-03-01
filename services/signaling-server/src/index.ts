import http from 'node:http';
import { URL } from 'node:url';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import type { RtpParameters, RtpCapabilities, DtlsParameters } from 'mediasoup/node/lib/types.js';
import { config } from './config.js';
import { roomManager } from './room-manager.js';
import { workerManager } from './mediasoup-worker.js';
import { transportManager } from './transport-manager.js';
import { producerManager } from './producer-manager.js';
import { consumerManager } from './consumer-manager.js';

/* ------------------------------------------------------------------ */
/*  Express application (health check only)                           */
/* ------------------------------------------------------------------ */

const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'signaling-server',
    rooms: roomManager.roomCount,
    peers: roomManager.totalPeers,
    timestamp: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------------ */
/*  HTTP server                                                       */
/* ------------------------------------------------------------------ */

const httpServer = http.createServer(app);

/* ------------------------------------------------------------------ */
/*  WebSocket server                                                  */
/* ------------------------------------------------------------------ */

const wss = new WebSocketServer({ server: httpServer });

/** Augmented WebSocket with peer metadata */
interface AuthenticatedSocket extends WebSocket {
  peerId: string;
  userId: string;
  displayName: string;
  currentRoomId?: string;
  isAlive: boolean;
}

/* ------------------------------------------------------------------ */
/*  JWT authentication                                                */
/* ------------------------------------------------------------------ */

interface JwtPayload {
  sub: string;
  name?: string;
  displayName?: string;
  iat?: number;
  exp?: number;
}

function authenticateToken(tokenStr: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(tokenStr, config.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (err) {
    console.warn('[SignalingServer] JWT verification failed:', (err as Error).message);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  WebSocket connection handler                                      */
/* ------------------------------------------------------------------ */

wss.on('connection', (rawWs: WebSocket, req: http.IncomingMessage) => {
  const ws = rawWs as AuthenticatedSocket;

  // Parse JWT from query string
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const token = url.searchParams.get('token');

  if (!token) {
    ws.close(4001, 'Missing authentication token');
    return;
  }

  const payload = authenticateToken(token);
  if (!payload) {
    ws.close(4003, 'Invalid authentication token');
    return;
  }

  // Attach peer metadata
  ws.peerId = uuidv4();
  ws.userId = payload.sub;
  ws.displayName = payload.displayName ?? payload.name ?? payload.sub;
  ws.isAlive = true;

  console.log(`[SignalingServer] WebSocket connected: peer=${ws.peerId} user=${ws.userId}`);

  // Send welcome message
  sendMessage(ws, {
    type: 'welcome',
    peerId: ws.peerId,
    userId: ws.userId,
  });

  // Handle pong for heartbeat
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Handle messages
  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString()) as SignalingMessage;
      handleMessage(ws, message);
    } catch (err) {
      console.error(`[SignalingServer] Invalid message from peer ${ws.peerId}:`, err);
      sendMessage(ws, { type: 'error', message: 'Invalid JSON message' });
    }
  });

  // Handle disconnect
  ws.on('close', (code: number, reason: Buffer) => {
    console.log(`[SignalingServer] WebSocket disconnected: peer=${ws.peerId} code=${code} reason=${reason.toString()}`);
    cleanupPeer(ws);
  });

  ws.on('error', (err: Error) => {
    console.error(`[SignalingServer] WebSocket error for peer ${ws.peerId}:`, err.message);
    cleanupPeer(ws);
  });
});

/* ------------------------------------------------------------------ */
/*  Message types                                                     */
/* ------------------------------------------------------------------ */

interface SignalingMessage {
  type: string;
  requestId?: string;
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Message router                                                    */
/* ------------------------------------------------------------------ */

function handleMessage(ws: AuthenticatedSocket, message: SignalingMessage): void {
  const { type, requestId } = message;

  const dispatch = async (): Promise<void> => {
    switch (type) {
      case 'join_room':         await handleJoinRoom(ws, message, requestId);       break;
      case 'create_transport':  await handleCreateTransport(ws, message, requestId); break;
      case 'connect_transport': await handleConnectTransport(ws, message, requestId); break;
      case 'produce':           await handleProduce(ws, message, requestId);         break;
      case 'consume':           await handleConsume(ws, message, requestId);         break;
      case 'leave_room':        await handleLeaveRoom(ws, message, requestId);       break;
      case 'pause_producer':    await handlePauseProducer(ws, message, requestId);   break;
      case 'resume_producer':   await handleResumeProducer(ws, message, requestId);  break;
      case 'ping':
        sendMessage(ws, { type: 'pong', requestId });
        break;
      default:
        sendMessage(ws, { type: 'error', requestId, message: `Unknown message type: ${type}` });
    }
  };

  dispatch().catch((err: Error) => {
    console.error(`[SignalingServer] Error handling '${type}' from peer ${ws.peerId}:`, err);
    sendMessage(ws, { type: 'error', requestId, message: err.message ?? 'Internal server error' });
  });
}

/* ------------------------------------------------------------------ */
/*  Handlers                                                          */
/* ------------------------------------------------------------------ */

async function handleJoinRoom(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const roomId = message.roomId as string;
  const roomType = (message.roomType as 'call' | 'meeting' | 'stream') ?? 'meeting';

  if (!roomId) {
    sendMessage(ws, { type: 'error', requestId, message: 'roomId is required' });
    return;
  }

  // Create or get room
  const room = roomManager.createRoom(roomId, roomType);

  // Create a mediasoup Router for the room if it doesn't have one yet
  if (!room.routerId) {
    const router = await workerManager.createRouter();
    room.routerId = router.id;
    roomManager.setRouterId(roomId, router.id);
  }

  // Join the room
  const peer = roomManager.joinRoom(roomId, ws.peerId, ws.userId, ws.displayName, ws);
  if (!peer) {
    sendMessage(ws, { type: 'error', requestId, message: 'Failed to join room' });
    return;
  }

  ws.currentRoomId = roomId;

  // Get existing participants (for the joining peer to know about)
  const existingPeers = roomManager.getRoomParticipants(roomId)
    .filter((p) => p.id !== ws.peerId)
    .map((p) => ({
      peerId: p.id,
      userId: p.userId,
      displayName: p.displayName,
      producerIds: p.producerIds,
    }));

  // Return the router's RTP capabilities so the client can build its device
  const router = workerManager.getRouter(room.routerId);
  const routerRtpCapabilities = router?.rtpCapabilities ?? workerManager.mediaCodecs;

  sendMessage(ws, {
    type: 'room_joined',
    requestId,
    roomId,
    roomType: room.type,
    peerId: ws.peerId,
    routerRtpCapabilities,
    existingPeers,
  });
}

async function handleCreateTransport(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const roomId = ws.currentRoomId;
  if (!roomId) {
    sendMessage(ws, { type: 'error', requestId, message: 'Not in a room' });
    return;
  }

  const room = roomManager.getRoom(roomId);
  if (!room || !room.routerId) {
    sendMessage(ws, { type: 'error', requestId, message: 'Room or router not found' });
    return;
  }

  const router = workerManager.getRouter(room.routerId);
  if (!router) {
    sendMessage(ws, { type: 'error', requestId, message: 'Router not available' });
    return;
  }

  const direction = (message.direction as 'send' | 'recv') ?? 'send';
  const transport = await transportManager.createWebRtcTransport(router, ws.peerId, direction);

  // Track transport on the peer
  const peer = roomManager.getPeer(roomId, ws.peerId);
  if (peer) {
    peer.transportIds.push(transport.id);
  }

  sendMessage(ws, {
    type: 'transport_created',
    requestId,
    transportId: transport.id,
    iceParameters: transport.iceParameters,
    iceCandidates: transport.iceCandidates,
    dtlsParameters: transport.dtlsParameters,
    direction,
  });
}

async function handleConnectTransport(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const transportId = message.transportId as string;
  const dtlsParameters = message.dtlsParameters as DtlsParameters;

  if (!transportId || !dtlsParameters) {
    sendMessage(ws, { type: 'error', requestId, message: 'transportId and dtlsParameters are required' });
    return;
  }

  const success = await transportManager.connectTransport(transportId, dtlsParameters);

  sendMessage(ws, {
    type: 'transport_connected',
    requestId,
    transportId,
    connected: success,
  });
}

async function handleProduce(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const transportId = message.transportId as string;
  const kind = message.kind as 'audio' | 'video';
  const rtpParameters = message.rtpParameters as RtpParameters;
  const appData = (message.appData as Record<string, unknown>) ?? {};

  if (!transportId || !kind || !rtpParameters) {
    sendMessage(ws, { type: 'error', requestId, message: 'transportId, kind, and rtpParameters are required' });
    return;
  }

  const producer = await producerManager.produce(transportId, ws.peerId, kind, rtpParameters, appData);

  // Track producer on the peer
  const roomId = ws.currentRoomId;
  if (roomId) {
    const peer = roomManager.getPeer(roomId, ws.peerId);
    if (peer) {
      peer.producerIds.push(producer.id);
    }

    // Notify other peers in the room about the new producer
    roomManager.broadcastToRoom(roomId, ws.peerId, {
      type: 'new_producer',
      peerId: ws.peerId,
      userId: ws.userId,
      displayName: ws.displayName,
      producerId: producer.id,
      kind: producer.kind,
      appData: producer.appData,
    });
  }

  sendMessage(ws, {
    type: 'producer_created',
    requestId,
    producerId: producer.id,
    kind: producer.kind,
  });
}

async function handleConsume(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const transportId = message.transportId as string;
  const producerId = message.producerId as string;
  const rtpCapabilities = message.rtpCapabilities as RtpCapabilities;

  if (!transportId || !producerId || !rtpCapabilities) {
    sendMessage(ws, { type: 'error', requestId, message: 'transportId, producerId, and rtpCapabilities are required' });
    return;
  }

  const roomId = ws.currentRoomId;
  if (!roomId) {
    sendMessage(ws, { type: 'error', requestId, message: 'Not in a room' });
    return;
  }

  const room = roomManager.getRoom(roomId);
  if (!room || !room.routerId) {
    sendMessage(ws, { type: 'error', requestId, message: 'Room or router not found' });
    return;
  }

  const consumer = await consumerManager.consume(transportId, producerId, ws.peerId, rtpCapabilities, room.routerId);

  if (!consumer) {
    sendMessage(ws, { type: 'error', requestId, message: 'Failed to create consumer — check rtpCapabilities' });
    return;
  }

  // Track consumer on the peer
  const peer = roomManager.getPeer(roomId, ws.peerId);
  if (peer) {
    peer.consumerIds.push(consumer.id);
  }

  sendMessage(ws, {
    type: 'consumer_created',
    requestId,
    consumerId: consumer.id,
    producerId: consumer.producerId,
    kind: consumer.kind,
    rtpParameters: consumer.rtpParameters,
  });
}

async function handleLeaveRoom(ws: AuthenticatedSocket, _message: SignalingMessage, requestId?: string): Promise<void> {
  const roomId = ws.currentRoomId;
  if (!roomId) {
    sendMessage(ws, { type: 'error', requestId, message: 'Not in a room' });
    return;
  }

  cleanupPeerFromRoom(ws, roomId);
  ws.currentRoomId = undefined;

  sendMessage(ws, {
    type: 'room_left',
    requestId,
    roomId,
  });
}

async function handlePauseProducer(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const producerId = message.producerId as string;
  if (!producerId) {
    sendMessage(ws, { type: 'error', requestId, message: 'producerId is required' });
    return;
  }

  const success = await producerManager.setPaused(producerId, true);
  if (success && ws.currentRoomId) {
    roomManager.broadcastToRoom(ws.currentRoomId, ws.peerId, {
      type: 'producer_paused',
      peerId: ws.peerId,
      producerId,
    });
  }

  sendMessage(ws, { type: 'producer_paused', requestId, producerId, paused: success });
}

async function handleResumeProducer(ws: AuthenticatedSocket, message: SignalingMessage, requestId?: string): Promise<void> {
  const producerId = message.producerId as string;
  if (!producerId) {
    sendMessage(ws, { type: 'error', requestId, message: 'producerId is required' });
    return;
  }

  const success = await producerManager.setPaused(producerId, false);
  if (success && ws.currentRoomId) {
    roomManager.broadcastToRoom(ws.currentRoomId, ws.peerId, {
      type: 'producer_resumed',
      peerId: ws.peerId,
      producerId,
    });
  }

  sendMessage(ws, { type: 'producer_resumed', requestId, producerId, resumed: success });
}

/* ------------------------------------------------------------------ */
/*  Cleanup                                                           */
/* ------------------------------------------------------------------ */

function cleanupPeerFromRoom(ws: AuthenticatedSocket, roomId: string): void {
  // Close and remove all producers, consumers, and transports for the peer
  producerManager.removeProducersForPeer(ws.peerId);
  consumerManager.removeConsumersForPeer(ws.peerId);
  transportManager.removeTransportsForPeer(ws.peerId);

  // Leave room (notifies remaining participants via broadcast)
  roomManager.leaveRoom(roomId, ws.peerId);
}

function cleanupPeer(ws: AuthenticatedSocket): void {
  if (ws.currentRoomId) {
    cleanupPeerFromRoom(ws, ws.currentRoomId);
    ws.currentRoomId = undefined;
  }

  // Safety net: remove from any rooms where the peer is still listed
  roomManager.removeFromAllRooms(ws.peerId);
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                         */
/* ------------------------------------------------------------------ */

function sendMessage(ws: WebSocket, message: Record<string, unknown>): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

/* ------------------------------------------------------------------ */
/*  Heartbeat (detect dead connections)                               */
/* ------------------------------------------------------------------ */

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((rawWs) => {
    const ws = rawWs as AuthenticatedSocket;
    if (!ws.isAlive) {
      console.log(`[SignalingServer] Terminating dead connection: peer=${ws.peerId}`);
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30_000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

/* ------------------------------------------------------------------ */
/*  Graceful shutdown                                                 */
/* ------------------------------------------------------------------ */

async function shutdown(signal: string): Promise<void> {
  console.log(`[signaling-server] Received ${signal}, shutting down gracefully...`);

  clearInterval(heartbeatInterval);

  // Close all WebSocket connections
  wss.clients.forEach((ws) => {
    ws.close(1001, 'Server shutting down');
  });

  wss.close();
  httpServer.close();

  // Close all mediasoup workers
  await workerManager.close();

  process.exit(0);
}

process.on('SIGTERM', () => { shutdown('SIGTERM').catch(console.error); });
process.on('SIGINT',  () => { shutdown('SIGINT').catch(console.error); });

/* ------------------------------------------------------------------ */
/*  Start                                                             */
/* ------------------------------------------------------------------ */

async function start(): Promise<void> {
  // Initialise mediasoup workers before accepting connections
  await workerManager.init();
  console.log('[signaling-server] mediasoup workers ready');

  httpServer.listen(config.PORT, () => {
    console.log(`[signaling-server] Listening on port ${config.PORT}`);
    console.log(`[signaling-server] WebSocket endpoint: ws://localhost:${config.PORT}?token=<jwt>`);
    console.log(`[signaling-server] Health check: http://localhost:${config.PORT}/health`);
  });
}

start().catch((err: Error) => {
  console.error('[signaling-server] Fatal startup error:', err);
  process.exit(1);
});
