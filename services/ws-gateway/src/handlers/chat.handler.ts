import type { Server, Socket } from 'socket.io';
import type { Producer } from 'kafkajs';
import type Redis from 'ioredis';
import { z } from 'zod';
import type { AuthUser } from '../middleware/auth.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const subscribeSchema = z.object({
  channelId: z.string().min(1).max(256),
});

const unsubscribeSchema = z.object({
  channelId: z.string().min(1).max(256),
});

const messageSendSchema = z.object({
  channelId: z.string().min(1).max(256),
  message: z.object({
    id: z.string().uuid().optional(),
    type: z.enum(['text', 'image', 'file', 'system']).default('text'),
    content: z.string().min(1).max(10_000),
    metadata: z.record(z.unknown()).optional(),
  }),
});

const typingSchema = z.object({
  channelId: z.string().min(1).max(256),
});

// ── Constants ───────────────────────────────────────────────────────────────

const TYPING_TTL_SECONDS = 5;
const KAFKA_TOPIC = 'chat.messages';

// ── Helper ──────────────────────────────────────────────────────────────────

function roomKey(channelId: string): string {
  return `channel:${channelId}`;
}

function typingKey(channelId: string): string {
  return `typing:${channelId}`;
}

function channelMembersKey(channelId: string): string {
  return `channel:members:${channelId}`;
}

// ── Handler registration ────────────────────────────────────────────────────

export function registerChatHandler(
  io: Server,
  socket: Socket,
  redis: Redis,
  kafkaProducer: Producer,
): void {
  const user = socket.data.user as AuthUser;

  // ── subscribe ─────────────────────────────────────────────────────────

  socket.on('subscribe', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = subscribeSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { channelId } = parsed.data;
    const room = roomKey(channelId);

    await socket.join(room);

    // Track membership in Redis so other services can query it
    await redis.sadd(channelMembersKey(channelId), user.userId);

    console.log(`[chat] user ${user.userId} subscribed to ${room}`);
    ack?.({ ok: true, channelId });
  });

  // ── unsubscribe ───────────────────────────────────────────────────────

  socket.on('unsubscribe', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = unsubscribeSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { channelId } = parsed.data;
    const room = roomKey(channelId);

    await socket.leave(room);
    await redis.srem(channelMembersKey(channelId), user.userId);

    // Clean up typing indicator on leave
    await redis.hdel(typingKey(channelId), user.userId);

    console.log(`[chat] user ${user.userId} unsubscribed from ${room}`);
    ack?.({ ok: true, channelId });
  });

  // ── message.send ──────────────────────────────────────────────────────

  socket.on('message.send', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = messageSendSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { channelId, message } = parsed.data;
    const room = roomKey(channelId);

    const messageId = message.id ?? crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const fullMessage = {
      id: messageId,
      channelId,
      userId: user.userId,
      type: message.type,
      content: message.content,
      metadata: message.metadata ?? {},
      timestamp,
    };

    // Broadcast to all subscribers in the room (including sender for confirmation)
    io.to(room).emit('message.received', fullMessage);

    // Clear typing indicator on send
    await redis.hdel(typingKey(channelId), user.userId);

    // Publish to Kafka for persistence and downstream processing
    try {
      await kafkaProducer.send({
        topic: KAFKA_TOPIC,
        messages: [
          {
            key: channelId,
            value: JSON.stringify(fullMessage),
            headers: {
              'event-type': 'message.send',
              'user-id': user.userId,
              'app-id': user.appId ?? '',
            },
          },
        ],
      });
    } catch (err) {
      console.error('[chat] Failed to publish message to Kafka:', err);
      // Message is already broadcast via Socket.IO; Kafka failure is non-blocking
      // but we log for alerting / retry mechanisms
    }

    console.log(`[chat] user ${user.userId} sent message ${messageId} to ${room}`);
    ack?.({ ok: true, messageId, timestamp });
  });

  // ── typing.start ──────────────────────────────────────────────────────

  socket.on('typing.start', async (payload: unknown) => {
    const parsed = typingSchema.safeParse(payload);
    if (!parsed.success) return;

    const { channelId } = parsed.data;
    const room = roomKey(channelId);

    // Store in Redis hash with an expiration so stale entries clean up automatically.
    // We use a per-user field so multiple users can type simultaneously.
    const pipeline = redis.pipeline();
    pipeline.hset(typingKey(channelId), user.userId, Date.now().toString());
    pipeline.expire(typingKey(channelId), TYPING_TTL_SECONDS);
    await pipeline.exec();

    // Broadcast to others in the room (not the sender)
    socket.to(room).emit('typing.started', {
      channelId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });
  });

  // ── typing.stop ───────────────────────────────────────────────────────

  socket.on('typing.stop', async (payload: unknown) => {
    const parsed = typingSchema.safeParse(payload);
    if (!parsed.success) return;

    const { channelId } = parsed.data;
    const room = roomKey(channelId);

    await redis.hdel(typingKey(channelId), user.userId);

    socket.to(room).emit('typing.stopped', {
      channelId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────────

  socket.on('disconnecting', async () => {
    // socket.rooms includes every room the socket is about to leave
    for (const room of socket.rooms) {
      if (room.startsWith('channel:')) {
        const channelId = room.slice('channel:'.length);
        await redis.srem(channelMembersKey(channelId), user.userId);
        await redis.hdel(typingKey(channelId), user.userId);
      }
    }
  });
}
