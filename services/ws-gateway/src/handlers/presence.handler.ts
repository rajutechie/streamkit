import type { Server, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { z } from 'zod';
import type { AuthUser } from '../middleware/auth.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const presenceUpdateSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'dnd', 'offline']),
  customMessage: z.string().max(256).optional(),
});

// ── Constants ───────────────────────────────────────────────────────────────

/** TTL for presence hash entries (seconds). Acts as a safety net in case the
 *  disconnect handler never fires (e.g. the process crashes). */
const PRESENCE_TTL_SECONDS = 300;

/** Redis channel prefix for cross-instance presence pub/sub. */
const USER_EVENTS_CHANNEL = 'user:events';

// ── Key helpers ─────────────────────────────────────────────────────────────

function onlineSetKey(appId: string): string {
  return `presence:${appId}:online`;
}

function userPresenceKey(appId: string, userId: string): string {
  return `presence:${appId}:${userId}`;
}

function userEventsChannel(userId: string): string {
  return `${USER_EVENTS_CHANNEL}:${userId}`;
}

// ── Types ───────────────────────────────────────────────────────────────────

interface PresenceData {
  status: string;
  last_seen: string;
  device: string;
  customMessage?: string;
  socketId: string;
}

// ── Handler registration ────────────────────────────────────────────────────

export function registerPresenceHandler(
  io: Server,
  socket: Socket,
  redis: Redis,
  subscriberRedis: Redis,
): void {
  const user = socket.data.user as AuthUser;
  const appId = user.appId ?? 'default';
  const device = (socket.handshake.auth?.device as string) ?? 'unknown';

  // ── On connection: mark user as online ────────────────────────────────

  const goOnline = async (): Promise<void> => {
    const now = new Date().toISOString();

    const presenceData: PresenceData = {
      status: 'online',
      last_seen: now,
      device,
      socketId: socket.id,
    };

    const pipeline = redis.pipeline();
    // Add to the online set for fast membership checks
    pipeline.sadd(onlineSetKey(appId), user.userId);
    // Store detailed presence in a hash
    pipeline.hmset(userPresenceKey(appId, user.userId), presenceData as unknown as Record<string, string>);
    pipeline.expire(userPresenceKey(appId, user.userId), PRESENCE_TTL_SECONDS);
    await pipeline.exec();

    // Join a personal room so other handlers can target this user
    await socket.join(`user:${user.userId}`);

    // Broadcast presence change to everyone who has this user's room in scope
    io.to(`user:${user.userId}`).emit('presence.changed', {
      userId: user.userId,
      status: 'online',
      device,
      last_seen: now,
    });

    // Publish to Redis pub/sub for cross-instance fanout
    await redis.publish(
      userEventsChannel(user.userId),
      JSON.stringify({
        event: 'presence.changed',
        userId: user.userId,
        status: 'online',
        device,
        last_seen: now,
      }),
    );

    console.log(`[presence] user ${user.userId} connected (appId=${appId}, device=${device})`);
  };

  // Execute immediately on connection
  goOnline().catch((err) => {
    console.error('[presence] Failed to set user online:', err);
  });

  // ── Subscribe to cross-instance presence events via Redis pub/sub ─────

  const channel = userEventsChannel(user.userId);

  const onPubSubMessage = (ch: string, message: string): void => {
    if (ch !== channel) return;
    try {
      const data = JSON.parse(message) as { event: string; [key: string]: unknown };
      // Forward to the user's personal room on this instance
      socket.emit(data.event, data);
    } catch {
      console.error('[presence] Failed to parse pub/sub message:', message);
    }
  };

  subscriberRedis.subscribe(channel).catch((err) => {
    console.error(`[presence] Failed to subscribe to ${channel}:`, err);
  });
  subscriberRedis.on('message', onPubSubMessage);

  // ── presence.update ───────────────────────────────────────────────────

  socket.on('presence.update', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = presenceUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { status, customMessage } = parsed.data;
    const now = new Date().toISOString();

    const fields: Record<string, string> = {
      status,
      last_seen: now,
      device,
      socketId: socket.id,
    };
    if (customMessage !== undefined) {
      fields.customMessage = customMessage;
    }

    const pipeline = redis.pipeline();
    pipeline.hmset(userPresenceKey(appId, user.userId), fields);
    pipeline.expire(userPresenceKey(appId, user.userId), PRESENCE_TTL_SECONDS);

    // If status is 'offline' remove from online set, otherwise ensure membership
    if (status === 'offline') {
      pipeline.srem(onlineSetKey(appId), user.userId);
    } else {
      pipeline.sadd(onlineSetKey(appId), user.userId);
    }
    await pipeline.exec();

    const changePayload = {
      userId: user.userId,
      status,
      customMessage,
      device,
      last_seen: now,
    };

    io.to(`user:${user.userId}`).emit('presence.changed', changePayload);

    await redis.publish(
      userEventsChannel(user.userId),
      JSON.stringify({ event: 'presence.changed', ...changePayload }),
    );

    console.log(`[presence] user ${user.userId} updated status to ${status}`);
    ack?.({ ok: true });
  });

  // ── On disconnect ─────────────────────────────────────────────────────

  socket.on('disconnect', async () => {
    const now = new Date().toISOString();

    // Check if the user still has other active sockets (multi-device)
    const userRoom = io.sockets.adapter.rooms.get(`user:${user.userId}`);
    const remainingSockets = userRoom ? userRoom.size : 0;

    if (remainingSockets === 0) {
      // No more sockets for this user on any instance-local room; mark offline
      const pipeline = redis.pipeline();
      pipeline.srem(onlineSetKey(appId), user.userId);
      pipeline.hmset(userPresenceKey(appId, user.userId), {
        status: 'offline',
        last_seen: now,
      });
      // Keep the hash around for a while so last_seen is queryable
      pipeline.expire(userPresenceKey(appId, user.userId), 86_400); // 24 h
      await pipeline.exec();

      const changePayload = {
        userId: user.userId,
        status: 'offline',
        last_seen: now,
      };

      io.to(`user:${user.userId}`).emit('presence.changed', changePayload);

      await redis.publish(
        userEventsChannel(user.userId),
        JSON.stringify({ event: 'presence.changed', ...changePayload }),
      );

      console.log(`[presence] user ${user.userId} disconnected (offline)`);
    } else {
      console.log(
        `[presence] user ${user.userId} disconnected socket ${socket.id} but still has ${remainingSockets} active socket(s)`,
      );
    }

    // Clean up pub/sub listener for this socket
    subscriberRedis.off('message', onPubSubMessage);
    subscriberRedis.unsubscribe(channel).catch((err) => {
      console.error(`[presence] Failed to unsubscribe from ${channel}:`, err);
    });
  });
}
