# RajutechieStreamKit System Architecture Overview

## Introduction

RajutechieStreamKit is a production-grade, cloud-native Real-Time Communication (RTC) platform designed to compete with industry leaders such as Twilio, Agora, SendBird, Stream, and Zoom SDK. It provides a unified SDK and backend infrastructure for building chat, voice/video calls, meetings, and live streaming into any application.

RajutechieStreamKit is built as a polyglot monorepo with a microservices backend, multi-platform client SDKs, and an event-driven architecture that supports horizontal scaling to millions of concurrent users. The platform is designed for white-labeling, on-premise deployment, and multi-region availability.

### Core Capabilities

- **Chat**: 1:1, group, community, and open channels with threads, reactions, read receipts, typing indicators, and rich media attachments.
- **Voice/Video Calls**: 1:1 and group calls with recording, screen sharing, and real-time quality metrics.
- **Meetings**: Scheduled and instant meetings with waiting rooms, breakout rooms, polls, hand raising, and recording.
- **Live Streaming**: Low-latency live streams with HLS transcoding, CDN delivery, and real-time viewer counts.

### SDK Platforms

| Platform | Package | Language |
|----------|---------|----------|
| JavaScript (Browser) | `@rajutechie-streamkit/js-sdk` | TypeScript |
| React | `@rajutechie-streamkit/react-sdk` | TypeScript/TSX |
| React Native | `@rajutechie-streamkit/react-native-sdk` | TypeScript/TSX |
| Angular | `@rajutechie-streamkit/angular-sdk` | TypeScript |
| Android | `com.rajutechie.streamkit:rajutechie-streamkit-sdk` | Kotlin |
| iOS | `RajutechieStreamKit` (SPM) | Swift |
| Flutter | `rajutechie-streamkit` (pub.dev) | Dart |
| Server-side | `@rajutechie-streamkit/server-sdk` | TypeScript |

---

## Architecture Diagram

