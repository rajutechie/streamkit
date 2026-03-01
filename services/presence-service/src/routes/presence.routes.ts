import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type { Redis } from 'ioredis';
import { validate } from '../middleware/validate.js';
import { config } from '../config/index.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface PresenceEntry {
  userId: string;
  status: 'online' | 'away' | 'dnd' | 'offline';
  lastSeenAt: string;
  device?: string;
  appId?: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function presenceKey(userId: string): string {
  return `presence:${userId}`;
}

/** Returns a default offline presence entry for unknown users */
function defaultPresence(userId: string): PresenceEntry {
  return {
    userId,
    status: 'offline',
    lastSeenAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const updatePresenceSchema = z.object({
  userId: z.string().min(1),
  appId: z.string().min(1),
  status: z.enum(['online', 'away', 'dnd', 'offline']),
  device: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/*  Router factory                                                    */
/* ------------------------------------------------------------------ */

export function createPresenceRouter(redis: Redis): Router {
  const router = Router();

  /**
   * GET /presence/:userId
   *
   * Get the current presence status for a single user.
   * Returns offline with the current timestamp if no entry exists or has expired
   * (Redis SETEX handles TTL expiry natively — a null GET means the key is gone).
   */
  router.get('/presence/:userId', async (req: Request, res: Response) => {
    const { userId } = req.params;

    const raw = await redis.get(presenceKey(userId));

    if (!raw) {
      res.json(defaultPresence(userId));
      return;
    }

    try {
      const entry = JSON.parse(raw) as PresenceEntry;
      res.json(entry);
    } catch {
      res.json(defaultPresence(userId));
    }
  });

  /**
   * GET /presence/bulk
   *
   * Get presence statuses for multiple users in a single request.
   * Query parameter: userIds=id1,id2,id3
   */
  router.get('/presence/bulk', async (req: Request, res: Response) => {
    const userIdsParam = req.query.userIds;

    if (!userIdsParam || typeof userIdsParam !== 'string') {
      res.status(400).json({ error: 'Query parameter "userIds" is required (comma-separated list)' });
      return;
    }

    const userIds = userIdsParam.split(',').map((id) => id.trim()).filter(Boolean);

    if (userIds.length === 0) {
      res.status(400).json({ error: 'At least one userId must be provided' });
      return;
    }

    if (userIds.length > 100) {
      res.status(400).json({ error: 'Maximum 100 userIds per bulk request' });
      return;
    }

    // MGET fetches all keys in a single round-trip.
    const values = await redis.mget(userIds.map(presenceKey));

    const results: PresenceEntry[] = userIds.map((userId, i) => {
      const raw = values[i];
      if (!raw) return defaultPresence(userId);

      try {
        return JSON.parse(raw) as PresenceEntry;
      } catch {
        return defaultPresence(userId);
      }
    });

    res.json(results);
  });

  /**
   * POST /presence/update
   *
   * Update the presence status for a user.
   * Uses Redis SETEX so the key automatically expires after PRESENCE_TTL_SECONDS.
   * Setting status to 'offline' does an explicit DEL instead.
   */
  router.post('/presence/update', validate(updatePresenceSchema), async (req: Request, res: Response) => {
    const { userId, appId, status, device } = req.body as z.infer<typeof updatePresenceSchema>;

    const now = new Date().toISOString();

    const entry: PresenceEntry = {
      userId,
      status,
      lastSeenAt: now,
      device,
      appId,
      updatedAt: now,
    };

    if (status === 'offline') {
      // Explicit offline: delete the key immediately.
      await redis.del(presenceKey(userId));
    } else {
      // Set the JSON value with a TTL so stale entries expire automatically.
      await redis.setex(presenceKey(userId), config.PRESENCE_TTL_SECONDS, JSON.stringify(entry));
    }

    console.log(`[PresenceRoutes] Updated presence for ${userId}: ${status} (device=${device ?? 'unknown'}, appId=${appId})`);

    res.json({ updated: true, ...entry });
  });

  return router;
}
