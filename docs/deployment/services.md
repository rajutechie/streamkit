# Services Reference

RajutechieStreamKit is composed of 14 microservices, each responsible for a specific domain. This document describes each service, its responsibilities, configuration, and API.

---

## Table of Contents

- [Service Overview](#service-overview)
- [API Gateway](#api-gateway)
- [WebSocket Gateway](#websocket-gateway)
- [Auth Service](#auth-service)
- [User Service](#user-service)
- [Chat Service](#chat-service)
- [Call Service](#call-service)
- [Meeting Service](#meeting-service)
- [Stream Service](#stream-service)
- [Notification Service](#notification-service)
- [Presence Service](#presence-service)
- [Media Service](#media-service)
- [Analytics Service](#analytics-service)
- [Moderation Service](#moderation-service)
- [Signaling Server](#signaling-server)

---

## Service Overview

| Service | Port | Database | Description |
|---------|------|----------|-------------|
| API Gateway | 3000 | — | Request routing, rate limiting, auth |
| WebSocket Gateway | 3001 | Redis | Persistent client connections |
| Auth Service | 3010 | PostgreSQL | JWT tokens, API key management |
| User Service | 3011 | PostgreSQL | User profiles, devices |
| Chat Service | 3012 | PostgreSQL + MongoDB | Channels, messages |
| Call Service | 3013 | PostgreSQL + Redis | Call sessions |
| Meeting Service | 3014 | PostgreSQL + Redis | Meeting scheduling and management |
| Stream Service | 3015 | PostgreSQL + Redis | Live streaming |
| Notification Service | 3016 | PostgreSQL + Redis | Push notifications |
| Presence Service | 3017 | Redis | Online/offline status |
| Media Service | 3018 | MongoDB + S3 | File upload/storage |
| Analytics Service | 3019 | TimescaleDB | Usage metrics, billing |
| Moderation Service | 3020 | PostgreSQL + Redis | Content filtering |
| Signaling Server | 3030 | Redis | WebRTC signaling (mediasoup) |

---

## API Gateway

**Path:** `services/api-gateway/`

The API Gateway is the single entry point for all REST API requests. It handles routing, authentication, rate limiting, and CORS.

### Responsibilities
- Route requests to the correct microservice
- Validate API keys and JWT tokens
- Enforce rate limits per API key and per user
- CORS configuration
- Request/response logging

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `AUTH_SERVICE_URL` | `http://auth-service:3010` | Auth service endpoint |
| `USER_SERVICE_URL` | `http://user-service:3011` | User service endpoint |
| `CHAT_SERVICE_URL` | `http://chat-service:3012` | Chat service endpoint |
| `CALL_SERVICE_URL` | `http://call-service:3013` | Call service endpoint |
| `MEETING_SERVICE_URL` | `http://meeting-service:3014` | Meeting service endpoint |
| `STREAM_SERVICE_URL` | `http://stream-service:3015` | Stream service endpoint |
| `REDIS_URL` | `redis://localhost:6379` | Redis for rate limiting |
| `RATE_LIMIT_WINDOW` | `60000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |

### Health Endpoint
```
GET /health → { "status": "ok", "service": "api-gateway" }
```

---

## WebSocket Gateway

**Path:** `services/ws-gateway/`

Manages persistent WebSocket connections using Socket.IO with Redis adapter for multi-instance scaling.

### Responsibilities
- Maintain persistent client connections
- Route real-time events (messages, typing, presence)
- Connection lifecycle management (connect, disconnect, reconnect)
- Heartbeat and keepalive
- Cross-instance event distribution via Redis pub/sub

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `REDIS_URL` | `redis://localhost:6379` | Redis adapter URL |
| `JWT_SECRET` | — | Secret for token validation |
| `PING_INTERVAL` | `25000` | Heartbeat interval (ms) |
| `PING_TIMEOUT` | `20000` | Heartbeat timeout (ms) |
| `MAX_CONNECTIONS` | `50000` | Max connections per instance |

### Event Handlers

| Handler | Events | Description |
|---------|--------|-------------|
| `chat.handler` | `message.send`, `typing.start`, `typing.stop` | Chat message routing |
| `presence.handler` | `presence.update` | Online/offline status |
| `call.handler` | `call.signal` | WebRTC signaling relay |
| `meeting.handler` | `meeting.signal`, `hand.raise` | Meeting events |

---

## Auth Service

**Path:** `services/auth-service/`

Handles authentication, JWT token generation, and API key management.

### Responsibilities
- JWT token generation and validation
- API key creation and rotation
- OAuth2 provider
- Role-based access control (RBAC)
- Token blacklisting

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3010` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `JWT_SECRET` | — | JWT signing secret |
| `JWT_EXPIRY` | `1h` | Default token lifetime |
| `REDIS_URL` | `redis://localhost:6379` | Token blacklist store |

### Internal API

```
POST /token          → Generate JWT token
POST /token/verify   → Verify and decode token
POST /token/revoke   → Revoke (blacklist) a token
POST /api-keys       → Create API key
DELETE /api-keys/:id → Revoke API key
```

---

## User Service

**Path:** `services/user-service/`

Manages user profiles, device registration, and contact management.

### Responsibilities
- User CRUD operations
- Device registration for push notifications
- Contact/block list management
- User search

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3011` | Server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Kafka for event publishing |

### Kafka Events Published

- `user.created` — When a new user is registered
- `user.updated` — When a user profile is modified
- `user.deactivated` — When a user is deactivated

---

## Chat Service

**Path:** `services/chat-service/`

Manages channels, messages, reactions, read receipts, and threading.

### Responsibilities
- Channel CRUD (direct, group, community, open)
- Message send, edit, delete (soft)
- Reactions, threading, mentions
- Read receipts and unread counts
- Message search

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3012` | Server port |
| `DATABASE_URL` | — | PostgreSQL (channels, members) |
| `MONGODB_URI` | — | MongoDB (messages) |
| `REDIS_URL` | `redis://localhost:6379` | Unread counts, typing state |
| `KAFKA_BROKERS` | `localhost:9092` | Event bus |

### Kafka Events Published

- `message.new` — New message sent
- `message.updated` — Message edited
- `message.deleted` — Message soft-deleted
- `channel.created` — New channel created
- `channel.member.added` — Member added to channel

---

## Call Service

**Path:** `services/call-service/`

Manages call sessions, participant tracking, and recording triggers.

### Responsibilities
- Call session lifecycle (create, accept, reject, end)
- Participant tracking (join, leave, media state)
- Call recording management
- Call statistics collection

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3013` | Server port |
| `DATABASE_URL` | — | PostgreSQL (call records) |
| `REDIS_URL` | `redis://localhost:6379` | Active call state |
| `KAFKA_BROKERS` | `localhost:9092` | Event bus |
| `SIGNALING_URL` | `http://signaling-server:3030` | Signaling server |

---

## Meeting Service

**Path:** `services/meeting-service/`

Handles meeting scheduling, waiting rooms, host controls, breakout rooms, and polls.

### Responsibilities
- Meeting scheduling and management
- Waiting room queue
- Host controls (mute, remove, end)
- Breakout room creation
- Polls and raise hand
- Meeting code generation

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3014` | Server port |
| `DATABASE_URL` | — | PostgreSQL (meetings, polls) |
| `REDIS_URL` | `redis://localhost:6379` | Active meeting state |
| `KAFKA_BROKERS` | `localhost:9092` | Event bus |

---

## Stream Service

**Path:** `services/stream-service/`

Manages live stream lifecycle, HLS transcoding, and viewer tracking.

### Responsibilities
- Stream creation and lifecycle (idle, live, ended)
- Stream key generation
- HLS transcoding coordination
- Viewer count tracking (via Redis HyperLogLog)
- DVR (digital video recording) support

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3015` | Server port |
| `DATABASE_URL` | — | PostgreSQL (stream metadata) |
| `REDIS_URL` | `redis://localhost:6379` | Viewer counts, active streams |
| `KAFKA_BROKERS` | `localhost:9092` | Event bus |
| `S3_BUCKET` | — | HLS segment storage |

---

## Notification Service

**Path:** `services/notification-service/`

Sends push notifications via FCM (Android) and APNs (iOS), plus in-app notifications.

### Responsibilities
- Push notification delivery (FCM, APNs, Web Push)
- Notification preferences per user
- In-app notification queue
- Email notifications (optional)

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3016` | Server port |
| `DATABASE_URL` | — | PostgreSQL (preferences) |
| `REDIS_URL` | `redis://localhost:6379` | Delivery queue |
| `KAFKA_BROKERS` | `localhost:9092` | Event consumption |
| `FCM_SERVER_KEY` | — | Firebase Cloud Messaging key |
| `APNS_KEY_ID` | — | Apple Push key ID |
| `APNS_TEAM_ID` | — | Apple Developer Team ID |

### Kafka Events Consumed

- `message.new` — Send push for new messages
- `call.incoming` — Send push for incoming calls
- `meeting.started` — Send push for meeting start

---

## Presence Service

**Path:** `services/presence-service/`

Tracks user online/offline status and typing indicators. Uses Redis as its sole data store since all state is ephemeral.

### Responsibilities
- Online/offline status tracking
- Last seen timestamps
- Typing indicators
- Multi-device presence

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3017` | Server port |
| `REDIS_URL` | `redis://localhost:6379` | Sole data store |

### Redis Keys

```
presence:{app_id}:{user_id}  → HASH { status, last_seen, device }
presence:{app_id}:online     → SET of online user_ids
typing:{channel_id}          → HASH { user_id: timestamp } (TTL 5s)
```

---

## Media Service

**Path:** `services/media-service/`

Handles file uploads, thumbnail generation, and media transcoding.

### Responsibilities
- Presigned URL generation for direct S3 uploads
- Thumbnail generation (images via Sharp)
- Video/audio transcoding (via FFmpeg)
- Media metadata storage
- CDN URL generation

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3018` | Server port |
| `MONGODB_URI` | — | MongoDB (media metadata) |
| `S3_BUCKET` | — | Media storage bucket |
| `S3_REGION` | `us-east-1` | S3 region |
| `CDN_URL` | — | CloudFront/CDN base URL |
| `MAX_FILE_SIZE` | `104857600` | Max upload size (100 MB) |

---

## Analytics Service

**Path:** `services/analytics-service/`

Tracks usage metrics for billing and provides dashboard data.

### Responsibilities
- API call counting
- Video/audio minute tracking
- Storage usage metering
- Billing computation
- Usage dashboard data

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3019` | Server port |
| `DATABASE_URL` | — | PostgreSQL (billing, plans) |
| `TIMESCALE_URL` | — | TimescaleDB (time-series metrics) |
| `KAFKA_BROKERS` | `localhost:9092` | Event consumption |

---

## Moderation Service

**Path:** `services/moderation-service/`

Provides content filtering, user reporting, and ban management.

### Responsibilities
- Profanity and content filtering
- User report handling
- Ban and mute management
- Auto-moderation rules

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3020` | Server port |
| `DATABASE_URL` | — | PostgreSQL (rules, bans, reports) |
| `REDIS_URL` | `redis://localhost:6379` | Active filters cache |
| `KAFKA_BROKERS` | `localhost:9092` | Message inspection |

---

## Signaling Server

**Path:** `services/signaling-server/`

Handles WebRTC signaling using mediasoup as the SFU (Selective Forwarding Unit).

### Responsibilities
- SDP offer/answer exchange
- ICE candidate relay
- mediasoup worker management
- Transport creation and management
- Producer/consumer lifecycle
- Room management (calls, meetings, streams)

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3030` | Server port |
| `REDIS_URL` | `redis://localhost:6379` | Multi-server coordination |
| `MEDIASOUP_WORKERS` | CPU cores | Number of mediasoup workers |
| `MEDIASOUP_LOG_LEVEL` | `warn` | mediasoup log level |
| `RTC_MIN_PORT` | `40000` | WebRTC UDP port range start |
| `RTC_MAX_PORT` | `49999` | WebRTC UDP port range end |
| `ANNOUNCED_IP` | — | Public IP for WebRTC |

### Architecture

```
Client A ──WSS──► Signaling Server ◄──WSS── Client B
                       │
                  mediasoup Workers
                  ┌──────────────┐
                  │  Router (Room)│
                  │  ┌──────┐    │
                  │  │Prod A│────┼──► Consumer B
                  │  └──────┘    │
                  │  ┌──────┐    │
                  │  │Prod B│────┼──► Consumer A
                  │  └──────┘    │
                  └──────────────┘
```

Each mediasoup worker runs on a dedicated CPU core. Rooms are assigned to workers using round-robin allocation. Pipe transports enable cross-worker media routing when rooms span multiple workers.

### Ports

The signaling server requires a range of UDP ports for WebRTC media transport. Ensure `RTC_MIN_PORT` through `RTC_MAX_PORT` are open in your firewall and security groups.