```
                          ┌─────────────────────────────────────────────────┐
                          │              CLIENT APPLICATIONS                │
                          │                                                 │
                          │  ┌─────────┐ ┌───────┐ ┌──────┐ ┌───────────┐ │
                          │  │   Web   │ │ React │ │React │ │  Angular  │ │
                          │  │  JS SDK │ │  SDK  │ │Native│ │    SDK    │ │
                          │  └────┬────┘ └───┬───┘ └──┬───┘ └─────┬─────┘ │
                          │       │          │        │            │       │
                          │  ┌────┴────┐ ┌───┴───┐ ┌──┴────────┐          │
                          │  │ Android │ │  iOS  │ │  Flutter  │          │
                          │  │   SDK   │ │  SDK  │ │    SDK    │          │
                          │  └────┬────┘ └───┬───┘ └──┬────────┘          │
                          └───────┼──────────┼────────┼───────────────────┘
                                  │          │        │
                          ┌───────▼──────────▼────────▼───────────────────┐
                          │          LOAD BALANCER / API GATEWAY          │
                          │         (nginx / AWS ALB / Kubernetes)        │
                          └──────┬──────────────┬────────────────┬───────┘
                                 │              │                │
                   ┌─────────────▼──┐   ┌───────▼──────┐  ┌─────▼──────────────┐
                   │  REST API GW   │   │  WebSocket   │  │  Signaling Server  │
                   │  (Express)     │   │   Gateway    │  │  (mediasoup/WS)    │
                   │  Port 3000     │   │ (Socket.IO)  │  │  Port 3030         │
                   │                │   │  Port 3001   │  │                    │
                   └───────┬────────┘   └──────┬───────┘  └────────┬───────────┘
                           │                   │                   │
         ┌─────────────────┼───────────────────┼───────────────────┤
         │                 │                   │                   │
         │    MICROSERVICES LAYER              │                   │
         │    ─────────────────────            │        ┌──────────▼──────────┐
         │                 │                   │        │   mediasoup SFU     │
         │  ┌──────────────▼──────────────┐    │        │   Workers           │
         │  │                             │    │        │   (Audio/Video)     │
         │  │  ┌──────────┐ ┌──────────┐  │    │        │   Ports 40000-49999 │
         │  │  │  Auth    │ │  User    │  │    │        └─────────────────────┘
         │  │  │  :3010   │ │  :3011   │  │    │
         │  │  ├──────────┤ ├──────────┤  │    │        ┌─────────────────────┐
         │  │  │  Chat    │ │  Call    │  │    │        │   TURN / STUN       │
         │  │  │  :3012   │ │  :3013   │  │    │        │   Servers           │
         │  │  ├──────────┤ ├──────────┤  │    │        │   (coturn)          │
         │  │  │ Meeting  │ │ Stream   │  │    │        └─────────────────────┘
         │  │  │  :3014   │ │  :3015   │  │    │
         │  │  ├──────────┤ ├──────────┤  │    │
         │  │  │ Notif.   │ │Presence  │  │    │
         │  │  │  :3016   │ │  :3017   │  │    │
         │  │  ├──────────┤ ├──────────┤  │    │
         │  │  │  Media   │ │Analytics │  │    │
         │  │  │  :3018   │ │  :3019   │  │    │
         │  │  ├──────────┤ ├──────────┤  │    │
         │  │  │ Moder.   │ │          │  │    │
         │  │  │  :3020   │ │          │  │    │
         │  │  └──────────┘ └──────────┘  │    │
         │  └─────────────────────────────┘    │
         │                                     │
         │  ┌──────────────────────────────────┤
         │  │     EVENT BUS                    │
         │  │  ┌───────────────────────────┐   │
         │  │  │   Apache Kafka (KRaft)    │◄──┘
         │  │  │   Topics: chat.messages,  │
         │  │  │   calls.events, meetings, │
         │  │  │   presence, analytics,    │
         │  │  │   notifications           │
         │  │  └───────────────────────────┘
         │  │
         │  │     DATA LAYER
         │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐
         │  │  │PostgreSQL│ │ MongoDB  │ │  Redis   │
         │  │  │  16      │ │  7       │ │  7       │
         │  │  │          │ │          │ │          │
         │  │  │ Users    │ │ Messages │ │ Presence │
         │  │  │ Auth     │ │ Media    │ │ Sessions │
         │  │  │ Meetings │ │ Logs     │ │ Pub/Sub  │
         │  │  │ Calls    │ │          │ │ Rate Lim │
         │  │  │ Billing  │ │          │ │ Cache    │
         │  │  └──────────┘ └──────────┘ └──────────┘
         │  │
         │  │  ┌──────────┐ ┌──────────────────────┐
         │  │  │ MinIO/S3 │ │   TimescaleDB        │
         │  │  │          │ │   (Analytics/Metrics) │
         │  │  │ Media    │ │                       │
         │  │  │ Records  │ │   Call quality,       │
         │  │  │ HLS Segs │ │   Usage billing,      │
         │  │  └──────────┘ │   Event aggregations  │
         │  │               └──────────────────────┘
         │  │
         └──┘
```

---

## Design Principles

### 1. Separation of Signaling from Media

RajutechieStreamKit strictly separates signaling (control plane) from media (data plane). The Signaling Server handles room management, SDP negotiation, and ICE candidate exchange over WebSocket, while mediasoup SFU workers handle the actual audio/video RTP packet forwarding. This separation allows each plane to scale independently --- you can add more signaling capacity without affecting media routing and vice versa.

### 2. SFU (Selective Forwarding Unit) Architecture via mediasoup

Rather than using an MCU (Multipoint Control Unit) that decodes and re-encodes media, RajutechieStreamKit uses mediasoup as an SFU. The SFU receives media streams from producers and selectively forwards them to consumers without transcoding. This provides:

- **Lower latency**: No encode/decode cycle on the server.
- **Lower CPU usage**: The server is a packet router, not a transcoder.
- **Simulcast/SVC support**: Clients send multiple quality layers; the SFU picks the best layer for each consumer based on their bandwidth.
- **Scalability**: Each mediasoup worker handles up to 500 consumers and workers are allocated across CPU cores via round-robin.

