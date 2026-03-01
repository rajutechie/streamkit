import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { customAlphabet } from 'nanoid';
import { validate } from '../middleware/validate.js';

// ---------------------------------------------------------------------------
// Nanoid generator for human-readable meeting codes (10 alphanumeric chars)
// ---------------------------------------------------------------------------
const generateMeetingCode = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  10,
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface MeetingSettings {
  waitingRoom: boolean;
  muteOnEntry: boolean;
  allowScreenShare: boolean;
  allowRecording: boolean;
  maxParticipants: number;
}

interface Meeting {
  id: string;
  meetingCode: string;
  title: string;
  description: string | null;
  password: string | null;
  hostUserId: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  scheduledAt: string | null;
  durationMins: number | null;
  settings: MeetingSettings;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  displayName: string;
  role: 'host' | 'co-host' | 'participant';
  status: 'waiting' | 'joined' | 'left' | 'removed';
  isMuted: boolean;
  isVideoOff: boolean;
  joinedAt: string;
  leftAt: string | null;
}

// ---------------------------------------------------------------------------
// In-memory data stores
// ---------------------------------------------------------------------------
const meetings = new Map<string, Meeting>();
const participants = new Map<string, MeetingParticipant[]>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createMeetingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  password: z.string().min(4).max(50).nullable().optional(),
  hostUserId: z.string().min(1, 'Host user ID is required'),
  scheduledAt: z.string().datetime().nullable().optional(),
  durationMins: z.number().int().min(1).max(1440).nullable().optional(),
  settings: z
    .object({
      waitingRoom: z.boolean().optional(),
      muteOnEntry: z.boolean().optional(),
      allowScreenShare: z.boolean().optional(),
      allowRecording: z.boolean().optional(),
      maxParticipants: z.number().int().min(2).max(1000).optional(),
    })
    .optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  password: z.string().min(4).max(50).nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  durationMins: z.number().int().min(1).max(1440).nullable().optional(),
  settings: z
    .object({
      waitingRoom: z.boolean().optional(),
      muteOnEntry: z.boolean().optional(),
      allowScreenShare: z.boolean().optional(),
      allowRecording: z.boolean().optional(),
      maxParticipants: z.number().int().min(2).max(1000).optional(),
    })
    .optional(),
});

const joinMeetingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  displayName: z.string().min(1, 'Display name is required').max(100),
  password: z.string().optional(),
});

const leaveMeetingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const endMeetingSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

const muteParticipantSchema = z.object({
  muted: z.boolean(),
});

