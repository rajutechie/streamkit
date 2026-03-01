import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Kafka, Producer } from 'kafkajs';
import { validate } from '../middleware/validate.js';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';

// ---------------------------------------------------------------------------
// Kafka producer
// ---------------------------------------------------------------------------

const kafka = new Kafka({
  clientId: 'call-service',
  brokers: config.KAFKA_BROKERS,
  retry: { retries: 3 },
});

let producer: Producer | null = null;

async function getProducer(): Promise<Producer | null> {
  if (producer) return producer;
  try {
    producer = kafka.producer();
    await producer.connect();
    console.log('[kafka] Producer connected');
    return producer;
  } catch (err) {
    console.warn('[kafka] Producer connection failed, events will be skipped:', (err as Error).message);
    producer = null;
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

const initiateCallSchema = z.object({
  type: z.enum(['audio', 'video']),
  participants: z.array(z.string().min(1)).min(1),
  channelId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = Router();

// POST /calls -- initiate a new call
router.post('/calls', validate(initiateCallSchema), async (req: Request, res: Response): Promise<void> => {
  const body = req.body as z.infer<typeof initiateCallSchema>;
  const initiatedBy = (req.headers['x-user-id'] as string) ?? 'anonymous';

  // Build participant data for caller and callees.
  const participantData: Array<{
    userId: string;
    status: string;
    role: string;
  }> = [
    { userId: initiatedBy, status: 'connected', role: 'caller' },
    ...body.participants
      .filter((uid) => uid !== initiatedBy)
      .map((uid) => ({ userId: uid, status: 'ringing', role: 'callee' })),
  ];

  const call = await prisma.call.create({
    data: {
      type: body.type,
      status: 'ringing',
      channelId: body.channelId ?? null,
      initiatedBy,
      metadata: body.metadata,
      participants: { create: participantData },
    },
    include: { participants: true },
  });

  await publishEvent('call.incoming', call.id, call);

  res.status(201).json(call);
});

// GET /calls/:id -- get call details with participants
router.get('/calls/:id', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({
    where: { id: req.params.id },
    include: { participants: true },
  });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  res.json(call);
});

// POST /calls/:id/accept -- accept an incoming call
router.post('/calls/:id/accept', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  if (call.status === 'ended') { res.status(400).json({ error: 'Call has already ended' }); return; }
  if (call.status === 'active') { res.status(400).json({ error: 'Call is already active' }); return; }

  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';

  const [updated] = await prisma.$transaction([
    prisma.call.update({
      where: { id: call.id },
      data: { status: 'active', answeredAt: new Date() },
      include: { participants: true },
    }),
    prisma.callParticipant.updateMany({
      where: { callId: call.id, userId },
      data: { status: 'connected' },
    }),
  ]);

  await publishEvent('call.accepted', call.id, { call: updated, acceptedBy: userId });
  res.json(updated);
});

// POST /calls/:id/reject -- reject an incoming call
router.post('/calls/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  if (call.status === 'ended') { res.status(400).json({ error: 'Call has already ended' }); return; }

  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';

  const [updated] = await prisma.$transaction([
    prisma.call.update({
      where: { id: call.id },
      data: { status: 'ended', endedAt: new Date(), endReason: 'declined' },
      include: { participants: true },
    }),
    prisma.callParticipant.updateMany({
      where: { callId: call.id },
      data: { status: 'left', leftAt: new Date() },
    }),
  ]);

  await publishEvent('call.rejected', call.id, { call: updated, rejectedBy: userId });
  res.json(updated);
});

// POST /calls/:id/end -- end an active call
router.post('/calls/:id/end', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  if (call.status === 'ended') { res.status(400).json({ error: 'Call has already ended' }); return; }

  const [updated] = await prisma.$transaction([
    prisma.call.update({
      where: { id: call.id },
      data: { status: 'ended', endedAt: new Date(), endReason: 'completed' },
      include: { participants: true },
    }),
    prisma.callParticipant.updateMany({
      where: { callId: call.id, status: { not: 'left' } },
      data: { status: 'left', leftAt: new Date() },
    }),
  ]);

  await publishEvent('call.ended', call.id, { call: updated });
  res.json(updated);
});

// POST /calls/:id/recording/start
router.post('/calls/:id/recording/start', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  if (call.status !== 'active') { res.status(400).json({ error: 'Call must be active to start recording' }); return; }
  if (call.recordingStatus === 'recording') { res.status(400).json({ error: 'Recording is already in progress' }); return; }

  await prisma.call.update({ where: { id: call.id }, data: { recordingStatus: 'recording' } });
  res.json({ recording: true });
});

// POST /calls/:id/recording/stop
router.post('/calls/:id/recording/stop', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({ where: { id: req.params.id } });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
  if (call.recordingStatus !== 'recording') { res.status(400).json({ error: 'No recording in progress' }); return; }

  await prisma.call.update({ where: { id: call.id }, data: { recordingStatus: 'processing' } });
  res.json({ recording: false });
});

// GET /calls/:id/stats
router.get('/calls/:id/stats', async (req: Request, res: Response): Promise<void> => {
  const call = await prisma.call.findUnique({
    where: { id: req.params.id },
    include: { participants: true },
  });
  if (!call) { res.status(404).json({ error: 'Call not found' }); return; }

  const startTime = call.startedAt.getTime();
  const endTime = call.endedAt ? call.endedAt.getTime() : Date.now();
  const durationSeconds = Math.floor((endTime - startTime) / 1000);

  res.json({
    callId: call.id,
    type: call.type,
    status: call.status,
    duration: durationSeconds,
    participantsCount: call.participants.length,
    connectedCount: call.participants.filter((p) => p.status === 'connected').length,
    recordingStatus: call.recordingStatus,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt ?? null,
    endedAt: call.endedAt ?? null,
  });
});

export { router as callRoutes };
