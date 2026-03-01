import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { validate } from '../middleware/validate.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PollOption {
  id: string;
  text: string;
  votes: number;
}

interface MeetingPoll {
  id: string;
  meetingId: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  /** Maps optionId -> set of userIds (for non-anonymous de-duplication) */
  voters: Map<string, Set<string>>;
  /** Set of all userIds who voted (to enforce one-vote-per-user) */
  votedUsers: Set<string>;
  status: 'active' | 'closed';
  createdAt: string;
}

interface BreakoutRoom {
  id: string;
  meetingId: string;
  name: string;
  participants: string[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// In-memory data stores
// ---------------------------------------------------------------------------
const polls = new Map<string, MeetingPoll[]>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createPollSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500),
  options: z
    .array(z.string().min(1).max(200))
    .min(2, 'At least 2 options required')
    .max(20, 'Maximum 20 options allowed'),
  isAnonymous: z.boolean().optional(),
});

const votePollSchema = z.object({
  optionId: z.string().min(1, 'Option ID is required'),
  userId: z.string().min(1, 'User ID is required'),
});

const createBreakoutRoomsSchema = z.object({
  rooms: z
    .array(
      z.object({
        name: z.string().min(1, 'Room name is required').max(100),
        participants: z.array(z.string()).optional(),
      }),
    )
    .min(1, 'At least 1 room is required')
    .max(50, 'Maximum 50 breakout rooms allowed'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialise a poll to a plain object (strips internal voter tracking). */
function serializePoll(poll: MeetingPoll) {
  return {
    id: poll.id,
    meetingId: poll.meetingId,
    question: poll.question,
    options: poll.options,
    isAnonymous: poll.isAnonymous,
    totalVotes: poll.options.reduce((sum, o) => sum + o.votes, 0),
    status: poll.status,
    createdAt: poll.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

// POST /meetings/:id/polls - Create a poll
router.post('/meetings/:id/polls', validate(createPollSchema), (req: Request, res: Response): void => {
  const meetingId = req.params.id;
  const body = req.body as z.infer<typeof createPollSchema>;
  const now = new Date().toISOString();

  const options: PollOption[] = body.options.map((text) => ({
    id: uuidv4(),
    text,
    votes: 0,
  }));

  const voters = new Map<string, Set<string>>();
  for (const opt of options) {
    voters.set(opt.id, new Set());
  }

  const poll: MeetingPoll = {
    id: uuidv4(),
    meetingId,
    question: body.question,
    options,
    isAnonymous: body.isAnonymous ?? false,
    voters,
    votedUsers: new Set(),
    status: 'active',
    createdAt: now,
  };

  const meetingPolls = polls.get(meetingId) ?? [];
  meetingPolls.push(poll);
  polls.set(meetingId, meetingPolls);

  res.status(201).json({ data: serializePoll(poll) });
});

// POST /meetings/:id/polls/:pid/vote - Vote on a poll
router.post(
  '/meetings/:id/polls/:pid/vote',
  validate(votePollSchema),
  (req: Request, res: Response): void => {
    const { id: meetingId, pid: pollId } = req.params;
    const body = req.body as z.infer<typeof votePollSchema>;

    const meetingPolls = polls.get(meetingId);
    if (!meetingPolls) {
      res.status(404).json({ error: 'No polls found for this meeting' });
      return;
    }

    const poll = meetingPolls.find((p) => p.id === pollId);
    if (!poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    if (poll.status === 'closed') {
      res.status(400).json({ error: 'Poll is closed' });
      return;
    }

    // Check if user already voted
    if (poll.votedUsers.has(body.userId)) {
      res.status(409).json({ error: 'User has already voted on this poll' });
      return;
    }

    // Find the option
    const option = poll.options.find((o) => o.id === body.optionId);
    if (!option) {
      res.status(400).json({ error: 'Invalid option ID' });
      return;
    }

    // Record the vote
    option.votes += 1;
    poll.votedUsers.add(body.userId);

    const voterSet = poll.voters.get(body.optionId);
    if (voterSet) {
      voterSet.add(body.userId);
    }

    res.json({ data: serializePoll(poll) });
  },
);

// GET /meetings/:id/polls - List polls for a meeting
router.get('/meetings/:id/polls', (req: Request, res: Response): void => {
  const meetingId = req.params.id;
  const meetingPolls = polls.get(meetingId) ?? [];

  res.json({ data: meetingPolls.map(serializePoll) });
});

// POST /meetings/:id/breakout-rooms - Create breakout rooms
router.post(
  '/meetings/:id/breakout-rooms',
  validate(createBreakoutRoomsSchema),
  (req: Request, res: Response): void => {
    const meetingId = req.params.id;
    const body = req.body as z.infer<typeof createBreakoutRoomsSchema>;
    const now = new Date().toISOString();

    const rooms: BreakoutRoom[] = body.rooms.map((room) => ({
      id: uuidv4(),
      meetingId,
      name: room.name,
      participants: room.participants ?? [],
      createdAt: now,
    }));

    res.status(201).json({ data: rooms });
  },
);

export { router as pollRouter };