const muteAllSchema = z.object({
  muted: z.boolean(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

// POST /meetings - Schedule a new meeting
router.post('/meetings', validate(createMeetingSchema), (req: Request, res: Response): void => {
  const body = req.body as z.infer<typeof createMeetingSchema>;
  const now = new Date().toISOString();

  const defaultSettings: MeetingSettings = {
    waitingRoom: false,
    muteOnEntry: false,
    allowScreenShare: true,
    allowRecording: false,
    maxParticipants: 100,
  };

  const meeting: Meeting = {
    id: uuidv4(),
    meetingCode: generateMeetingCode(),
    title: body.title,
    description: body.description ?? null,
    password: body.password ?? null,
    hostUserId: body.hostUserId,
    status: 'scheduled',
    scheduledAt: body.scheduledAt ?? null,
    durationMins: body.durationMins ?? null,
    settings: {
      ...defaultSettings,
      ...body.settings,
    },
    startedAt: null,
    endedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  meetings.set(meeting.id, meeting);
  participants.set(meeting.id, []);

  res.status(201).json({ data: meeting });
});

// GET /meetings/:id - Get meeting by ID
router.get('/meetings/:id', (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const meetingParticipants = participants.get(meeting.id) ?? [];

  res.json({
    data: {
      ...meeting,
      participants: meetingParticipants,
    },
  });
});

// PATCH /meetings/:id - Update meeting
router.patch('/meetings/:id', validate(updateMeetingSchema), (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (meeting.status === 'cancelled' || meeting.status === 'ended') {
    res.status(400).json({ error: `Cannot update a ${meeting.status} meeting` });
    return;
  }

  const body = req.body as z.infer<typeof updateMeetingSchema>;
  const now = new Date().toISOString();

  const updated: Meeting = {
    ...meeting,
    title: body.title ?? meeting.title,
    description: body.description !== undefined ? body.description ?? null : meeting.description,
    password: body.password !== undefined ? body.password ?? null : meeting.password,
    scheduledAt: body.scheduledAt !== undefined ? body.scheduledAt ?? null : meeting.scheduledAt,
    durationMins: body.durationMins !== undefined ? body.durationMins ?? null : meeting.durationMins,
    settings: body.settings ? { ...meeting.settings, ...body.settings } : meeting.settings,
    updatedAt: now,
  };

  meetings.set(meeting.id, updated);

  res.json({ data: updated });
});

// DELETE /meetings/:id - Cancel meeting
router.delete('/meetings/:id', (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (meeting.status === 'cancelled') {
    res.status(400).json({ error: 'Meeting is already cancelled' });
    return;
  }

  if (meeting.status === 'ended') {
    res.status(400).json({ error: 'Cannot cancel an ended meeting' });
    return;
  }

  const now = new Date().toISOString();
  const updated: Meeting = {
    ...meeting,
    status: 'cancelled',
    updatedAt: now,
  };

  meetings.set(meeting.id, updated);

  res.json({ data: updated });
});

// POST /meetings/:id/join - Join a meeting
router.post('/meetings/:id/join', validate(joinMeetingSchema), (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (meeting.status === 'cancelled') {
    res.status(400).json({ error: 'Meeting has been cancelled' });
    return;
  }

  if (meeting.status === 'ended') {
    res.status(400).json({ error: 'Meeting has ended' });
    return;
  }

  const body = req.body as z.infer<typeof joinMeetingSchema>;

  // Check password if meeting is password-protected
  if (meeting.password && body.password !== meeting.password) {
    res.status(403).json({ error: 'Incorrect meeting password' });
    return;
  }

  const meetingParticipants = participants.get(meeting.id) ?? [];

  // Check if user already joined
  const existing = meetingParticipants.find(
    (p) => p.userId === body.userId && (p.status === 'joined' || p.status === 'waiting'),
  );
  if (existing) {
    res.status(409).json({ error: 'User has already joined this meeting', data: existing });
    return;
  }

  // Check max participants
  const activeCount = meetingParticipants.filter((p) => p.status === 'joined').length;
  if (activeCount >= meeting.settings.maxParticipants) {
    res.status(403).json({ error: 'Meeting has reached maximum participant capacity' });
    return;
  }

  const isHost = body.userId === meeting.hostUserId;
  const now = new Date().toISOString();

  const participant: MeetingParticipant = {
    id: uuidv4(),
    meetingId: meeting.id,
    userId: body.userId,
    displayName: body.displayName,
    role: isHost ? 'host' : 'participant',
    status: meeting.settings.waitingRoom && !isHost ? 'waiting' : 'joined',
    isMuted: meeting.settings.muteOnEntry && !isHost,
    isVideoOff: false,
    joinedAt: now,
    leftAt: null,
  };

  meetingParticipants.push(participant);
  participants.set(meeting.id, meetingParticipants);

  // Auto-activate meeting when first person joins if still scheduled
  if (meeting.status === 'scheduled') {
    const activated: Meeting = {
      ...meeting,
      status: 'active',
      startedAt: now,
      updatedAt: now,
    };
    meetings.set(meeting.id, activated);
  }

  res.status(201).json({ data: participant });
});

// POST /meetings/:id/leave - Leave a meeting
router.post('/meetings/:id/leave', validate(leaveMeetingSchema), (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const meetingParticipants = participants.get(meeting.id) ?? [];
  const participant = meetingParticipants.find(
    (p) => p.userId === req.body.userId && p.status === 'joined',
  );

  if (!participant) {
    res.status(404).json({ error: 'Participant not found or not currently in meeting' });
    return;
  }

  const now = new Date().toISOString();
  participant.status = 'left';
  participant.leftAt = now;

  participants.set(meeting.id, meetingParticipants);

  res.json({ data: participant });
});

// POST /meetings/:id/end - End a meeting (host only)
router.post('/meetings/:id/end', validate(endMeetingSchema), (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (meeting.status === 'ended') {
    res.status(400).json({ error: 'Meeting has already ended' });
    return;
  }

  if (meeting.status === 'cancelled') {
    res.status(400).json({ error: 'Meeting has been cancelled' });
    return;
  }

  // Host-only check
  if (req.body.userId !== meeting.hostUserId) {
    res.status(403).json({ error: 'Only the host can end the meeting' });
    return;
  }

  const now = new Date().toISOString();
  const updated: Meeting = {
    ...meeting,
    status: 'ended',
    endedAt: now,
    updatedAt: now,
  };

  meetings.set(meeting.id, updated);

  // Mark all active participants as left
  const meetingParticipants = participants.get(meeting.id) ?? [];
  for (const p of meetingParticipants) {
    if (p.status === 'joined' || p.status === 'waiting') {
      p.status = 'left';
      p.leftAt = now;
    }
  }
  participants.set(meeting.id, meetingParticipants);

  res.json({ data: updated });
});

// POST /meetings/:id/participants/:uid/mute - Mute/unmute a participant
router.post(
  '/meetings/:id/participants/:uid/mute',
  validate(muteParticipantSchema),
  (req: Request, res: Response): void => {
    const meeting = meetings.get(req.params.id);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    const meetingParticipants = participants.get(meeting.id) ?? [];
    const participant = meetingParticipants.find(
      (p) => p.userId === req.params.uid && p.status === 'joined',
    );

    if (!participant) {
      res.status(404).json({ error: 'Participant not found or not currently in meeting' });
      return;
    }

    participant.isMuted = req.body.muted;
    participants.set(meeting.id, meetingParticipants);

    res.json({ data: participant });
  },
);

// POST /meetings/:id/participants/:uid/remove - Remove a participant
router.post('/meetings/:id/participants/:uid/remove', (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const meetingParticipants = participants.get(meeting.id) ?? [];
  const participant = meetingParticipants.find(
    (p) => p.userId === req.params.uid && p.status === 'joined',
  );

  if (!participant) {
    res.status(404).json({ error: 'Participant not found or not currently in meeting' });
    return;
  }

  const now = new Date().toISOString();
  participant.status = 'removed';
  participant.leftAt = now;

  participants.set(meeting.id, meetingParticipants);

  res.json({ data: participant });
});

// POST /meetings/:id/mute-all - Mute/unmute all participants
router.post('/meetings/:id/mute-all', validate(muteAllSchema), (req: Request, res: Response): void => {
  const meeting = meetings.get(req.params.id);
  if (!meeting) {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  const meetingParticipants = participants.get(meeting.id) ?? [];
  const active = meetingParticipants.filter((p) => p.status === 'joined');

  for (const p of active) {
    p.isMuted = req.body.muted;
  }

  participants.set(meeting.id, meetingParticipants);

  res.json({
    data: {
      meetingId: meeting.id,
      muted: req.body.muted,
      affectedCount: active.length,
    },
  });
});

// GET /meetings/join/:code - Find meeting by code
router.get('/meetings/join/:code', (req: Request, res: Response): void => {
  const code = req.params.code;
  let found: Meeting | undefined;

  for (const meeting of meetings.values()) {
    if (meeting.meetingCode === code) {
      found = meeting;
      break;
    }
  }

  if (!found) {
    res.status(404).json({ error: 'Meeting not found for the given code' });
    return;
  }

  if (found.status === 'cancelled') {
    res.status(410).json({ error: 'Meeting has been cancelled' });
    return;
  }

  if (found.status === 'ended') {
    res.status(410).json({ error: 'Meeting has ended' });
    return;
  }

  res.json({
    data: {
      id: found.id,
      meetingCode: found.meetingCode,
      title: found.title,
      status: found.status,
      hasPassword: found.password !== null,
      settings: {
        waitingRoom: found.settings.waitingRoom,
      },
    },
  });
});

export { router as meetingRouter };
