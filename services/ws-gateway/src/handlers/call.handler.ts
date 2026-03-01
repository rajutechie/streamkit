import type { Server, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { z } from 'zod';
import type { AuthUser } from '../middleware/auth.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const callSignalSchema = z.object({
  callId: z.string().min(1).max(256),
  targetUserId: z.string().min(1).max(256).optional(),
  signalType: z.enum([
    'offer',
    'answer',
    'ice-candidate',
    'renegotiate',
    'hangup',
    'reject',
    'busy',
  ]),
  payload: z.record(z.unknown()),
});

const callJoinSchema = z.object({
  callId: z.string().min(1).max(256),
});

const callLeaveSchema = z.object({
  callId: z.string().min(1).max(256),
});

// ── Key helpers ─────────────────────────────────────────────────────────────

function callRoomKey(callId: string): string {
  return `call:${callId}`;
}

function callParticipantsKey(callId: string): string {
  return `call:participants:${callId}`;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** TTL for call participant tracking (seconds). Cleans up if no one leaves gracefully. */
const CALL_TTL_SECONDS = 3_600; // 1 hour

// ── Handler registration ────────────────────────────────────────────────────

export function registerCallHandler(
  io: Server,
  socket: Socket,
  redis: Redis,
): void {
  const user = socket.data.user as AuthUser;

  // ── call.join ─────────────────────────────────────────────────────────

  socket.on('call.join', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = callJoinSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { callId } = parsed.data;
    const room = callRoomKey(callId);

    await socket.join(room);

    // Track participant in Redis hash
    const pipeline = redis.pipeline();
    pipeline.hset(callParticipantsKey(callId), user.userId, JSON.stringify({
      socketId: socket.id,
      joinedAt: new Date().toISOString(),
      device: (socket.handshake.auth?.device as string) ?? 'unknown',
    }));
    pipeline.expire(callParticipantsKey(callId), CALL_TTL_SECONDS);
    await pipeline.exec();

    // Notify existing participants
    socket.to(room).emit('call.participant.joined', {
      callId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    // Return current participants to the joining user
    const participants = await redis.hkeys(callParticipantsKey(callId));

    console.log(`[call] user ${user.userId} joined call ${callId}`);
    ack?.({ ok: true, callId, participants });
  });

  // ── call.signal ───────────────────────────────────────────────────────

  socket.on('call.signal', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = callSignalSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { callId, targetUserId, signalType, payload: signalPayload } = parsed.data;
    const room = callRoomKey(callId);

    const signalData = {
      callId,
      fromUserId: user.userId,
      signalType,
      payload: signalPayload,
      timestamp: new Date().toISOString(),
    };

    if (targetUserId) {
      // Direct signaling to a specific peer (1:1 or targeted within group call)
      io.to(`user:${targetUserId}`).emit('call.signal', signalData);
    } else {
      // Broadcast to all other participants in the call
      socket.to(room).emit('call.signal', signalData);
    }

    console.log(
      `[call] user ${user.userId} sent ${signalType} signal in call ${callId}` +
        (targetUserId ? ` to ${targetUserId}` : ' (broadcast)'),
    );
    ack?.({ ok: true });
  });

  // ── call.leave ────────────────────────────────────────────────────────

  socket.on('call.leave', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = callLeaveSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { callId } = parsed.data;
    await leaveCall(io, socket, redis, user, callId);
    ack?.({ ok: true, callId });
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────────

  socket.on('disconnecting', async () => {
    for (const room of socket.rooms) {
      if (room.startsWith('call:') && !room.startsWith('call:participants:')) {
        const callId = room.slice('call:'.length);
        await leaveCall(io, socket, redis, user, callId);
      }
    }
  });
}

// ── Shared leave logic ──────────────────────────────────────────────────────

async function leaveCall(
  io: Server,
  socket: Socket,
  redis: Redis,
  user: AuthUser,
  callId: string,
): Promise<void> {
  const room = callRoomKey(callId);

  await socket.leave(room);
  await redis.hdel(callParticipantsKey(callId), user.userId);

  // Notify remaining participants
  io.to(room).emit('call.participant.left', {
    callId,
    userId: user.userId,
    timestamp: new Date().toISOString(),
  });

  // If no participants remain, clean up the Redis key
  const remaining = await redis.hlen(callParticipantsKey(callId));
  if (remaining === 0) {
    await redis.del(callParticipantsKey(callId));
    console.log(`[call] call ${callId} ended (no participants remaining)`);
  }

  console.log(`[call] user ${user.userId} left call ${callId}`);
}
