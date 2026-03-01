# Server SDK Guide

The RajutechieStreamKit Server SDK (`@rajutechie-streamkit/server-sdk`) is a Node.js library for server-side operations: generating user tokens, managing resources via the REST API, and verifying webhook signatures.

---

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Token Generation](#token-generation)
- [User Management](#user-management)
- [Channel Management](#channel-management)
- [Call Management](#call-management)
- [Meeting Management](#meeting-management)
- [Live Stream Management](#live-stream-management)
- [Moderation](#moderation)
- [Notifications](#notifications)
- [Webhook Verification](#webhook-verification)
- [Express Middleware](#express-middleware)

---

## Installation

```bash
npm install @rajutechie-streamkit/server-sdk
# or
pnpm add @rajutechie-streamkit/server-sdk
```

---

## Initialization

```typescript
import { RajutechieStreamKitServer } from '@rajutechie-streamkit/server-sdk';

const streamkit = new RajutechieStreamKitServer({
  apiKey:    'sk_live_xxxxx',
  apiSecret: 'secret_xxxxx',
  apiUrl:    'https://your-streamkit-domain.com', // URL of your self-hosted instance
});
```

### Configuration

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | `string` | Your RajutechieStreamKit API key (**required**) |
| `apiSecret` | `string` | Your RajutechieStreamKit API secret (**required**) |
| `apiUrl` | `string` | REST API base URL of your self-hosted instance (**required**) |

---

## Token Generation

Generate JWT tokens for client-side authentication. Tokens are signed with your API secret using HS256.

### Basic Token

```typescript
const token = streamkit.generateToken({
  userId: 'user_001',
});
// Default: role "user", expires in 1 hour
```

### Token with Options

```typescript
const token = streamkit.generateToken({
  userId: 'user_001',
  role: 'moderator',
  expiresIn: '24h', // string or seconds (number)
  grants: {
    chat: ['read', 'write'],
    call: ['start', 'join'],
    meeting: ['join'],
    stream: ['view'],
  },
});
```

### Token Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | `string` | required | The user's unique identifier |
| `role` | `string` | `"user"` | User role: `user`, `moderator`, `admin` |
| `expiresIn` | `string \| number` | `"1h"` | Token lifetime (e.g., `"24h"`, `3600`) |
| `grants` | `object` | `{}` | Permission grants per module |

### Token Verification

```typescript
try {
  const payload = streamkit.verifyToken(token);
  console.log(payload.sub);  // user ID
  console.log(payload.role); // user role
} catch (err) {
  console.error('Invalid token:', err.message);
}
```

### Standalone Token Generator

For lightweight use cases where you only need token generation:

```typescript
import { TokenGenerator } from '@rajutechie-streamkit/server-sdk';

const tokenGen = new TokenGenerator({
  apiKey: 'sk_live_xxxxx',
  apiSecret: 'secret_xxxxx',
});

const token = tokenGen.generate({
  userId: 'user_001',
  name: 'Alice',
  role: 'user',
  expiresIn: '1h',
});
```

---

## User Management

```typescript
// Create a user
const user = await streamkit.users.create({
  externalId: 'your-user-id-123',
  displayName: 'Alice Johnson',
  metadata: { department: 'Engineering' },
});

// Get a user
const fetched = await streamkit.users.get('user_001');

// List users
const { users } = await streamkit.users.list({ limit: 50 });

// Update a user
await streamkit.users.update('user_001', {
  displayName: 'Alice J.',
  metadata: { department: 'Product' },
});

// Delete (deactivate) a user
await streamkit.users.delete('user_001');

// Register a push device token
await streamkit.users.registerDevice('user_001', {
  platform: 'ios',    // 'ios' | 'android' | 'web'
  pushToken: 'device_token_here',
});

// Remove a device token (e.g., on logout)
await streamkit.users.removeDevice('user_001', 'device_token_here');
```

---

## Channel Management

```typescript
// Create a channel
const channel = await streamkit.chat.createChannel({
  type: 'group',      // 'direct', 'group', 'community', 'open'
  name: 'Team Alpha',
  members: ['user_001', 'user_002'],
  createdBy: 'user_001',
  metadata: { project: 'RajutechieStreamKit' },
});

// Delete a channel
await streamkit.chat.deleteChannel('channel_id');

// Send a server-side message
await streamkit.chat.sendMessage('channel_id', {
  text: 'Welcome to the team!',
});
```

---

## Call Management

```typescript
// Create a call
const call = await streamkit.calls.create({
  type: 'video',
  participants: ['user_001', 'user_002'],
});

// Get call details
const callInfo = await streamkit.calls.get(call.id);

// List calls
const { calls } = await streamkit.calls.list({ limit: 20 });

// End a call
await streamkit.calls.end(call.id);

// Recording
await streamkit.calls.startRecording(call.id);
await streamkit.calls.stopRecording(call.id);
```

---

## Meeting Management

```typescript
// Schedule a meeting
const meeting = await streamkit.meetings.schedule({
  title: 'Sprint Planning',
  scheduledAt: '2026-04-01T10:00:00Z',
  duration: 60,
  participants: ['user_001', 'user_002'],
  settings: { muteOnJoin: true, waitingRoom: true },
});

// Get meeting details
const meetingInfo = await streamkit.meetings.get(meeting.id);

// List meetings
const { meetings } = await streamkit.meetings.list({ limit: 20 });

// Update a meeting
await streamkit.meetings.update(meeting.id, { title: 'Updated Sprint Planning' });

// Cancel a meeting
await streamkit.meetings.cancel(meeting.id);

// End a meeting (terminates active session)
await streamkit.meetings.end(meeting.id);

// Add / remove participants
await streamkit.meetings.addParticipant(meeting.id, 'user_003');
await streamkit.meetings.removeParticipant(meeting.id, 'user_003');

// Mute all participants
await streamkit.meetings.muteAll(meeting.id);
```

---

## Live Stream Management

```typescript
// Create a live stream
const stream = await streamkit.streams.create({
  title: 'Product Launch',
  visibility: 'public',
});
console.log('RTMP URL:', stream.rtmpUrl);
console.log('Stream key:', stream.streamKey);

// Get stream details
const streamInfo = await streamkit.streams.get(stream.id);

// List streams
const { streams } = await streamkit.streams.list({ status: 'live' });

// Start / stop streaming
await streamkit.streams.start(stream.id);
await streamkit.streams.stop(stream.id);

// Delete a stream
await streamkit.streams.delete(stream.id);
```

---

## Moderation

```typescript
// Ban a user from a channel (or globally)
await streamkit.moderation.banUser({
  userId: 'user_bad',
  channelId: 'channel_001', // omit for global ban
  reason: 'Spam',
});

// Lift a ban
await streamkit.moderation.unbanUser('user_bad');

// List bans
const { bans } = await streamkit.moderation.listBans({ limit: 50 });

// Create an auto-moderation rule
const rule = await streamkit.moderation.createRule({
  type: 'word',    // 'word' | 'regex'
  value: 'spam',
  action: 'block', // 'flag' | 'block' | 'ban'
});

// List rules
const { rules } = await streamkit.moderation.listRules();

// Delete a rule
await streamkit.moderation.deleteRule(rule.id);

// List reports
const { reports } = await streamkit.moderation.listReports({ status: 'pending' });

// Resolve a report
await streamkit.moderation.resolveReport(reports[0].id, { action: 'dismissed' });
```

---

## Notifications

```typescript
// Send a push / email notification to a user
await streamkit.notifications.send({
  userId: 'user_001',
  title: 'New Message',
  body: 'You have a new message in #general',
  data: { channelId: 'general' },
});

// Send to multiple users in bulk
await streamkit.notifications.sendBulk([
  { userId: 'user_001', title: 'Meeting in 5 min', body: 'Sprint Planning starts soon' },
  { userId: 'user_002', title: 'Meeting in 5 min', body: 'Sprint Planning starts soon' },
]);

// Get notification preferences for a user
const prefs = await streamkit.notifications.getPreferences('user_001');

// Update preferences
await streamkit.notifications.updatePreferences('user_001', {
  push: true,
  email: false,
  inApp: true,
});
```

---

## Webhook Verification

Verify incoming webhook signatures to ensure authenticity:

```typescript
import { verifyWebhookSignature } from '@rajutechie-streamkit/server-sdk';

const event = verifyWebhookSignature(
  rawBody,              // raw request body (string or Buffer)
  signature,            // X-RajutechieStreamKit-Signature header
  'whsec_your_secret',  // your webhook secret
  300                   // tolerance in seconds (optional)
);

console.log(event.type);      // "message.new"
console.log(event.id);        // event ID
console.log(event.timestamp); // ISO timestamp
console.log(event.data);      // event payload
```

### Signature Generation (for testing)

```typescript
import { generateWebhookSignature } from '@rajutechie-streamkit/server-sdk';

const payload = JSON.stringify({ type: 'test', data: {} });
const signature = generateWebhookSignature(payload, 'whsec_your_secret');
// Returns: "t=1707734400,v1=abc123..."
```

---

## Express Middleware

The SDK includes Express-compatible middleware for webhook handling:

```typescript
import express from 'express';
import { webhookMiddleware } from '@rajutechie-streamkit/server-sdk';

const app = express();

app.post('/webhooks/streamkit',
  webhookMiddleware({ secret: 'whsec_your_secret', tolerance: 300 }),
  (req, res) => {
    const event = req.streamkitEvent;

    switch (event.type) {
      case 'message.new':
        handleNewMessage(event.data);
        break;
      case 'call.ended':
        handleCallEnded(event.data);
        break;
    }

    res.sendStatus(200);
  }
);
```

The middleware:
1. Reads the raw request body
2. Extracts the `X-RajutechieStreamKit-Signature` header
3. Verifies the HMAC-SHA256 signature
4. Parses the JSON payload
5. Attaches the event to `req.streamkitEvent`
6. Returns HTTP 400 if verification fails

---

## Integration Examples

### Express Backend

```typescript
import express from 'express';
import { RajutechieStreamKitServer, webhookMiddleware } from '@rajutechie-streamkit/server-sdk';

const app = express();
app.use(express.json());

const streamkit = new RajutechieStreamKitServer({
  apiKey:    process.env.RAJUTECHIE_STREAMKIT_API_KEY!,
  apiSecret: process.env.RAJUTECHIE_STREAMKIT_API_SECRET!,
  apiUrl:    process.env.STREAMKIT_API_URL!, // e.g. https://your-streamkit-domain.com
});

// Token endpoint
app.post('/api/auth/token', async (req, res) => {
  const { userId } = req.body;
  const token = streamkit.generateToken({ userId, role: 'user' });
  res.json({ token });
});

// Create channel
app.post('/api/channels', async (req, res) => {
  const channel = await streamkit.chat.createChannel({
    type: req.body.type,
    name: req.body.name,
    members: req.body.members,
  });
  res.json(channel);
});

// Webhook handler
app.post('/webhooks/streamkit',
  webhookMiddleware({ secret: process.env.WEBHOOK_SECRET! }),
  (req, res) => {
    console.log('Event:', req.streamkitEvent?.type);
    res.sendStatus(200);
  }
);

app.listen(3000);
```

### With Authentication Middleware

```typescript
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    const payload = streamkit.verifyToken(authHeader.slice(7));
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/profile', authMiddleware, (req, res) => {
  res.json({ userId: req.userId });
});
```