### 3. Event-Driven Microservices via Kafka

All inter-service communication beyond synchronous REST calls flows through Apache Kafka (running in KRaft mode, no ZooKeeper). Kafka topics include `chat.messages`, `calls.events`, `meetings.events`, `presence.updates`, `analytics.events`, and `notifications.outbound`. This architecture provides:

- **Loose coupling**: Services publish events without knowing who consumes them.
- **Replay capability**: Kafka retains events for 7 days (168 hours), enabling new consumers to backfill.
- **Guaranteed delivery**: At-least-once semantics with consumer group offsets.
- **Horizontal scaling**: Topics are partitioned (default 3 partitions) for parallel consumption.

### 4. Multi-Region Deployment Support

The infrastructure layer provides Terraform modules for VPC, EKS, RDS, Redis (ElastiCache), Kafka (MSK), S3, and monitoring across `dev`, `staging`, and `production` environments. Kubernetes manifests use Helm charts with environment-specific overlays. mediasoup workers bind to announced IPs for NAT traversal across regions.

### 5. White-Labeling and On-Premise Deployment

RajutechieStreamKit is multi-tenant by design. Every entity (users, channels, calls, meetings, streams) is scoped to an `appId`. The platform supports:

- **Cloud-hosted multi-tenant**: Shared infrastructure, isolated by `appId`.
- **Dedicated cloud**: Isolated Kubernetes namespace per customer.
- **On-premise**: Full Docker Compose or Helm deployment behind the customer's firewall.

---

## Component Overview

### 1. API Gateway

| Property | Value |
|----------|-------|
| Package | `@rajutechie-streamkit/api-gateway` |
| Port | 3000 |
| Framework | Express 4 + `http-proxy-middleware` |
| Auth | JWT verification via `jsonwebtoken` |
| Rate Limiting | Redis-backed sliding window (`ZRANGEBYSCORE`) |
| Security | Helmet, CORS, compression, 10MB body limit |

The API Gateway is the single entry point for all REST API traffic. It authenticates incoming requests, applies rate limiting, and proxies them to the appropriate downstream microservice. Routes are mapped under `/v1/*`:

- `/v1/auth` --> Auth Service
- `/v1/users` --> User Service
- `/v1/channels` --> Chat Service
- `/v1/calls` --> Call Service
- `/v1/meetings` --> Meeting Service
- `/v1/streams` --> Stream Service
- `/v1/media` --> Media Service
- `/v1/presence` --> Presence Service
- `/v1/analytics`, `/v1/billing` --> Analytics Service
- `/v1/moderation` --> Moderation Service
- `/v1/notifications`, `/v1/webhooks` --> Notification Service

### 2. WebSocket Gateway

| Property | Value |
|----------|-------|
| Package | `@rajutechie-streamkit/ws-gateway` |
| Port | 3001 |
| Framework | Socket.IO 4 with `@socket.io/redis-adapter` |
| Event Bus | KafkaJS producer |
| Max Connections | 50,000 per instance (configurable) |
| Heartbeat | Configurable interval (default 25s) |

The WebSocket Gateway manages all persistent real-time connections. It uses the Socket.IO Redis adapter for multi-instance horizontal scaling --- any instance can emit to any connected client. Domain-specific handlers are registered per socket:

- `registerChatHandler` -- message delivery, typing indicators, read receipts
- `registerPresenceHandler` -- online/offline status, cross-instance pub/sub
- `registerCallHandler` -- call signaling relay, participant tracking
- `registerMeetingHandler` -- meeting events, polls, hand raises

### 3. Auth Service

| Property | Value |
|----------|-------|
| Port | 3010 |
| Auth Methods | JWT (HS256/RS256), OAuth2 (Google, GitHub, Apple) |
| Token Lifecycle | Access token (15min) + Refresh token (7d) |
| Database | PostgreSQL (`oauth_clients`, `refresh_tokens`) |

