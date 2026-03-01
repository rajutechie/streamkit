import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { profanityFilter } from '../services/filter.js';
import { prisma } from '../lib/prisma.js';

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const createReportSchema = z.object({
  reporterId: z.string().min(1),
  targetType: z.enum(['user', 'message', 'channel']),
  targetId: z.string().min(1),
  reason: z.string().min(1).max(1000),
});

const createBanSchema = z.object({
  userId: z.string().min(1),
  channelId: z.string().optional(),
  reason: z.string().min(1).max(500),
  expiresAt: z.string().datetime().optional(),
  bannedBy: z.string().optional(),
});

const createRuleSchema = z.object({
  type: z.enum(['word', 'regex', 'url']),
  pattern: z.string().min(1).max(500),
  action: z.enum(['flag', 'block', 'delete']),
});

/* ------------------------------------------------------------------ */
/*  Router                                                            */
/* ------------------------------------------------------------------ */

export const moderationRouter = Router();

/* ------------------------------------------------------------------ */
/*  Reports                                                           */
/* ------------------------------------------------------------------ */

/**
 * POST /moderation/report
 *
 * Submit a new moderation report.
 */
moderationRouter.post('/moderation/report', validate(createReportSchema), async (req: Request, res: Response) => {
  const { reporterId, targetType, targetId, reason } = req.body as z.infer<typeof createReportSchema>;

  const report = await prisma.report.create({
    data: { reporterId, targetType, targetId, reason, status: 'pending', source: 'manual' },
  });

  console.log(`[ModerationRoutes] New report ${report.id}: ${targetType}/${targetId} by ${reporterId}`);

  res.status(201).json(report);
});

/**
 * GET /moderation/reports
 *
 * List moderation reports with optional pagination and status filter.
 * Query parameters:
 *   - status: filter by report status
 *   - page: page number (default 1)
 *   - limit: items per page (default 20, max 100)
 */
moderationRouter.get('/moderation/reports', async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string | undefined;
  const page = Math.max(1, parseInt((req.query.page as string) ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)));

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where: statusFilter ? { status: statusFilter } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.report.count({
      where: statusFilter ? { status: statusFilter } : undefined,
    }),
  ]);

  res.json({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    reports,
  });
});

/* ------------------------------------------------------------------ */
/*  Bans                                                              */
/* ------------------------------------------------------------------ */

/**
 * POST /moderation/ban
 *
 * Ban a user (globally or from a specific channel).
 */
moderationRouter.post('/moderation/ban', validate(createBanSchema), async (req: Request, res: Response) => {
  const { userId, channelId, reason, expiresAt, bannedBy } = req.body as z.infer<typeof createBanSchema>;

  const ban = await prisma.ban.create({
    data: {
      userId,
      channelId: channelId ?? null,
      reason,
      bannedBy: bannedBy ?? 'system',
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      active: true,
    },
  });

  console.log(`[ModerationRoutes] Banned user ${userId}${channelId ? ` from channel ${channelId}` : ' globally'}: ${reason}`);

  res.status(201).json(ban);
});

/**
 * DELETE /moderation/ban/:id
 *
 * Remove (deactivate) a ban.
 */
moderationRouter.delete('/moderation/ban/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const ban = await prisma.ban.findUnique({ where: { id } });

  if (!ban) {
    res.status(404).json({ error: 'Ban not found' });
    return;
  }

  await prisma.ban.update({ where: { id }, data: { active: false } });

  console.log(`[ModerationRoutes] Removed ban ${id} for user ${ban.userId}`);

  res.status(204).send();
});

/**
 * GET /moderation/bans
 *
 * List active bans. Automatically filters out expired bans.
 */
moderationRouter.get('/moderation/bans', async (_req: Request, res: Response) => {
  const now = new Date();

  const activeBans = await prisma.ban.findMany({
    where: {
      active: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json(activeBans);
});

/* ------------------------------------------------------------------ */
/*  Rules                                                             */
/* ------------------------------------------------------------------ */

/**
 * POST /moderation/rules
 *
 * Create a new moderation rule.
 * Word-type rules are automatically added to the profanity filter.
 */
moderationRouter.post('/moderation/rules', validate(createRuleSchema), async (req: Request, res: Response) => {
  const { type, pattern, action } = req.body as z.infer<typeof createRuleSchema>;

  const rule = await prisma.moderationRule.create({
    data: { type, pattern, action },
  });

  if (type === 'word') {
    profanityFilter.addWords([pattern]);
  }

  console.log(`[ModerationRoutes] Created rule ${rule.id}: ${type}/${pattern} -> ${action}`);

  res.status(201).json(rule);
});

/**
 * GET /moderation/rules
 *
 * List all moderation rules.
 */
moderationRouter.get('/moderation/rules', async (_req: Request, res: Response) => {
  const rules = await prisma.moderationRule.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(rules);
});
