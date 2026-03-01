import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Kafka, Producer } from 'kafkajs';
import { validate } from '../middleware/validate.js';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Kafka producer
// ---------------------------------------------------------------------------

const kafka = new Kafka({ clientId: 'chat-service', brokers: config.KAFKA_BROKERS, retry: { retries: 3 } });
let producer: Producer | null = null;

async function getProducer(): Promise<Producer | null> {
  if (producer) return producer;
  try {
    producer = kafka.producer();
    await producer.connect();
    return producer;
  } catch (err) {
    console.warn('[kafka] Producer connection failed:', (err as Error).message);
    return null;
  }
}

async function publishEvent(topic: string, key: string, payload: unknown): Promise<void> {
  try {
    const p = await getProducer();
    if (!p) return;
    await p.send({ topic, messages: [{ key, value: JSON.stringify(payload) }] });
  } catch (err) {
    console.warn(`[kafka] Failed to publish to ${topic}:`, (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const sendMessageSchema = z.object({
  text: z.string().max(5000).optional(),
  attachments: z.array(z.object({
    type: z.string().min(1),
    url: z.string().url(),
    name: z.string().optional(),
    size: z.number().optional(),
    mimeType: z.string().optional(),
  })).optional().default([]),
  replyTo: z.string().uuid().optional(),
  threadId: z.string().uuid().optional(),
  mentions: z.array(z.string().min(1)).optional().default([]),
});

const editMessageSchema = z.object({
  text: z.string().min(1).max(5000),
});

const reactionSchema = z.object({
  emoji: z.string().min(1).max(32),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router({ mergeParams: true });

// POST /channels/:id/messages -- send a message
router.post('/:id/messages', validate(sendMessageSchema), async (req: Request, res: Response): Promise<void> => {
  const channelId = req.params.id;
  const body = req.body as z.infer<typeof sendMessageSchema>;

  if (!body.text && body.attachments.length === 0) {
    res.status(400).json({ error: 'Message must have text or at least one attachment' });
    return;
  }

  const senderId = (req.headers['x-user-id'] as string) ?? 'anonymous';

  const message = await prisma.message.create({
    data: {
      channelId,
      senderId,
      text: body.text ?? null,
      attachments: body.attachments,
      replyTo: body.replyTo ?? null,
      threadId: body.threadId ?? null,
      mentions: body.mentions,
      reactions: [],
      readBy: [senderId],
    },
  });

  await publishEvent('message.new', channelId, { channelId, message });

  res.status(201).json(message);
});

// GET /channels/:id/messages -- list messages with cursor pagination
router.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const channelId = req.params.id;
  const { after, before, limit: rawLimit } = req.query;
  const limit = Math.min(Math.max(parseInt(rawLimit as string, 10) || 25, 1), 100);

  const messages = await prisma.message.findMany({
    where: {
      channelId,
      isDeleted: false,
      ...(after && typeof after === 'string' ? { id: { gt: after } } : {}),
      ...(before && typeof before === 'string' ? { id: { lt: before } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
  });

  const hasNext = messages.length > limit;
  const page = hasNext ? messages.slice(0, limit) : messages;

  res.json({
    data: page,
    hasNext,
    cursors: {
      before: page[0]?.id ?? null,
      after: page[page.length - 1]?.id ?? null,
    },
  });
});

// GET /channels/:id/messages/search -- full-text search
router.get('/:id/messages/search', async (req: Request, res: Response): Promise<void> => {
  const channelId = req.params.id;
  const query = (req.query.query ?? req.query.q) as string | undefined;

  if (!query || query.trim().length === 0) {
    res.status(400).json({ error: 'Search query is required (use ?query=...)' });
    return;
  }

  const results = await prisma.message.findMany({
    where: {
      channelId,
      isDeleted: false,
      text: { contains: query, mode: 'insensitive' },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ data: results, total: results.length, query });
});

// GET /channels/:id/messages/:mid -- get single message
router.get('/:id/messages/:mid', async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
  res.json(message);
});

// PATCH /channels/:id/messages/:mid -- edit message
router.patch('/:id/messages/:mid', validate(editMessageSchema), async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
  if (message.isDeleted) { res.status(400).json({ error: 'Cannot edit a deleted message' }); return; }

  const body = req.body as z.infer<typeof editMessageSchema>;

  const updated = await prisma.message.update({
    where: { id: message.id },
    data: { text: body.text, isEdited: true, editedAt: new Date() },
  });

  await publishEvent('message.updated', req.params.id, { channelId: req.params.id, message: updated });

  res.json(updated);
});

// DELETE /channels/:id/messages/:mid -- soft delete
router.delete('/:id/messages/:mid', async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }

  await prisma.message.update({
    where: { id: message.id },
    data: { isDeleted: true, deletedAt: new Date() },
  });

  await publishEvent('message.deleted', req.params.id, { channelId: req.params.id, messageId: message.id });

  res.status(204).send();
});

// POST /channels/:id/messages/:mid/reactions -- add reaction
router.post('/:id/messages/:mid/reactions', validate(reactionSchema), async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }
  if (message.isDeleted) { res.status(400).json({ error: 'Cannot react to a deleted message' }); return; }

  const { emoji } = req.body as z.infer<typeof reactionSchema>;
  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';

  const reactions = (message.reactions as Array<{ emoji: string; users: string[]; count: number }>) ?? [];
  let reaction = reactions.find((r) => r.emoji === emoji);
  if (!reaction) {
    reaction = { emoji, users: [], count: 0 };
    reactions.push(reaction);
  }
  if (!reaction.users.includes(userId)) {
    reaction.users.push(userId);
    reaction.count = reaction.users.length;
  }

  const updated = await prisma.message.update({ where: { id: message.id }, data: { reactions } });

  res.json(updated);
});

// DELETE /channels/:id/messages/:mid/reactions/:emoji -- remove reaction
router.delete('/:id/messages/:mid/reactions/:emoji', async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }

  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
  const emoji = decodeURIComponent(req.params.emoji);

  let reactions = (message.reactions as Array<{ emoji: string; users: string[]; count: number }>) ?? [];
  const reaction = reactions.find((r) => r.emoji === emoji);
  if (reaction) {
    reaction.users = reaction.users.filter((u) => u !== userId);
    reaction.count = reaction.users.length;
    reactions = reactions.filter((r) => r.count > 0);
  }

  const updated = await prisma.message.update({ where: { id: message.id }, data: { reactions } });

  res.json(updated);
});

// POST /channels/:id/messages/:mid/read -- mark message as read
router.post('/:id/messages/:mid/read', async (req: Request, res: Response): Promise<void> => {
  const message = await prisma.message.findFirst({
    where: { id: req.params.mid, channelId: req.params.id },
  });
  if (!message) { res.status(404).json({ error: 'Message not found' }); return; }

  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
  const readBy = (message.readBy as string[]) ?? [];

  if (!readBy.includes(userId)) {
    await prisma.message.update({ where: { id: message.id }, data: { readBy: [...readBy, userId] } });
  }

  res.json({ read: true });
});

export { router as messageRoutes };
