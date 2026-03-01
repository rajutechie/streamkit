import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const registerDeviceSchema = z.object({
  deviceId: z.string().min(1, 'deviceId is required'),
  platform: z.enum(['ios', 'android', 'web', 'desktop'], {
    errorMap: () => ({
      message: 'platform must be one of: ios, android, web, desktop',
    }),
  }),
  pushToken: z.string().optional(),
  pushProvider: z
    .enum(['apns', 'fcm', 'hms', 'webpush'], {
      errorMap: () => ({
        message: 'pushProvider must be one of: apns, fcm, hms, webpush',
      }),
    })
    .optional(),
});

// ---------------------------------------------------------------------------
// Router factory
// ---------------------------------------------------------------------------

export function createDeviceRouter(): Router {
  const router = Router({ mergeParams: true });

  // -----------------------------------------------------------------------
  // GET /users/:id/devices – List all devices for a user
  // -----------------------------------------------------------------------
  router.get('/:id/devices', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const devices = await prisma.device.findMany({ where: { userId: id } });

      res.status(200).json({
        userId: id,
        devices,
        total: devices.length,
      });
    } catch (error) {
      console.error('[devices/list] Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -----------------------------------------------------------------------
  // POST /users/:id/devices – Register a new device (or update existing)
  // -----------------------------------------------------------------------
  router.post(
    '/:id/devices',
    validate(registerDeviceSchema),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const { deviceId, platform, pushToken, pushProvider } = req.body;

        // Upsert: update if the (userId, deviceId) pair already exists.
        const device = await prisma.device.upsert({
          where: { userId_deviceId: { userId: id, deviceId } },
          create: {
            deviceId,
            userId: id,
            platform,
            pushToken: pushToken ?? null,
            pushProvider: pushProvider ?? null,
          },
          update: {
            platform,
            pushToken: pushToken ?? null,
            pushProvider: pushProvider ?? null,
          },
        });

        const isNew = device.createdAt.getTime() === device.updatedAt.getTime();
        res.status(isNew ? 201 : 200).json(device);
      } catch (error) {
        console.error('[devices/register] Unexpected error:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    },
  );

  // -----------------------------------------------------------------------
  // DELETE /users/:id/devices/:deviceId – Remove a device
  // -----------------------------------------------------------------------
  router.delete('/:id/devices/:deviceId', async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, deviceId } = req.params;

      const existing = await prisma.device.findUnique({
        where: { userId_deviceId: { userId: id, deviceId } },
      });

      if (!existing) {
        res.status(404).json({ error: 'Device not found' });
        return;
      }

      await prisma.device.delete({
        where: { userId_deviceId: { userId: id, deviceId } },
      });

      res.status(200).json({ deleted: true });
    } catch (error) {
      console.error('[devices/delete] Unexpected error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
