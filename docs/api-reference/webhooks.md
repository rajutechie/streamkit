# Webhooks

RajutechieStreamKit uses webhooks to notify your server about events in real time. When an event occurs (e.g., a new message, a call ending), RajutechieStreamKit sends an HTTP POST request to your configured endpoint with the event payload.

---

## Table of Contents

- [Overview](#overview)
- [Setting Up Webhooks](#setting-up-webhooks)
- [Event Payload Format](#event-payload-format)
- [Signature Verification](#signature-verification)
- [Event Types](#event-types)
- [Handling Webhooks by Framework](#handling-webhooks-by-framework)
- [Retry Policy](#retry-policy)
- [Best Practices](#best-practices)

---

## Overview

Webhooks provide a server-to-server notification mechanism. Unlike WebSocket events (which are client-facing), webhooks allow your backend to react to RajutechieStreamKit events without maintaining persistent connections.

**Use cases:**
- Store messages in your own database
- Trigger push notifications through your own provider
- Audit logging and compliance
- Synchronize user status with your application
- Trigger business logic (e.g., billing, analytics)

---

## Setting Up Webhooks

### Via REST API

```bash
# Register a webhook endpoint
curl -X POST https://api.rajutechie-streamkit.io/v1/webhooks \
  -H "X-API-Key: sk_live_xxxxx" \
  -H "X-API-Secret: secret_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhooks/rajutechie-streamkit",
    "events": ["message.new", "call.ended", "user.updated"],
    "secret": "whsec_your_webhook_secret"
  }'
```

### Via Application Dashboard

1. Navigate to **Settings > Webhooks** in your RajutechieStreamKit dashboard
2. Click **Add Endpoint**
3. Enter your webhook URL
4. Select the events you want to receive
5. Copy the generated webhook secret for signature verification

### Webhook Configuration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | The HTTPS endpoint to receive events |
| `events` | string[] | No | Event types to subscribe to (empty = all events) |
| `secret` | string | Yes | Secret used for HMAC signature verification |
| `active` | boolean | No | Enable/disable the webhook (default: `true`) |

---

## Event Payload Format

Every webhook delivery includes the following JSON structure:

```json
{
  "id": "evt_01H8K3M5N2P4Q6R8S0T1U2V3W4",
  "type": "message.new",
  "timestamp": "2026-02-12T10:30:00.000Z",
  "data": {
    "channel_id": "ch_abc123",
    "message": {
      "id": "msg_xyz789",
      "sender_id": "user_001",
      "content": { "text": "Hello everyone!" },
      "created_at": "2026-02-12T10:30:00.000Z"
    }
  }
}
```

### HTTP Headers

Each webhook request includes these headers:

| Header | Description |
|--------|-------------|
| `Content-Type` | `application/json` |
| `X-RajutechieStreamKit-Signature` | HMAC-SHA256 signature for verification |
| `X-RajutechieStreamKit-Event` | The event type (e.g., `message.new`) |
| `X-RajutechieStreamKit-Delivery-Id` | Unique delivery ID for deduplication |
| `User-Agent` | `RajutechieStreamKit-Webhook/1.0` |

---

## Signature Verification

Every webhook payload is signed with your webhook secret using HMAC-SHA256. **Always verify the signature** before processing the event to ensure authenticity.

### Signature Format

The `X-RajutechieStreamKit-Signature` header follows this format:

```
t=1707734400,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

- `t=` — Unix timestamp when the signature was created
- `v1=` — HMAC-SHA256 hex digest

### Verification Algorithm

1. Extract the timestamp (`t`) and signature (`v1`) from the header
2. Construct the signed payload: `{timestamp}.{raw_body}`
3. Compute HMAC-SHA256 of the signed payload using your webhook secret
4. Compare the computed signature with the received signature using constant-time comparison
5. Optionally check that the timestamp is within tolerance (default: 300 seconds)

### Node.js Verification

```typescript
import { verifyWebhookSignature } from '@rajutechie-streamkit/server-sdk';

// Using the built-in helper
const event = verifyWebhookSignature(
  rawBody,           // raw request body (string or Buffer)
  signature,         // X-RajutechieStreamKit-Signature header value
  'whsec_your_secret',
  300                // tolerance in seconds (optional, default: 300)
);

console.log(event.type); // "message.new"
console.log(event.data); // event payload
```

### Manual Verification (any language)

```python
import hmac
import hashlib
import time

def verify_webhook(payload: bytes, signature: str, secret: str, tolerance: int = 300):
    parts = dict(p.split("=", 1) for p in signature.split(","))
    timestamp = int(parts["t"])
    received_sig = parts["v1"]

    # Check timestamp tolerance
    if abs(time.time() - timestamp) > tolerance:
        raise ValueError("Webhook timestamp outside tolerance")

    # Compute expected signature
    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected_sig = hmac.new(
        secret.encode(), signed_payload.encode(), hashlib.sha256
    ).hexdigest()

    # Constant-time comparison
    if not hmac.compare_digest(expected_sig, received_sig):
        raise ValueError("Webhook signature verification failed")

    return json.loads(payload)
```

---

## Event Types

### Message Events

| Event | Description |
|-------|-------------|
| `message.new` | A new message was sent in a channel |
| `message.updated` | A message was edited |
| `message.deleted` | A message was deleted |
| `message.reaction` | A reaction was added to or removed from a message |
| `message.read` | A message was marked as read |

**`message.new` payload:**

```json
{
  "id": "evt_...",
  "type": "message.new",
  "timestamp": "2026-02-12T10:30:00Z",
  "data": {
    "channel_id": "ch_abc123",
    "message": {
      "id": "msg_xyz789",
      "sender_id": "user_001",
      "type": "text",
      "content": {
        "text": "Hello!",
        "attachments": []
      },
      "reply_to": null,
      "mentions": [],
      "created_at": "2026-02-12T10:30:00Z"
    }
  }
}
```

### Channel Events

| Event | Description |
|-------|-------------|
| `channel.created` | A new channel was created |
| `channel.updated` | Channel settings or metadata changed |
| `channel.deleted` | A channel was deleted |
| `channel.member.added` | A member was added to a channel |
| `channel.member.removed` | A member was removed from a channel |

### Call Events

| Event | Description |
|-------|-------------|
| `call.started` | A call was initiated |
| `call.accepted` | A call was accepted by a participant |
| `call.rejected` | A call was rejected |
| `call.ended` | A call ended |
| `call.recording.ready` | A call recording finished processing |

**`call.ended` payload:**

```json
{
  "id": "evt_...",
  "type": "call.ended",
  "timestamp": "2026-02-12T11:00:00Z",
  "data": {
    "call_id": "call_abc123",
    "type": "video",
    "initiated_by": "user_001",
    "participants": ["user_001", "user_002"],
    "started_at": "2026-02-12T10:45:00Z",
    "ended_at": "2026-02-12T11:00:00Z",
    "end_reason": "completed",
    "duration_seconds": 900
  }
}
```

### Meeting Events

| Event | Description |
|-------|-------------|
| `meeting.started` | A scheduled meeting started |
| `meeting.ended` | A meeting ended |
| `meeting.participant.joined` | A participant joined a meeting |
| `meeting.participant.left` | A participant left a meeting |

### Stream Events

| Event | Description |
|-------|-------------|
| `stream.started` | A live stream went live |
| `stream.ended` | A live stream ended |
| `stream.viewer.joined` | A viewer joined a live stream |

### User Events

| Event | Description |
|-------|-------------|
| `user.created` | A new user was created |
| `user.updated` | A user profile was updated |
| `user.deactivated` | A user was deactivated |

### Moderation Events

| Event | Description |
|-------|-------------|
| `moderation.flagged` | Content was flagged by auto-moderation |
| `moderation.action` | A moderation action was taken (ban, mute, etc.) |

---

## Handling Webhooks by Framework

### Express.js (with middleware)

```typescript
import express from 'express';
import { webhookMiddleware } from '@rajutechie-streamkit/server-sdk';

const app = express();

app.post('/webhooks/rajutechie-streamkit',
  webhookMiddleware({ secret: 'whsec_your_secret' }),
  (req, res) => {
    const event = req.rajutechie-streamkitEvent;

    switch (event.type) {
      case 'message.new':
        console.log('New message:', event.data.message);
        break;
      case 'call.ended':
        console.log('Call ended:', event.data.call_id);
        break;
      default:
        console.log('Unhandled event:', event.type);
    }

    res.sendStatus(200);
  }
);
```

### Django

```python
# views.py
from rajutechie_streamkit_django.webhooks import verify_webhook
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def rajutechie-streamkit_webhook(request):
    signature = request.headers.get("X-RajutechieStreamKit-Signature", "")

    try:
        event = verify_webhook(request.body, signature, "whsec_your_secret")
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    if event["type"] == "message.new":
        handle_new_message(event["data"])
    elif event["type"] == "call.ended":
        handle_call_ended(event["data"])

    return JsonResponse({"status": "ok"})
```

### Spring Boot

```java
@RestController
@RequestMapping("/webhooks")
public class WebhookController {

    @Value("${rajutechie-streamkit.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/rajutechie-streamkit")
    public ResponseEntity<Void> handleWebhook(
            @RequestBody String payload,
            @RequestHeader("X-RajutechieStreamKit-Signature") String signature) {

        WebhookEvent event = RajutechieStreamKitWebhook.verify(payload, signature, webhookSecret);

        switch (event.getType()) {
            case "message.new" -> handleNewMessage(event.getData());
            case "call.ended"  -> handleCallEnded(event.getData());
        }

        return ResponseEntity.ok().build();
    }
}
```

### FastAPI

```python
from fastapi import FastAPI, Request, HTTPException
from rajutechie_streamkit_fastapi.webhooks import verify_webhook

app = FastAPI()

@app.post("/webhooks/rajutechie-streamkit")
async def handle_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("X-RajutechieStreamKit-Signature", "")

    try:
        event = verify_webhook(body, signature, "whsec_your_secret")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "message.new":
        await process_new_message(event["data"])

    return {"status": "ok"}
```

---

## Retry Policy

If your endpoint returns a non-2xx status code or times out, RajutechieStreamKit retries the delivery with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 1 minute |
| 3 | 5 minutes |
| 4 | 30 minutes |
| 5 | 2 hours |
| 6 | 8 hours |

- **Maximum retries**: 6 attempts
- **Timeout**: 30 seconds per delivery attempt
- **Expected response**: HTTP 2xx status code

After all retry attempts are exhausted, the event is marked as failed and visible in the webhook delivery logs.

### Viewing Delivery Logs

```bash
# List recent deliveries for a webhook
curl https://api.rajutechie-streamkit.io/v1/webhooks/{webhook_id}/logs \
  -H "X-API-Key: sk_live_xxxxx"
```

Response includes delivery status, response code, and timing for each attempt.

---

## Best Practices

1. **Always verify signatures** — Never process webhook events without verifying the HMAC signature to prevent spoofing.

2. **Respond quickly** — Return a 2xx response within 5 seconds. Process events asynchronously if they require heavy computation.

3. **Handle duplicates** — Use the `X-RajutechieStreamKit-Delivery-Id` header or event `id` for idempotency. The same event may be delivered more than once.

4. **Subscribe selectively** — Only subscribe to the events you need to reduce unnecessary traffic and processing.

5. **Use HTTPS** — Webhook endpoints must use HTTPS in production.

6. **Monitor failures** — Check webhook delivery logs regularly and set up alerts for persistent failures.

7. **Rotate secrets** — Periodically rotate your webhook secret. RajutechieStreamKit supports configuring a new secret before deactivating the old one.

8. **Queue processing** — For high-volume applications, push webhook events into a message queue (e.g., Redis, RabbitMQ) and process them asynchronously.
