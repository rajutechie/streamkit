import type { Server, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { z } from 'zod';
import type { AuthUser } from '../middleware/auth.js';

// ── Validation schemas ──────────────────────────────────────────────────────

const meetingSignalSchema = z.object({
  meetingId: z.string().min(1).max(256),
  targetUserId: z.string().min(1).max(256).optional(),
  signalType: z.enum([
    'offer',
    'answer',
    'ice-candidate',
    'renegotiate',
    'mute',
    'unmute',
    'screen-share-start',
    'screen-share-stop',
  ]),
  payload: z.record(z.unknown()),
});

const meetingJoinSchema = z.object({
  meetingId: z.string().min(1).max(256),
  displayName: z.string().max(128).optional(),
});

const meetingLeaveSchema = z.object({
  meetingId: z.string().min(1).max(256),
});

const handRaiseSchema = z.object({
  meetingId: z.string().min(1).max(256),
});

const reactionSchema = z.object({
  meetingId: z.string().min(1).max(256),
  reaction: z.enum(['thumbs-up', 'thumbs-down', 'clap', 'heart', 'laugh', 'surprise', 'fire']),
});

// ── Key helpers ─────────────────────────────────────────────────────────────

function meetingRoomKey(meetingId: string): string {
  return `meeting:${meetingId}`;
}

function meetingParticipantsKey(meetingId: string): string {
  return `meeting:participants:${meetingId}`;
}

function raisedHandsKey(meetingId: string): string {
  return `meeting:hands:${meetingId}`;
}

// ── Constants ───────────────────────────────────────────────────────────────

const MEETING_TTL_SECONDS = 14_400; // 4 hours

// ── Handler registration ────────────────────────────────────────────────────

export function registerMeetingHandler(
  io: Server,
  socket: Socket,
  redis: Redis,
): void {
  const user = socket.data.user as AuthUser;

  // ── meeting.join ──────────────────────────────────────────────────────

  socket.on('meeting.join', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = meetingJoinSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId, displayName } = parsed.data;
    const room = meetingRoomKey(meetingId);

    await socket.join(room);

    const pipeline = redis.pipeline();
    pipeline.hset(
      meetingParticipantsKey(meetingId),
      user.userId,
      JSON.stringify({
        socketId: socket.id,
        displayName: displayName ?? user.userId,
        joinedAt: new Date().toISOString(),
        device: (socket.handshake.auth?.device as string) ?? 'unknown',
      }),
    );
    pipeline.expire(meetingParticipantsKey(meetingId), MEETING_TTL_SECONDS);
    await pipeline.exec();

    // Notify existing participants
    socket.to(room).emit('meeting.participant.joined', {
      meetingId,
      userId: user.userId,
      displayName: displayName ?? user.userId,
      timestamp: new Date().toISOString(),
    });

    // Return current state to joining user
    const [participantsRaw, raisedHandsRaw] = await Promise.all([
      redis.hgetall(meetingParticipantsKey(meetingId)),
      redis.zrange(raisedHandsKey(meetingId), 0, -1, 'WITHSCORES'),
    ]);

    const participants = Object.entries(participantsRaw).map(([uid, data]) => ({
      userId: uid,
      ...JSON.parse(data),
    }));

    // Convert ZSET [member, score, member, score, ...] into structured data
    const raisedHands: Array<{ userId: string; raisedAt: string }> = [];
    for (let i = 0; i < raisedHandsRaw.length; i += 2) {
      raisedHands.push({
        userId: raisedHandsRaw[i],
        raisedAt: new Date(Number(raisedHandsRaw[i + 1])).toISOString(),
      });
    }

    console.log(`[meeting] user ${user.userId} joined meeting ${meetingId}`);
    ack?.({ ok: true, meetingId, participants, raisedHands });
  });

  // ── meeting.signal ────────────────────────────────────────────────────

  socket.on('meeting.signal', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = meetingSignalSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId, targetUserId, signalType, payload: signalPayload } = parsed.data;
    const room = meetingRoomKey(meetingId);

    const signalData = {
      meetingId,
      fromUserId: user.userId,
      signalType,
      payload: signalPayload,
      timestamp: new Date().toISOString(),
    };

    if (targetUserId) {
      io.to(`user:${targetUserId}`).emit('meeting.signal', signalData);
    } else {
      socket.to(room).emit('meeting.signal', signalData);
    }

    ack?.({ ok: true });
  });

  // ── hand.raise ────────────────────────────────────────────────────────

  socket.on('hand.raise', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = handRaiseSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId } = parsed.data;
    const room = meetingRoomKey(meetingId);
    const now = Date.now();

    // ZSET with score = timestamp for ordering
    const pipeline = redis.pipeline();
    pipeline.zadd(raisedHandsKey(meetingId), now, user.userId);
    pipeline.expire(raisedHandsKey(meetingId), MEETING_TTL_SECONDS);
    await pipeline.exec();

    io.to(room).emit('hand.raised', {
      meetingId,
      userId: user.userId,
      raisedAt: new Date(now).toISOString(),
    });

    console.log(`[meeting] user ${user.userId} raised hand in meeting ${meetingId}`);
    ack?.({ ok: true });
  });

  // ── hand.lower ────────────────────────────────────────────────────────

  socket.on('hand.lower', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = handRaiseSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId } = parsed.data;
    const room = meetingRoomKey(meetingId);

    await redis.zrem(raisedHandsKey(meetingId), user.userId);

    io.to(room).emit('hand.lowered', {
      meetingId,
      userId: user.userId,
      timestamp: new Date().toISOString(),
    });

    console.log(`[meeting] user ${user.userId} lowered hand in meeting ${meetingId}`);
    ack?.({ ok: true });
  });

  // ── reaction.send ─────────────────────────────────────────────────────

  socket.on('reaction.send', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = reactionSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId, reaction } = parsed.data;
    const room = meetingRoomKey(meetingId);

    // Reactions are ephemeral -- broadcast only, no persistence
    io.to(room).emit('reaction.received', {
      meetingId,
      userId: user.userId,
      reaction,
      timestamp: new Date().toISOString(),
    });

    ack?.({ ok: true });
  });

  // ── meeting.leave ─────────────────────────────────────────────────────

  socket.on('meeting.leave', async (payload: unknown, ack?: (res: unknown) => void) => {
    const parsed = meetingLeaveSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ error: 'INVALID_PAYLOAD', details: parsed.error.flatten() });
      return;
    }

    const { meetingId } = parsed.data;
    await leaveMeeting(io, socket, redis, user, meetingId);
    ack?.({ ok: true, meetingId });
  });

  // ── Cleanup on disconnect ─────────────────────────────────────────────

  socket.on('disconnecting', async () => {
    for (const room of socket.rooms) {
      if (room.startsWith('meeting:') && !room.startsWith('meeting:participants:') && !room.startsWith('meeting:hands:')) {
        const meetingId = room.slice('meeting:'.length);
        await leaveMeeting(io, socket, redis, user, meetingId);
      }
    }
  });
}

// ── Shared leave logic ──────────────────────────────────────────────────────

async function leaveMeeting(
  io: Server,
  socket: Socket,
  redis: Redis,
  user: AuthUser,
  meetingId: string,
): Promise<void> {
  const room = meetingRoomKey(meetingId);

  await socket.leave(room);

  const pipeline = redis.pipeline();
  pipeline.hdel(meetingParticipantsKey(meetingId), user.userId);
  pipeline.zrem(raisedHandsKey(meetingId), user.userId);
  await pipeline.exec();

  io.to(room).emit('meeting.participant.left', {
    meetingId,
    userId: user.userId,
    timestamp: new Date().toISOString(),
  });

  // If no participants remain, clean up Redis keys
  const remaining = await redis.hlen(meetingParticipantsKey(meetingId));
  if (remaining === 0) {
    await redis.del(meetingParticipantsKey(meetingId), raisedHandsKey(meetingId));
    console.log(`[meeting] meeting ${meetingId} ended (no participants remaining)`);
  }

  console.log(`[meeting] user ${user.userId} left meeting ${meetingId}`);
}