Handles user authentication, token issuance, token refresh, and OAuth2 flows. Server-side SDKs use the Auth Service to generate user tokens for client-side SDK initialization.

### 4. User Service

| Property | Value |
|----------|-------|
| Port | 3011 |
| Database | PostgreSQL (`users`, `user_devices`) |
| Responsibilities | Profile CRUD, device registration, push token management |

Manages user profiles scoped by `appId`, device registration for push notifications (FCM/APNs/Web Push), and user metadata. Each user has an `externalId` that maps to the customer's own user identifier.

### 5. Chat Service

| Property | Value |
|----------|-------|
| Port | 3012 |
| Database | MongoDB (`messages` collection), PostgreSQL (`channels`, `channel_members`) |
| Event Bus | Kafka (`chat.messages`, `chat.channels`) |
| Features | Channels (direct/group/community/open), threads, reactions, read receipts, search |

The Chat Service handles channel lifecycle (create, update, freeze, delete), member management (roles: owner/admin/moderator/member, mute/ban with expiry), and message persistence. Messages support text, image, video, file, and voice types with attachments, threading, reactions, and mentions.

### 6. Call Service

| Property | Value |
|----------|-------|
| Port | 3013 |
| Database | PostgreSQL (`calls`, `call_participants`) |
| Features | 1:1 and group calls, recording, screen sharing, quality metrics |

Tracks call sessions, participant state (invited/ringing/connected/left), recording status (none/recording/processing/ready), and call statistics (bitrate, packet loss, jitter, resolution, frame rate). Works in conjunction with the Signaling Server for WebRTC negotiation.

### 7. Meeting Service

| Property | Value |
|----------|-------|
| Port | 3014 |
| Database | PostgreSQL (`meetings`, `meeting_participants`, `meeting_polls`) |
| Features | Scheduling, waiting rooms, breakout rooms, polls, hand raise, recording |

Manages meeting lifecycle with rich settings: waiting room, screen share permissions, mute-on-join, auto-recording, max participants, breakout rooms, chat, hand raise, and polls. Meetings have unique meeting codes and optional passwords.

### 8. Stream Service

| Property | Value |
|----------|-------|
| Port | 3015 |
| Transcoding | FFmpeg (RTP to HLS) |
| Storage | MinIO/S3 (HLS segments) |
| Features | Live streaming, HLS delivery, viewer counts via Redis HyperLogLog |

Handles live stream creation, HLS transcoding pipeline, CDN URL generation, and viewer analytics. Viewer counts use Redis HyperLogLog for memory-efficient approximate counting of unique viewers.

### 9. Notification Service

| Property | Value |
|----------|-------|
| Port | 3016 |
| Providers | FCM (Android), APNs (iOS), Web Push, Email (SMTP/SES) |
| Features | Push notifications, webhook delivery, email notifications |

Delivers notifications across channels. Webhook events are signed with HMAC-SHA256 for verification. Supports per-user notification preferences and quiet hours.

### 10. Presence Service

| Property | Value |
|----------|-------|
| Port | 3017 |
| Database | Redis (primary store with TTL) |
| TTL | 300 seconds (configurable via `PRESENCE_TTL_SECONDS`) |
| Features | Online/away/DND/offline status, bulk queries (up to 100), device tracking |

Manages real-time user presence. Status updates are stored in Redis with TTL-based expiry. Expired entries automatically resolve to `offline`. The service exposes REST endpoints for single and bulk presence queries, and real-time updates flow through Redis Pub/Sub via the WebSocket Gateway.

### 11. Media Service

| Property | Value |
|----------|-------|
| Port | 3018 |
| Storage | MinIO/S3 (`media`, `recordings`, `thumbnails` buckets) |
| Features | Upload, download, thumbnail generation, signed URLs |

Handles file uploads, thumbnail generation, and signed URL generation for secure media access. Supports image, video, file, and voice attachments with MIME type validation and size limits.

### 12. Analytics Service

