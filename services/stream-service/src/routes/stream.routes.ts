import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'node:crypto';
import { Kafka, Producer } from 'kafkajs';
import { validate } from '../middleware/validate.js';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Kafka producer (real implementation)
// ---------------------------------------------------------------------------

const kafka = new Kafka({
  clientId: 'stream-service',
  brokers: config.KAFKA_BROKERS,
  retry: { retries: 3 },
});

let producer: Producer | null = null;

async function getProducer(): Promise<Producer | null> {
  if (producer) return producer;
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('[kafka] stream-service producer connected');
    return producer;
  } catch (err) {
    console.warn('[kafka] Producer connection failed, events will be skipped:', (err as Error).message);
    return null;
  }
}

async function publishEvent(topic: string, payload: Record<string, unknown>): Promise<void> {
  try {
    const p = await getProducer();
    if (!p) return;
    await p.send({
      topic,
      messages: [{ key: (payload.streamId as string) ?? 'unknown', value: JSON.stringify(payload) }],
    });
  } catch (err) {
    console.warn(`[kafka] Failed to publish to ${topic}:`, (err as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createStreamSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  hostUserId: z.string().min(1, 'Host user ID is required'),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
  settings: z.object({
    chatEnabled: z.boolean().optional(),
    lowLatency: z.boolean().optional(),
    dvr: z.boolean().optional(),
    maxBitrate: z.number().int().min(500).max(50000).optional(),
    recordStream: z.boolean().optional(),
  }).optional(),
});

const moderateSchema = z.object({
  type: z.enum(['ban_viewer', 'disable_chat']),
  targetUserId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

const defaultSettings = {
  chatEnabled: true,
  lowLatency: false,
  dvr: false,
  maxBitrate: 6000,
  recordStream: false,
};

// POST /streams - Create a new stream
router.post('/streams', validate(createStreamSchema), async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof createStreamSchema>;

  const stream = await prisma.liveStream.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      streamKey: crypto.randomBytes(32).toString('hex'),
      hostUserId: body.hostUserId,
      visibility: body.visibility ?? 'public',
      settings: { ...defaultSettings, ...body.settings },
    },
  });

  res.status(201).json({ data: stream });
});

// GET /streams/:id - Get stream by ID
router.get('/streams/:id', async (req: Request, res: Response): Promise<void> => {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
  if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }
  res.json({ data: stream });
});

// POST /streams/:id/start - Go live
router.post('/streams/:id/start', async (req: Request, res: Response): Promise<void> => {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
  if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }
  if (stream.status === 'live') { res.status(400).json({ error: 'Stream is already live' }); return; }
  if (stream.status === 'ended') { res.status(400).json({ error: 'Stream has ended. Create a new stream to go live again' }); return; }

  const updated = await prisma.liveStream.update({
    where: { id: stream.id },
    data: {
      status: 'live',
      startedAt: new Date(),
      hlsUrl: `https://cdn.rajutechie-streamkit.io/live/${stream.id}/index.m3u8`,
      rtmpUrl: `rtmp://ingest.rajutechie-streamkit.io/live/${stream.streamKey}`,
    },
  });

  await publishEvent('stream.started', {
    streamId: updated.id,
    hostUserId: updated.hostUserId,
    title: updated.title,
    visibility: updated.visibility,
    startedAt: updated.startedAt?.toISOString(),
  });

  res.json({ data: updated });
});

// POST /streams/:id/stop - Stop streaming
router.post('/streams/:id/stop', async (req: Request, res: Response): Promise<void> => {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
  if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }
  if (stream.status === 'ended') { res.status(400).json({ error: 'Stream has already ended' }); return; }
  if (stream.status === 'idle') { res.status(400).json({ error: 'Stream has not been started yet' }); return; }

  const finalViewerCount = stream.viewerCount;

  const updated = await prisma.liveStream.update({
    where: { id: stream.id },
    data: { status: 'ended', endedAt: new Date(), viewerCount: 0 },
  });

  await publishEvent('stream.ended', {
    streamId: updated.id,
    hostUserId: updated.hostUserId,
    title: updated.title,
    endedAt: updated.endedAt?.toISOString(),
    peakViewerCount: updated.peakViewerCount,
    finalViewerCount,
    durationMs: stream.startedAt
      ? Date.now() - stream.startedAt.getTime()
      : 0,
  });

  res.json({ data: updated });
});

// GET /streams/:id/viewers - Get viewer count
router.get('/streams/:id/viewers', async (req: Request, res: Response): Promise<void> => {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
  if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

  res.json({
    data: {
      streamId: stream.id,
      count: stream.viewerCount,
      peakCount: stream.peakViewerCount,
    },
  });
});

// POST /streams/:id/moderate - Perform moderation action
router.post('/streams/:id/moderate', validate(moderateSchema), async (req: Request, res: Response): Promise<void> => {
  const stream = await prisma.liveStream.findUnique({ where: { id: req.params.id } });
  if (!stream) { res.status(404).json({ error: 'Stream not found' }); return; }

  const body = req.body as z.infer<typeof moderateSchema>;

  if (body.type === 'ban_viewer' && !body.targetUserId) {
    res.status(400).json({ error: 'targetUserId is required for ban_viewer action' });
    return;
  }

  const action = await prisma.streamModerationAction.create({
    data: {
      streamId: stream.id,
      type: body.type,
      targetUserId: body.targetUserId ?? null,
    },
  });

  if (body.type === 'disable_chat') {
    const settings = (stream.settings as Record<string, unknown>) ?? {};
    await prisma.liveStream.update({
      where: { id: stream.id },
      data: { settings: { ...settings, chatEnabled: false } },
    });
  }

  res.json({ data: { success: true, action } });
});

export { router as streamRouter };
