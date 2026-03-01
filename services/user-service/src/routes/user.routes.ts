import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import type { Producer } from 'kafkajs';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  externalId: z.string().min(1, 'externalId is required'),
  displayName: z.string().max(256).optional(),
  avatarUrl: z.string().url('avatarUrl must be a valid URL').optional(),
  metadata: z.record(z.unknown()).optional(),
  role: z.string().max(64).optional(),
});

const updateUserSchema = z.object({
  displayName: z.string().max(256).optional(),
  avatarUrl: z
    .string()
    .url('avatarUrl must be a valid URL')
    .nullable()
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  role: z.string().max(64).optional(),
});

// ---------------------------------------------------------------------------
// Kafka helper
// ---------------------------------------------------------------------------

const TOPIC = 'rajutechie-streamkit.users';

async function publishEvent(
  producer: Producer | null,
  eventType: string,
  user: object,
): Promise<void> {
  if (!producer) return;
  try {
    await producer.send({
      topic: TOPIC,
      messages: [
        {
          key: (user as { id: string }).id,
          value: JSON.stringify({
            type: eventType,
            data: user,
            timestamp: new Date().toISOString(),
          }),
        },
      ],
    });
  } catch (err) {
    console.error(`[kafka] Failed to publish ${eventType}:`, (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createUserRouter(producer: Producer | null): Router {
  const router = Router();

  // -----------------------------------------------------------------------
  // POST /users – Create or update (upsert) a user by externalId
  // -----------------------------------------------------------------------
  router.post(
    '/',
    validate(createUserSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { externalId, displayName, avatarUrl, metadata, role } = req.body;

        const user = await prisma.user.upsert({
          where: { externalId },
          create: {
            externalId,
            displayName: displayName ?? externalId,
            avatarUrl: avatarUrl ?? null,
            metadata: metadata ?? {},
            role: role ?? 'user',
          },
          update: {
            ...(displayName !== undefined && { displayName }),
            ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ?? null }),
            ...(metadata !== undefined && { metadata }),
            ...(role !== undefined && { role }),
          },
        });

        const isNew = user.createdAt.getTime() === user.updatedAt.getTime();
        await publishEvent(producer, isNew ? 'user.created' : 'user.updated', user);

        res.status(isNew ? 201 : 200).json(user);
      } catch (error) {
        console.error('[users/create] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // GET /users/:id – Retrieve a user by internal ID
  // -----------------------------------------------------------------------
  router.get('/:id', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await prisma.user.findUnique({ where: { id } });

      if (!user || !user.isActive) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json(user);
    } catch (error) {
      console.error('[users/get] Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // PATCH /users/:id – Partial update
  // -----------------------------------------------------------------------
  router.patch(
    '/:id',
    validate(updateUserSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing || !existing.isActive) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const { displayName, avatarUrl, metadata, role } = req.body;

        const updated = await prisma.user.update({
          where: { id },
          data: {
            ...(displayName !== undefined && { displayName }),
            ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ?? null }),
            ...(metadata !== undefined && { metadata }),
            ...(role !== undefined && { role }),
          },
        });

        await publishEvent(producer, 'user.updated', updated);

        res.status(200).json(updated);
      } catch (error) {
        console.error('[users/patch] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // DELETE /users/:id – Soft delete (set isActive = false)
  // -----------------------------------------------------------------------
  router.delete(
    '/:id',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;

        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing || !existing.isActive) {
          res.status(404).json({ error: 'User not found' });
          return;
        }

        const deactivated = await prisma.user.update({
          where: { id },
          data: { isActive: false },
        });

        await publishEvent(producer, 'user.deleted', deactivated);

        res.status(200).json({ deleted: true });
      } catch (error) {
        console.error('[users/delete] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  return router;
}
