import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createChannelSchema = z.object({
  type: z.enum(['direct', 'group', 'public', 'private']),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  members: z.array(z.string().min(1)).optional().default([]),
  metadata: z.record(z.unknown()).optional().default({}),
  settings: z.record(z.unknown()).optional().default({}),
});

const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
});

const addMembersSchema = z.object({
  members: z.array(
    z.object({
      userId: z.string().min(1),
      role: z.enum(['owner', 'admin', 'moderator', 'member']).optional().default('member'),
    }),
  ).min(1),
});

const updateMemberSchema = z.object({
  role: z.enum(['owner', 'admin', 'moderator', 'member']).optional(),
  muted: z.boolean().optional(),
  banned: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// POST /channels -- create a new channel
router.post('/channels', validate(createChannelSchema), async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof createChannelSchema>;
  const createdBy = (req.headers['x-user-id'] as string) ?? 'system';

  const channel = await prisma.channel.create({
    data: {
      type: body.type,
      name: body.name,
      description: body.description,
      metadata: body.metadata,
      settings: body.settings,
      createdBy,
      members: {
        create: body.members.map((userId, idx) => ({
          userId,
          role: idx === 0 ? 'owner' : 'member',
        })),
      },
    },
    include: { members: true },
  });

  res.status(201).json({ ...channel, memberCount: channel.members.length });
});

// GET /channels -- list channels with optional filters + cursor pagination
router.get('/channels', async (req: Request, res: Response): Promise<void> => {
  const { type, memberId, limit: rawLimit, after } = req.query;
  const limit = Math.min(Math.max(parseInt(rawLimit as string, 10) || 25, 1), 100);

  const channels = await prisma.channel.findMany({
    where: {
      isArchived: false,
      ...(type && typeof type === 'string' ? { type } : {}),
      ...(memberId && typeof memberId === 'string'
        ? { members: { some: { userId: memberId } } }
        : {}),
    },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(after && typeof after === 'string' ? { cursor: { id: after }, skip: 1 } : {}),
  });

  const hasNext = channels.length > limit;
  const page = hasNext ? channels.slice(0, limit) : channels;

  res.json({
    data: page.map((c) => ({ ...c, memberCount: c._count.members })),
    hasNext,
    cursors: { after: page[page.length - 1]?.id ?? null },
  });
});

// GET /channels/:id -- get single channel
router.get('/channels/:id', async (req: Request, res: Response): Promise<void> => {
  const channel = await prisma.channel.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { members: true } } },
  });
  if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }
  res.json({ ...channel, memberCount: channel._count.members });
});

// PATCH /channels/:id -- partial update
router.patch('/channels/:id', validate(updateChannelSchema), async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Channel not found' }); return; }

  const body = req.body as z.infer<typeof updateChannelSchema>;

  const channel = await prisma.channel.update({
    where: { id: req.params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.metadata !== undefined && {
        metadata: { ...(existing.metadata as object), ...body.metadata },
      }),
      ...(body.settings !== undefined && {
        settings: { ...(existing.settings as object), ...body.settings },
      }),
    },
  });

  res.json(channel);
});

// DELETE /channels/:id -- archive channel (soft delete)
router.delete('/channels/:id', async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!existing) { res.status(404).json({ error: 'Channel not found' }); return; }

  await prisma.channel.update({ where: { id: req.params.id }, data: { isArchived: true } });

  res.status(204).send();
});

// POST /channels/:id/members -- add members
router.post('/channels/:id/members', validate(addMembersSchema), async (req: Request, res: Response): Promise<void> => {
  const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

  const body = req.body as z.infer<typeof addMembersSchema>;

  // Upsert each member to avoid duplicates.
  const created = await Promise.all(
    body.members.map((m) =>
      prisma.channelMember.upsert({
        where: { channelId_userId: { channelId: channel.id, userId: m.userId } },
        create: { channelId: channel.id, userId: m.userId, role: m.role },
        update: {},
      }),
    ),
  );

  res.status(201).json(created);
});

// GET /channels/:id/members -- list members with pagination
router.get('/channels/:id/members', async (req: Request, res: Response): Promise<void> => {
  const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
  if (!channel) { res.status(404).json({ error: 'Channel not found' }); return; }

  const { limit: rawLimit, after } = req.query;
  const limit = Math.min(Math.max(parseInt(rawLimit as string, 10) || 25, 1), 100);

  const [members, total] = await Promise.all([
    prisma.channelMember.findMany({
      where: { channelId: channel.id },
      take: limit,
      ...(after && typeof after === 'string'
        ? { cursor: { channelId_userId: { channelId: channel.id, userId: after } }, skip: 1 }
        : {}),
    }),
    prisma.channelMember.count({ where: { channelId: channel.id } }),
  ]);

  res.json({
    data: members,
    total,
    hasNext: members.length === limit,
    cursors: { after: members[members.length - 1]?.userId ?? null },
  });
});

// PATCH /channels/:id/members/:uid -- update member role/mute/ban
router.patch('/channels/:id/members/:uid', validate(updateMemberSchema), async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: req.params.id, userId: req.params.uid } },
  });
  if (!existing) { res.status(404).json({ error: 'Member not found' }); return; }

  const body = req.body as z.infer<typeof updateMemberSchema>;

  const member = await prisma.channelMember.update({
    where: { channelId_userId: { channelId: req.params.id, userId: req.params.uid } },
    data: {
      ...(body.role !== undefined && { role: body.role }),
      ...(body.muted !== undefined && { muted: body.muted }),
      ...(body.banned !== undefined && { banned: body.banned }),
    },
  });

  res.json(member);
});

// DELETE /channels/:id/members/:uid -- remove member
router.delete('/channels/:id/members/:uid', async (req: Request, res: Response): Promise<void> => {
  const existing = await prisma.channelMember.findUnique({
    where: { channelId_userId: { channelId: req.params.id, userId: req.params.uid } },
  });
  if (!existing) { res.status(404).json({ error: 'Member not found' }); return; }

  await prisma.channelMember.delete({
    where: { channelId_userId: { channelId: req.params.id, userId: req.params.uid } },
  });

  res.status(204).send();
});

export { router as channelRoutes };