| Property | Value |
|----------|-------|
| Port | 3019 |
| Database | TimescaleDB (time-series metrics), PostgreSQL (`billing_plans`, `usage_records`) |
| Features | Usage metrics, billing, call quality analytics, message volume |

Collects and aggregates platform metrics: message counts, call minutes, active users, media storage, and bandwidth. Powers the billing system with plan-based usage tracking.

### 13. Moderation Service

| Property | Value |
|----------|-------|
| Port | 3020 |
| Database | MongoDB (moderation logs), PostgreSQL (ban records) |
| Features | Content filtering, user bans, message flagging, automated moderation |

Provides content moderation capabilities including keyword filtering, spam detection, user muting/banning with expiry, and message flagging for human review.

### 14. Signaling Server

| Property | Value |
|----------|-------|
| Port | 3030 |
| Protocol | Raw WebSocket (`ws`) with JWT authentication |
| Media Engine | mediasoup (SFU) |
| RTC Ports | 40000--49999 (UDP/TCP) |
| Codecs | Opus (audio), VP8, VP9, H.264 (video) |
| STUN | `stun:stun.l.google.com:19302` (configurable) |

The Signaling Server is the WebRTC control plane. It manages rooms (call/meeting/stream), mediasoup router creation, WebRTC transport negotiation, producer/consumer lifecycle, and peer-to-peer signaling relay. Workers are allocated round-robin across CPU cores, and each router maps to a single room.

---

## Data Flow

### High-Level Request Flow

```
1. Client SDK initializes with API key + user token
   │
2. REST requests → API Gateway (:3000) → Auth middleware → Rate limiter → Proxy to service
   │
3. Real-time connection → WebSocket Gateway (:3001) → JWT auth → Socket.IO room join
   │
4. Media calls → Signaling Server (:3030) → JWT auth → Room join → Router creation
   │
5. WebRTC negotiation → Transport creation → ICE/DTLS → Produce/Consume
   │
6. Media packets → mediasoup SFU workers → Selective forwarding → Consumer clients
   │
7. Events → Kafka topics → Consumer services → Side effects (notifications, analytics)
   │
8. Real-time state → Redis (presence, typing, sessions) → Pub/Sub → All WS instances
```

### Detailed Data Flow

1. **Client Initialization**: The client SDK connects to the REST API Gateway (`POST /v1/auth/token`) to exchange credentials for a JWT. The `TokenManager` in the core SDK handles automatic refresh at 80% of token lifetime.

2. **WebSocket Connection**: The client opens a Socket.IO connection to the WebSocket Gateway. The auth middleware extracts the JWT from the handshake, verifies it, and attaches user metadata to `socket.data.user`. The socket joins a user-specific room (`user:{userId}`) for targeted messaging.

3. **Service Routing**: REST requests hit the API Gateway, which authenticates, rate-limits, and proxies to the target microservice. WebSocket events are handled by domain-specific handlers registered on the socket.

4. **Signaling Negotiation**: For calls/meetings/streams, the client opens a separate raw WebSocket to the Signaling Server with `?token=<jwt>`. The server creates a mediasoup Router (one per room), and the client negotiates send/receive transports.

5. **Media Routing**: Once transports are connected via DTLS, the client produces audio/video tracks. The SFU creates consumers for each other participant, forwarding RTP packets without transcoding.

6. **Event Propagation**: State changes (new message, call ended, presence update) are published to Kafka topics. Downstream consumers process these events for persistence, notifications, and analytics.

7. **Real-Time State**: Ephemeral state (presence, typing indicators, active sessions) is stored in Redis with TTL. Cross-instance synchronization uses Redis Pub/Sub through the Socket.IO Redis adapter.

---

## Scalability Strategy

