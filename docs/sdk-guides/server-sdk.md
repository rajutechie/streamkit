# Server SDK Guide

The RajutechieStreamKit Server SDK (`@rajutechie-streamkit/server-sdk`) is a Node.js library for server-side operations: generating user tokens, managing resources via the REST API, and verifying webhook signatures.

---

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Token Generation](#token-generation)
- [User Management](#user-management)
- [Channel Management](#channel-management)
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

const rajutechie-streamkit = new RajutechieStreamKitServer({
  apiKey: 'sk_live_xxxxx',
  apiSecret: 'secret_xxxxx',
  apiUrl: 'https://api.rajutechie-streamkit.io/v1', // optional
});
```

### Configuration

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `apiKey` | `string` | required | Your RajutechieStreamKit API key |
| `apiSecret` | `string` | required | Your RajutechieStreamKit API secret |
| `apiUrl` | `string` | `https://api.rajutechie-streamkit.io/v1` | API base URL |

---

## Token Generation

Generate JWT tokens for client-side authentication. Tokens are signed with your API secret using HS256.

### Basic Token

```typescript
const token = rajutechie-streamkit.generateToken({
  userId: 'user_001',
});
// Default: role "user", expires in 1 hour
```

### Token with Options

```typescript
const token = rajutechie-streamkit.generateToken({
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
  const payload = rajutechie-streamkit.verifyToken(token);
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
const user = await rajutechie-streamkit.users.create({
  externalId: 'your-user-id-123',
  displayName: 'Alice Johnson',
  metadata: { department: 'Engineering' },
});

// Get a user
const fetched = await rajutechie-streamkit.users.get('user_001');

// Update a user
await rajutechie-streamkit.users.update('user_001', {
  displayName: 'Alice J.',
  metadata: { department: 'Product' },
});

// Delete (deactivate) a user
await rajutechie-streamkit.users.delete('user_001');
```

---

## Channel Management

```typescript
// Create a channel
const channel = await rajutechie-streamkit.chat.createChannel({
  type: 'group',      // 'direct', 'group', 'community', 'open'
  name: 'Team Alpha',
  members: ['user_001', 'user_002'],
  createdBy: 'user_001',
  metadata: { project: 'RajutechieStreamKit' },
});

// Delete a channel
await rajutechie-streamkit.chat.deleteChannel('channel_id');

// Send a server-side message
await rajutechie-streamkit.chat.sendMessage('channel_id', {
  text: 'Welcome to the team!',
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

app.post('/webhooks/rajutechie-streamkit',
  webhookMiddleware({ secret: 'whsec_your_secret', tolerance: 300 }),
  (req, res) => {
    const event = req.rajutechie-streamkitEvent;

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
5. Attaches the event to `req.rajutechie-streamkitEvent`
6. Returns HTTP 400 if verification fails

---

## Integration Examples

### Express Backend

```typescript
import express from 'express';
import { RajutechieStreamKitServer, webhookMiddleware } from '@rajutechie-streamkit/server-sdk';

const app = express();
app.use(express.json());

const rajutechie-streamkit = new RajutechieStreamKitServer({
  apiKey: process.env.RAJUTECHIE_STREAMKIT_API_KEY!,
  apiSecret: process.env.RAJUTECHIE_STREAMKIT_API_SECRET!,
});

// Token endpoint
app.post('/api/auth/token', async (req, res) => {
  const { userId } = req.body;
  const token = rajutechie-streamkit.generateToken({ userId, role: 'user' });
  res.json({ token });
});

// Create channel
app.post('/api/channels', async (req, res) => {
  const channel = await rajutechie-streamkit.chat.createChannel({
    type: req.body.type,
    name: req.body.name,
    members: req.body.members,
  });
  res.json(channel);
});

// Webhook handler
app.post('/webhooks/rajutechie-streamkit',
  webhookMiddleware({ secret: process.env.WEBHOOK_SECRET! }),
  (req, res) => {
    console.log('Event:', req.rajutechie-streamkitEvent?.type);
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
    const payload = rajutechie-streamkit.verifyToken(authHeader.slice(7));
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
