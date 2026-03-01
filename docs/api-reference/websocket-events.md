# RajutechieStreamKit WebSocket Events Reference

**Connection URL:** `wss://ws.rajutechie-streamkit.io?token={jwt_token}`

RajutechieStreamKit uses [Socket.IO](https://socket.io/) (v4) over WebSocket for real-time bidirectional communication. The server supports both `websocket` and `polling` transports, with `websocket` preferred for production use.

---

## Table of Contents

- [Connection](#connection)
- [Message Format](#message-format)
- [Client to Server Events](#client-to-server-events)
  - [subscribe](#subscribe)
  - [unsubscribe](#unsubscribe)
  - [message.send](#messagesend)
  - [typing.start](#typingstart)
  - [typing.stop](#typingstop)
  - [presence.update](#presenceupdate)
  - [call.join](#calljoin)
  - [call.signal](#callsignal)
  - [call.leave](#callleave)
  - [meeting.join](#meetingjoin)
  - [meeting.signal](#meetingsignal)
  - [meeting.leave](#meetingleave)
  - [reaction.send](#reactionsend)
  - [hand.raise](#handraise)
  - [hand.lower](#handlever)
  - [ping](#ping)
- [Server to Client Events](#server-to-client-events)
  - [Chat Events](#chat-events)
  - [Typing Events](#typing-events)
  - [Presence Events](#presence-events)
  - [Channel Events](#channel-events)
  - [Call Events](#call-events)
  - [Meeting Events](#meeting-events)
  - [Stream Events](#stream-events)
  - [System Events](#system-events)
- [Connection Lifecycle](#connection-lifecycle)
- [Reconnection Strategy](#reconnection-strategy)
- [Error Handling](#error-handling)

---

## Connection

### Establishing a Connection

Connect using the Socket.IO client library with a valid JWT access token obtained from the [REST API auth endpoint](./rest-api.md#post-authtoken).

**JavaScript Example:**

```javascript
import { io } from "socket.io-client";

const socket = io("wss://ws.rajutechie-streamkit.io", {
  auth: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    device: "web"
  },
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000
});

socket.on("connect", () => {
  console.log("Connected:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("Connection failed:", err.message);
  if (err.data?.code === "SERVER_AT_CAPACITY") {
    // Back off and retry later
  }
});
```

### Authentication

Authentication is handled during the Socket.IO handshake. The server validates the JWT token before allowing the connection. On successful authentication, the socket is automatically joined to a personal room `user:{userId}` for targeted messaging.

| Auth Parameter | Type   | Required | Description                                   |
|----------------|--------|----------|-----------------------------------------------|
| `token`        | string | Yes      | JWT access token from `/auth/token`           |
| `device`       | string | No       | Device identifier (e.g., `web`, `ios`, `android`) |

### Connection Rejection

If authentication fails or the server is at capacity, the `connect_error` event fires:

```javascript
socket.on("connect_error", (err) => {
  // err.message: "Authentication failed" | "Server at capacity"
  // err.data.code: "INVALID_TOKEN" | "SERVER_AT_CAPACITY"
});
```

---

## Message Format

All WebSocket events follow a consistent structure. Events are emitted as Socket.IO events with a string event name and a data payload object.

### Client to Server

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "message": {
    "type": "text",
    "content": "Hello world"
  }
}
```

Most client-to-server events support an **acknowledgement callback** as the last argument. The server invokes this callback with a result object:

```javascript
socket.emit("subscribe", { channelId: "ch_123" }, (response) => {
  if (response.error) {
    console.error("Failed:", response.error);
  } else {
    console.log("Subscribed:", response.channelId);
  }
});
```

### Server to Client

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_001",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

## Client to Server Events

### subscribe

Subscribe to a channel to receive messages and events for that channel. The user is added to the channel's Socket.IO room and tracked in Redis for cross-instance queries.

**Payload:**

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

| Field       | Type   | Required | Description                    |
|-------------|--------|----------|--------------------------------|
| `channelId` | string | Yes      | Channel ID to subscribe to (1-256 chars) |

**Acknowledgement (success):**

```json
{
  "ok": true,
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

**Acknowledgement (error):**

```json
{
  "error": "INVALID_PAYLOAD",
  "details": { "fieldErrors": { "channelId": ["Required"] } }
}
```

---

### unsubscribe

Unsubscribe from a channel. Removes the user from the channel room, clears Redis membership tracking, and removes any active typing indicator.

**Payload:**

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

| Field       | Type   | Required | Description                       |
|-------------|--------|----------|-----------------------------------|
| `channelId` | string | Yes      | Channel ID to unsubscribe from    |

**Acknowledgement:**

```json
{
  "ok": true,
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

---

### message.send

Send a message to a channel. The message is broadcast to all subscribers in the channel (including the sender for confirmation), published to Kafka for persistence, and the sender's typing indicator is automatically cleared.

**Payload:**

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "message": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "text",
    "content": "Hello everyone!",
    "metadata": {
      "clientTimestamp": "2026-02-12T10:30:00.000Z"
    }
  }
}
```

| Field              | Type   | Required | Description                                       |
|--------------------|--------|----------|---------------------------------------------------|
| `channelId`        | string | Yes      | Target channel ID                                 |
| `message.id`       | string | No       | Client-generated UUID. Auto-generated if omitted  |
| `message.type`     | string | No       | One of: `text`, `image`, `file`, `system`. Default: `text` |
| `message.content`  | string | Yes      | Message content (1-10,000 chars)                  |
| `message.metadata` | object | No       | Arbitrary metadata attached to the message        |

**Acknowledgement:**

```json
{
  "ok": true,
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

**Triggers Server Event:** `message.received` (broadcast to all channel subscribers)

---

### typing.start

Indicate that the user has started typing in a channel. The typing indicator is stored in Redis with a 5-second TTL and broadcast to other subscribers. Send this event periodically (e.g., every 3 seconds) while the user is actively typing.

**Payload:**

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

| Field       | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `channelId` | string | Yes      | Channel where typing     |

**No acknowledgement.** Triggers `typing.started` server event to other subscribers.

---

### typing.stop

Indicate that the user has stopped typing. Clears the typing indicator in Redis and notifies other subscribers.

**Payload:**

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012"
}
```

| Field       | Type   | Required | Description              |
|-------------|--------|----------|--------------------------|
| `channelId` | string | Yes      | Channel where typing stopped |

**No acknowledgement.** Triggers `typing.stopped` server event to other subscribers.

---

### presence.update

Update the user's presence status. The update is stored in Redis and broadcast to interested clients via both Socket.IO rooms and Redis pub/sub for cross-instance delivery.

**Payload:**

```json
{
  "status": "away",
  "customMessage": "In a meeting until 3pm"
}
```

| Field           | Type   | Required | Description                                          |
|-----------------|--------|----------|------------------------------------------------------|
| `status`        | string | Yes      | One of: `online`, `away`, `busy`, `dnd`, `offline`   |
| `customMessage` | string | No       | Custom status message (max 256 chars)                |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `presence.changed` (broadcast to user's personal room and via Redis pub/sub)

---

### call.join

Join a call room. The user is added to the call's Socket.IO room and tracked as a participant in Redis. Existing participants are notified and the current participant list is returned.

**Payload:**

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234"
}
```

| Field    | Type   | Required | Description            |
|----------|--------|----------|------------------------|
| `callId` | string | Yes      | Call ID to join        |

**Acknowledgement:**

```json
{
  "ok": true,
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "participants": ["user_001", "user_002"]
}
```

**Triggers Server Event:** `call.participant.joined` (broadcast to existing call participants)

---

### call.signal

Send a WebRTC signaling message within a call. Can target a specific user (for 1:1 or targeted signaling) or broadcast to all other participants.

**Payload:**

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "targetUserId": "user_002",
  "signalType": "offer",
  "payload": {
    "sdp": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

| Field          | Type   | Required | Description                                                    |
|----------------|--------|----------|----------------------------------------------------------------|
| `callId`       | string | Yes      | Call ID                                                        |
| `targetUserId` | string | No       | Target user for direct signaling. Omit for broadcast           |
| `signalType`   | string | Yes      | One of: `offer`, `answer`, `ice-candidate`, `renegotiate`, `hangup`, `reject`, `busy` |
| `payload`      | object | Yes      | Signal-specific data (SDP, ICE candidate, etc.)                |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `call.signal` (to target user or broadcast to call room)

---

### call.leave

Leave a call room. The user is removed from the Socket.IO room and Redis tracking. If no participants remain, the call resources are cleaned up.

**Payload:**

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234"
}
```

| Field    | Type   | Required | Description            |
|----------|--------|----------|------------------------|
| `callId` | string | Yes      | Call ID to leave       |

**Acknowledgement:**

```json
{
  "ok": true,
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234"
}
```

**Triggers Server Event:** `call.participant.left` (broadcast to remaining participants)

---

### meeting.join

Join a meeting room. Returns the current participant list and raised hands state.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "displayName": "Jane Doe"
}
```

| Field         | Type   | Required | Description                           |
|---------------|--------|----------|---------------------------------------|
| `meetingId`   | string | Yes      | Meeting ID to join                    |
| `displayName` | string | No       | Display name (max 128 chars). Defaults to user ID |

**Acknowledgement:**

```json
{
  "ok": true,
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "participants": [
    {
      "userId": "user_001",
      "displayName": "Jane Doe",
      "joinedAt": "2026-02-12T10:30:00.000Z",
      "device": "web"
    },
    {
      "userId": "user_002",
      "displayName": "John Smith",
      "joinedAt": "2026-02-12T10:31:00.000Z",
      "device": "ios"
    }
  ],
  "raisedHands": [
    {
      "userId": "user_002",
      "raisedAt": "2026-02-12T10:32:00.000Z"
    }
  ]
}
```

**Triggers Server Event:** `meeting.participant.joined` (broadcast to existing meeting participants)

---

### meeting.signal

Send a WebRTC signaling message within a meeting. Supports standard WebRTC signals plus meeting-specific signals for mute/unmute and screen sharing.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "targetUserId": "user_002",
  "signalType": "offer",
  "payload": {
    "sdp": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n..."
  }
}
```

| Field          | Type   | Required | Description                                                    |
|----------------|--------|----------|----------------------------------------------------------------|
| `meetingId`    | string | Yes      | Meeting ID                                                     |
| `targetUserId` | string | No       | Target user for direct signaling. Omit for broadcast           |
| `signalType`   | string | Yes      | One of: `offer`, `answer`, `ice-candidate`, `renegotiate`, `mute`, `unmute`, `screen-share-start`, `screen-share-stop` |
| `payload`      | object | Yes      | Signal-specific data                                           |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `meeting.signal` (to target user or broadcast to meeting room)

---

### meeting.leave

Leave a meeting room. Clears participant tracking and any raised hand for the user.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345"
}
```

| Field       | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `meetingId` | string | Yes      | Meeting ID to leave    |

**Acknowledgement:**

```json
{
  "ok": true,
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345"
}
```

**Triggers Server Event:** `meeting.participant.left` (broadcast to remaining participants)

---

### reaction.send

Send an ephemeral reaction during a meeting. Reactions are broadcast-only and not persisted.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "reaction": "thumbs-up"
}
```

| Field       | Type   | Required | Description                                                              |
|-------------|--------|----------|--------------------------------------------------------------------------|
| `meetingId` | string | Yes      | Meeting ID                                                               |
| `reaction`  | string | Yes      | One of: `thumbs-up`, `thumbs-down`, `clap`, `heart`, `laugh`, `surprise`, `fire` |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `reaction.received` (broadcast to all meeting participants)

---

### hand.raise

Raise your hand during a meeting. The hand raise is stored in a Redis sorted set ordered by timestamp, enabling consistent ordering across instances.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345"
}
```

| Field       | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `meetingId` | string | Yes      | Meeting ID             |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `hand.raised` (broadcast to all meeting participants)

---

### hand.lower

Lower your raised hand during a meeting. Removes the entry from the Redis sorted set.

**Payload:**

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345"
}
```

| Field       | Type   | Required | Description            |
|-------------|--------|----------|------------------------|
| `meetingId` | string | Yes      | Meeting ID             |

**Acknowledgement:**

```json
{
  "ok": true
}
```

**Triggers Server Event:** `hand.lowered` (broadcast to all meeting participants)

---

### ping

Application-level ping for connection health checking, supplementing the Socket.IO engine-level heartbeat. The server responds either via the acknowledgement callback or by emitting a `pong` event.

**Payload:** None (empty or omitted).

**Acknowledgement:**

```json
{
  "pong": true,
  "timestamp": 1707739800000
}
```

**Alternative Response:** If no acknowledgement callback is provided, the server emits a `pong` event:

```json
{
  "timestamp": 1707739800000
}
```

---

## Server to Client Events

### Chat Events

#### message.received

A new message has been sent to a subscribed channel. This event is broadcast to all subscribers of the channel, including the sender.

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_001",
  "type": "text",
  "content": "Hello everyone!",
  "metadata": {},
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### message.updated

A message in a subscribed channel has been edited (delivered via webhook/Kafka; see [REST API](./rest-api.md#patch-channelsidmessagesmid)).

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_001",
  "text": "Updated message content",
  "isEdited": true,
  "editedAt": "2026-02-12T11:00:00.000Z",
  "timestamp": "2026-02-12T11:00:00.000Z"
}
```

#### message.deleted

A message in a subscribed channel has been deleted.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "deletedBy": "user_001",
  "timestamp": "2026-02-12T11:05:00.000Z"
}
```

#### message.reaction

A reaction has been added to or removed from a message.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_002",
  "emoji": "thumbsup",
  "action": "added",
  "timestamp": "2026-02-12T11:10:00.000Z"
}
```

#### message.read

A user has marked a message as read.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "messageId": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "user_002",
  "timestamp": "2026-02-12T11:15:00.000Z"
}
```

---

### Typing Events

#### typing.started

Another user has started typing in a subscribed channel. This event is not sent to the typing user themselves.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_002",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### typing.stopped

Another user has stopped typing in a subscribed channel.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_002",
  "timestamp": "2026-02-12T10:30:05.000Z"
}
```

> **Note:** Typing indicators automatically expire after 5 seconds in Redis. If the client disconnects or leaves the channel, the typing indicator is also cleared.

---

### Presence Events

#### presence.changed

A user's presence status has changed. Delivered to the user's personal room and via Redis pub/sub for cross-instance fanout.

```json
{
  "userId": "user_001",
  "status": "away",
  "customMessage": "In a meeting until 3pm",
  "device": "web",
  "last_seen": "2026-02-12T10:30:00.000Z"
}
```

| Field           | Type   | Description                                     |
|-----------------|--------|-------------------------------------------------|
| `userId`        | string | User whose presence changed                     |
| `status`        | string | New status: `online`, `away`, `busy`, `dnd`, `offline` |
| `customMessage` | string | Custom status message (if set)                  |
| `device`        | string | Device from which the status was set            |
| `last_seen`     | string | ISO 8601 timestamp of the status change         |

> **Note:** When a user disconnects from all sockets, their status automatically transitions to `offline`. Presence data remains queryable in Redis for 24 hours after going offline.

---

### Channel Events

#### channel.updated

A channel's properties have been modified.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "changes": {
    "name": "Updated Channel Name",
    "description": "New description"
  },
  "updatedBy": "user_001",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### channel.member.added

A new member has been added to a subscribed channel.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_003",
  "role": "member",
  "addedBy": "user_001",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### channel.member.removed

A member has been removed from a subscribed channel.

```json
{
  "channelId": "a1b2c3d4-5678-9012-3456-789abcdef012",
  "userId": "user_003",
  "removedBy": "user_001",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

---

### Call Events

#### call.incoming

An incoming call notification sent to the callee(s).

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "type": "video",
  "initiatedBy": "user_001",
  "participants": ["user_001", "user_002"],
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### call.accepted

A call has been accepted by a participant.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "acceptedBy": "user_002",
  "timestamp": "2026-02-12T10:30:05.000Z"
}
```

#### call.rejected

A call has been rejected by a participant.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "rejectedBy": "user_002",
  "timestamp": "2026-02-12T10:30:05.000Z"
}
```

#### call.ended

A call has ended.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "endReason": "completed",
  "duration": 342,
  "timestamp": "2026-02-12T10:35:42.000Z"
}
```

#### call.signal

A WebRTC signaling message from another participant in the call.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "fromUserId": "user_001",
  "signalType": "offer",
  "payload": {
    "sdp": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n..."
  },
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### call.participant.joined

A participant has joined the call.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "userId": "user_003",
  "timestamp": "2026-02-12T10:30:10.000Z"
}
```

#### call.participant.left

A participant has left the call.

```json
{
  "callId": "c3d4e5f6-7890-1234-5678-9abcdef01234",
  "userId": "user_003",
  "timestamp": "2026-02-12T10:35:00.000Z"
}
```

---

### Meeting Events

#### meeting.participant.joined

A participant has joined the meeting.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_002",
  "displayName": "John Smith",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### meeting.participant.left

A participant has left the meeting.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_002",
  "timestamp": "2026-02-12T10:45:00.000Z"
}
```

#### meeting.participant.muted

A participant's mute status has changed.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_002",
  "isMuted": true,
  "mutedBy": "user_001",
  "timestamp": "2026-02-12T10:35:00.000Z"
}
```

#### meeting.signal

A WebRTC signaling message from another meeting participant.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "fromUserId": "user_001",
  "signalType": "offer",
  "payload": {
    "sdp": "v=0\r\no=- 4611731400430051336 2 IN IP4 127.0.0.1\r\n..."
  },
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### meeting.started

A scheduled meeting has been activated (first participant joined).

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "title": "Weekly Standup",
  "hostUserId": "user_001",
  "startedAt": "2026-02-12T10:30:00.000Z"
}
```

#### hand.raised

A participant has raised their hand.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_002",
  "raisedAt": "2026-02-12T10:32:00.000Z"
}
```

#### hand.lowered

A participant has lowered their hand.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_002",
  "timestamp": "2026-02-12T10:33:00.000Z"
}
```

#### reaction.received

An ephemeral reaction from a meeting participant (not persisted).

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "userId": "user_003",
  "reaction": "clap",
  "timestamp": "2026-02-12T10:34:00.000Z"
}
```

#### meeting.poll.created

A new poll has been created in the meeting.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "poll": {
    "id": "poll_abc123",
    "question": "Should we extend the sprint?",
    "options": [
      { "id": "opt_001", "text": "Yes", "votes": 0 },
      { "id": "opt_002", "text": "No", "votes": 0 }
    ],
    "isAnonymous": false,
    "status": "active"
  },
  "createdBy": "user_001",
  "timestamp": "2026-02-12T10:35:00.000Z"
}
```

#### meeting.poll.result

A vote has been cast on a poll, or the poll has been closed.

```json
{
  "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345",
  "poll": {
    "id": "poll_abc123",
    "question": "Should we extend the sprint?",
    "options": [
      { "id": "opt_001", "text": "Yes", "votes": 8 },
      { "id": "opt_002", "text": "No", "votes": 4 }
    ],
    "totalVotes": 12,
    "status": "active"
  },
  "timestamp": "2026-02-12T10:36:00.000Z"
}
```

---

### Stream Events

#### stream.started

A live stream has gone live.

```json
{
  "streamId": "e5f6a7b8-9012-3456-7890-bcdef0123456",
  "hostUserId": "user_001",
  "title": "Product Launch Keynote",
  "visibility": "public",
  "hlsUrl": "https://cdn.rajutechie-streamkit.io/live/e5f6a7b8.../index.m3u8",
  "startedAt": "2026-02-12T14:00:00.000Z"
}
```

#### stream.ended

A live stream has ended.

```json
{
  "streamId": "e5f6a7b8-9012-3456-7890-bcdef0123456",
  "hostUserId": "user_001",
  "title": "Product Launch Keynote",
  "endedAt": "2026-02-12T15:30:00.000Z",
  "peakViewerCount": 2300,
  "durationMs": 5400000
}
```

#### stream.viewer.count

Periodic viewer count updates for a live stream.

```json
{
  "streamId": "e5f6a7b8-9012-3456-7890-bcdef0123456",
  "count": 1247,
  "peakCount": 2300,
  "timestamp": "2026-02-12T14:15:00.000Z"
}
```

---

### System Events

#### notification

A server-side notification pushed to a specific user.

```json
{
  "id": "notif_abc123",
  "type": "meeting_reminder",
  "title": "Meeting starting in 5 minutes",
  "body": "Weekly Engineering Standup starts at 9:00 AM",
  "data": {
    "meetingId": "d4e5f6a7-8901-2345-6789-abcdef012345"
  },
  "timestamp": "2026-02-12T08:55:00.000Z"
}
```

#### error

A server-side error related to the current socket.

```json
{
  "code": "INVALID_PAYLOAD",
  "message": "Validation failed for message.send event",
  "details": {
    "fieldErrors": {
      "message.content": ["Required"]
    }
  },
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

#### pong

Response to a client `ping` event when no acknowledgement callback was provided.

```json
{
  "timestamp": 1707739800000
}
```

---

## Connection Lifecycle

### Connection States

```
CONNECTING  -->  CONNECTED  -->  DISCONNECTED
                    |                  |
                    v                  v
               RECONNECTING  <--------+
```

| State           | Description                                                    |
|-----------------|----------------------------------------------------------------|
| `CONNECTING`    | Initial connection attempt in progress                         |
| `CONNECTED`     | Socket is connected and authenticated                          |
| `DISCONNECTED`  | Socket has been disconnected                                   |
| `RECONNECTING`  | Automatic reconnection attempt in progress                     |

### Connection Flow

1. **Handshake** - Client initiates connection with JWT token in `auth` parameter.
2. **Authentication** - Server validates the JWT token. Connection is rejected if the token is invalid, expired, revoked, or if the server is at capacity.
3. **Room Join** - On successful authentication, the socket automatically joins `user:{userId}`.
4. **Handler Registration** - Chat, presence, call, and meeting handlers are registered for the socket.
5. **Presence Update** - User is marked as `online` in Redis; `presence.changed` is broadcast.
6. **Active Session** - Socket handles events bidirectionally.
7. **Disconnect** - On disconnect, all channel memberships and typing indicators are cleaned up. If no other sockets remain for the user, their presence is set to `offline`.

### Heartbeat

The server uses Socket.IO's built-in ping/pong mechanism with the following configuration:

| Parameter          | Value    | Description                                   |
|--------------------|----------|-----------------------------------------------|
| `pingInterval`     | 25000ms  | Server sends a ping every 25 seconds          |
| `pingTimeout`      | 10000ms  | Client must respond within 10 seconds         |
| `connectTimeout`   | 10000ms  | Maximum time for initial connection            |
| `maxHttpBufferSize` | 1MB     | Maximum payload size per message               |

If the client fails to respond to a ping within the timeout, the server considers the connection dead and triggers a disconnect.

In addition to the engine-level heartbeat, the application supports an explicit `ping` event that clients can use for round-trip latency measurement.

---

## Reconnection Strategy

The recommended reconnection strategy uses exponential backoff with jitter:

```javascript
const socket = io("wss://ws.rajutechie-streamkit.io", {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,        // Start with 1s
  reconnectionDelayMax: 30000,    // Cap at 30s
  randomizationFactor: 0.5        // Add up to 50% jitter
});
```

### Backoff Schedule

| Attempt | Base Delay | With Jitter (0.5 factor) |
|---------|------------|--------------------------|
| 1       | 1s         | 0.5s - 1.5s             |
| 2       | 2s         | 1.0s - 3.0s             |
| 3       | 4s         | 2.0s - 6.0s             |
| 4       | 8s         | 4.0s - 12.0s            |
| 5       | 16s        | 8.0s - 24.0s            |
| 6+      | 30s (max)  | 15.0s - 30.0s           |

### Post-Reconnection Recovery

After reconnecting, the client should:

1. **Re-subscribe to channels** - Reissue `subscribe` events for all previously joined channels.
2. **Restore presence** - Send a `presence.update` to reset the user's status.
3. **Rejoin calls/meetings** - Reissue `call.join` or `meeting.join` if the user was in an active session.
4. **Fetch missed messages** - Use the REST API to retrieve messages that may have been sent during the disconnection period.

```javascript
socket.on("connect", () => {
  if (socket.recovered) {
    // Socket.IO managed recovery: state is intact
    console.log("Recovered from temporary disconnect");
  } else {
    // Full reconnection: re-subscribe to channels
    for (const channelId of subscribedChannels) {
      socket.emit("subscribe", { channelId });
    }
    // Restore presence
    socket.emit("presence.update", { status: "online" });
  }
});
```

---

## Error Handling

### Event Validation Errors

When the payload for a client-to-server event fails validation, the error is returned via the acknowledgement callback:

```json
{
  "error": "INVALID_PAYLOAD",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "channelId": ["Required"],
      "message.content": ["String must contain at least 1 character(s)"]
    }
  }
}
```

### Connection-Level Errors

| Error Code            | Description                                      | Recommended Action                    |
|-----------------------|--------------------------------------------------|---------------------------------------|
| `INVALID_TOKEN`       | JWT token is invalid, expired, or revoked        | Refresh token and reconnect           |
| `SERVER_AT_CAPACITY`  | Server has reached maximum connection limit       | Back off and retry with another instance |
| `TRANSPORT_ERROR`     | WebSocket transport failure                       | Automatic reconnection will handle    |

### Handling Disconnection Reasons

```javascript
socket.on("disconnect", (reason) => {
  switch (reason) {
    case "io server disconnect":
      // Server forcefully disconnected (e.g., token revoked)
      // Must manually reconnect: socket.connect()
      break;
    case "io client disconnect":
      // Client called socket.disconnect()
      break;
    case "ping timeout":
      // Server did not respond to heartbeat
      // Auto-reconnect will trigger
      break;
    case "transport close":
      // Connection was lost (network issue)
      // Auto-reconnect will trigger
      break;
    case "transport error":
      // Transport error occurred
      // Auto-reconnect will trigger
      break;
  }
});
```

> **Important:** When the server forcefully disconnects the socket (`io server disconnect`), automatic reconnection is disabled. The client must explicitly call `socket.connect()` after resolving the issue (e.g., obtaining a fresh token).