| Component | Target Per Instance | Scaling Trigger | Strategy |
|-----------|-------------------|-----------------|----------|
| WS Gateway | 50,000 connections | 80% connection capacity | Horizontal pod autoscaling; Redis adapter ensures any instance can reach any client |
| API Gateway | 10,000 RPS | CPU > 70% or p99 latency > 200ms | Horizontal scaling behind load balancer; stateless design |
| Chat Service | 5,000 messages/sec | Kafka consumer lag > 10,000 | Horizontal scaling with Kafka consumer groups; MongoDB sharding on `channelId` |
| Signaling Server | 5,000 rooms | Memory > 80% or CPU > 70% | Horizontal scaling; rooms are pinned to instances via consistent hashing |
| mediasoup Worker | 500 consumers | CPU core saturation | Vertical (more cores) + horizontal (more instances); workers are CPU-bound |
| Presence Service | 100,000 users | Redis memory > 70% | Redis Cluster for sharding; service instances are stateless |
| Kafka | 100,000 messages/sec | Partition lag > threshold | Add partitions + brokers; KRaft mode simplifies operations |
| PostgreSQL | N/A | Connection pool exhaustion | Read replicas for queries; connection pooling via PgBouncer |
| MongoDB | N/A | Write throughput saturation | Shard on `channelId` for messages; replica set for reads |
| Redis | N/A | Memory > 80% | Redis Cluster; `allkeys-lru` eviction policy; 256MB default |

### Auto-Scaling Rules (Kubernetes HPA)

```yaml
# Example HPA for ws-gateway
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ws-gateway
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ws-gateway
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Pods
      pods:
        metric:
          name: socketio_connections
        target:
          type: AverageValue
          averageValue: "40000"    # Scale at 80% of 50K capacity
```

---

## Security Architecture

### Authentication Flow

```
┌──────────┐          ┌──────────────┐          ┌──────────────┐
│  Client  │          │  API Gateway │          │ Auth Service │
│   SDK    │          │   (:3000)    │          │   (:3010)    │
└────┬─────┘          └──────┬───────┘          └──────┬───────┘
     │                       │                         │
     │  1. POST /v1/auth/token                         │
     │  { apiKey, userId }   │                         │
     │──────────────────────>│  2. Proxy to auth       │
     │                       │────────────────────────>│
     │                       │                         │
     │                       │  3. Verify API key,     │
     │                       │     generate JWT        │
     │                       │<────────────────────────│
     │  4. { accessToken,    │                         │
     │       refreshToken,   │                         │
     │       expiresIn }     │                         │
     │<──────────────────────│                         │
     │                       │                         │
     │  5. All subsequent requests include             │
     │     Authorization: Bearer <accessToken>         │
     │──────────────────────>│  6. JWT verification    │
     │                       │     in auth middleware   │
```

### Transport Security

| Layer | Protocol | Purpose |
|-------|----------|---------|
| HTTP | TLS 1.3 | All REST API traffic is encrypted via HTTPS |
| WebSocket | WSS (TLS) | All Socket.IO connections use secure WebSocket |
| WebRTC Signaling | WSS (TLS) | Signaling Server WebSocket is TLS-encrypted |
| WebRTC Media | DTLS 1.2 | Key exchange for SRTP media encryption |
| WebRTC Media | SRTP | All audio/video RTP packets are encrypted |
| NAT Traversal | TURN/TLS | TURN relay traffic is encrypted when using TLS |

### End-to-End Encryption (Optional)

RajutechieStreamKit supports optional end-to-end encryption for calls and meetings via the **WebRTC Insertable Streams API** (also known as Encoded Transform). When enabled:

1. The sender encrypts each video/audio frame before it enters the SFU.
2. The SFU forwards the encrypted frame without being able to read its contents.
3. The receiver decrypts the frame after it exits the SFU.
4. Key exchange happens out-of-band via the application's own key management.

This ensures that even RajutechieStreamKit's own servers cannot access the media content.

### Rate Limiting

RajutechieStreamKit implements a 3-tier rate limiting strategy using a Redis-backed sliding window algorithm:

| Tier | Scope | Window | Max Requests | Purpose |
|------|-------|--------|-------------|---------|
| Global | Per IP | 60 seconds | 1,000 | DDoS protection |
| Application | Per API key | 60 seconds | 100 | Fair usage across tenants |
| Endpoint | Per user + endpoint | 60 seconds | 30 | Abuse prevention per resource |

