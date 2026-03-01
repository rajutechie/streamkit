import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';
import { fcmProvider } from '../providers/fcm.js';
import { apnsProvider } from '../providers/apns.js';
import { emailProvider } from '../providers/email.js';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const sendNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['push', 'email', 'in_app']),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  data: z.record(z.string()).optional(),
});

const updatePreferencesSchema = z.object({
  push: z.boolean().optional(),
  email: z.boolean().optional(),
  inApp: z.boolean().optional(),
  chatMessages: z.boolean().optional(),
  callEvents: z.boolean().optional(),
  meetingReminders: z.boolean().optional(),
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

export const notificationRouter = Router();

/**
 * POST /notifications/send
 *
 * Send a notification to a user through the specified provider.
 * The notification record is persisted to the database.
 */
notificationRouter.post('/notifications/send', validate(sendNotificationSchema), async (req: Request, res: Response) => {
  const { userId, type, title, body, data } = req.body as z.infer<typeof sendNotificationSchema>;

  let provider = type;

  try {
    switch (type) {
      case 'push':
        // In production, look up user's device tokens from the user-service.
        await fcmProvider.send(`device_token_${userId}`, title, body, data);
        provider = 'fcm';
        break;
      case 'email':
        await emailProvider.send(`${userId}@example.com`, title, body);
        provider = 'email';
        break;
      case 'in_app':
        // In-app notifications are stored and delivered via WebSocket.
        console.log(`[NotificationRoutes] In-app notification queued for ${userId}: ${title}`);
        provider = 'in_app';
        break;
    }

    const record = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ?? null,
        status: 'sent',
        provider,
      },
    });

    res.status(200).json({ sent: true, notificationId: record.id, provider });
  } catch (err) {
    console.error('[NotificationRoutes] Send failed:', err);

    // Persist the failed notification for auditing.
    await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        data: data ?? null,
        status: 'failed',
        provider,
      },
    }).catch(() => {});

    res.status(500).json({ error: 'Failed to send notification' });
  }
});

/**
 * GET /notifications/preferences/:userId
 *
 * Retrieve notification preferences for a user.
 * Returns defaults if no preferences have been set.
 */
notificationRouter.get('/notifications/preferences/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  const prefs = await prisma.notificationPreference.findUnique({ where: { userId } });

  if (!prefs) {
    // Return defaults without persisting — they will be created on first PATCH.
    res.json({
      userId,
      push: true,
      email: true,
      inApp: true,
      chatMessages: true,
      callEvents: true,
      meetingReminders: true,
    });
    return;
  }

  res.json(prefs);
});

/**
 * PATCH /notifications/preferences/:userId
 *
 * Update notification preferences for a user.
 */
notificationRouter.patch('/notifications/preferences/:userId', validate(updatePreferencesSchema), async (req: Request, res: Response) => {
  const { userId } = req.params;
  const updates = req.body as z.infer<typeof updatePreferencesSchema>;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      push: updates.push ?? true,
      email: updates.email ?? true,
      inApp: updates.inApp ?? true,
      chatMessages: updates.chatMessages ?? true,
      callEvents: updates.callEvents ?? true,
      meetingReminders: updates.meetingReminders ?? true,
    },
    update: {
      ...(updates.push !== undefined && { push: updates.push }),
      ...(updates.email !== undefined && { email: updates.email }),
      ...(updates.inApp !== undefined && { inApp: updates.inApp }),
      ...(updates.chatMessages !== undefined && { chatMessages: updates.chatMessages }),
      ...(updates.callEvents !== undefined && { callEvents: updates.callEvents }),
      ...(updates.meetingReminders !== undefined && { meetingReminders: updates.meetingReminders }),
    },
  });

  res.json(prefs);
});