Rate limit headers are included in every response:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1707825600
Retry-After: 42          (only on 429 responses)
```

The rate limiter key pattern is `ratelimit:{identifier}:{endpoint}`, stored as a Redis sorted set with timestamps as scores. On each request, entries outside the sliding window are pruned via `ZREMRANGEBYSCORE`, the current count is checked via `ZCARD`, and the new request is added via `ZADD`. Keys auto-expire via `PEXPIRE`.

### Webhook Security

Outbound webhooks are signed using HMAC-SHA256:

```
X-RajutechieStreamKit-Signature: sha256=<hex-digest>
X-RajutechieStreamKit-Timestamp: 1707825600
```

The signature is computed as:

```
HMAC-SHA256(webhook_secret, timestamp + "." + JSON.stringify(body))
```

Receivers should verify the signature and reject requests where the timestamp is older than 5 minutes to prevent replay attacks.

---

## Technology Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | >= 20.0.0 |
| Language | TypeScript | 5.7+ |
| Package Manager | pnpm | 9.15+ |
| Monorepo Tool | Turborepo | 2.3+ |
| HTTP Framework | Express | 4.21+ |
| WebSocket | Socket.IO | 4.7+ |
| WebRTC SFU | mediasoup | 3.x |
| Database (Relational) | PostgreSQL | 16 |
| Database (Document) | MongoDB | 7 |
| Cache/Pub-Sub | Redis | 7 |
| Event Streaming | Apache Kafka (KRaft) | 3.7 |
| Object Storage | MinIO / AWS S3 | Latest |
| Validation | Zod | 3.23+ |
| Auth | JSON Web Tokens | RS256/HS256 |
| Container Runtime | Docker | Latest |
| Orchestration | Kubernetes (EKS) | 1.28+ |
| IaC | Terraform | 1.x |
| CI/CD | GitHub Actions | N/A |

---

## Deployment Topology

### Development

```
pnpm docker:deps     # Start PostgreSQL, MongoDB, Redis, Kafka, MinIO
pnpm dev              # Start all services in watch mode via Turborepo
```

### Staging / Production (Kubernetes)

```
infrastructure/
├── k8s/
│   ├── base/services/          # Base Kubernetes manifests
│   └── overlays/
│       ├── development/        # Dev overrides (single replica)
│       ├── staging/            # Staging overrides
│       └── production/         # Production overrides (multi-replica, HPA)
├── helm/rajutechie-streamkit/templates/   # Helm chart templates
├── terraform/
│   ├── modules/                # VPC, EKS, RDS, Redis, Kafka, S3, Monitoring
│   └── environments/           # dev, staging, production tfvars
└── docker/
    ├── docker-compose.yml      # Full stack for local testing
    └── docker-compose.deps.yml # Infrastructure dependencies only
```

### Port Assignments

| Service | Port | Protocol |
|---------|------|----------|
| API Gateway | 3000 | HTTP |
| WebSocket Gateway | 3001 | HTTP + WebSocket |
| Auth Service | 3010 | HTTP |
| User Service | 3011 | HTTP |
| Chat Service | 3012 | HTTP |
| Call Service | 3013 | HTTP |
| Meeting Service | 3014 | HTTP |
| Stream Service | 3015 | HTTP |
| Notification Service | 3016 | HTTP |
| Presence Service | 3017 | HTTP |
| Media Service | 3018 | HTTP |
| Analytics Service | 3019 | HTTP |
| Moderation Service | 3020 | HTTP |
| Signaling Server | 3030 | HTTP + WebSocket |
| PostgreSQL | 5432 | TCP |
| MongoDB | 27017 | TCP |
| Redis | 6379 | TCP |
| Kafka | 9092 | TCP |
| MinIO API | 9000 | HTTP |
| MinIO Console | 9001 | HTTP |
| mediasoup RTC | 40000--49999 | UDP/TCP |
