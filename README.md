# RajutechieStreamKit

> Self-hosted, open-source real-time communication infrastructure — chat, video calls, meetings, live streaming, presence, and push notifications in one platform.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20.0.0-green)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.0-orange)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)

---

## What is StreamKit?

StreamKit is a production-ready, self-hosted alternative to services like Twilio, Agora, and Stream. It ships as a monorepo of **14 Node.js microservices** backed by PostgreSQL, MongoDB, Redis, Kafka, and MinIO — with first-class SDKs for every major platform.

**You own the infrastructure. You own the data. No per-minute pricing.**

### Core capabilities

| Capability | Details |
|---|---|
| 💬 **Chat** | Real-time channels, threads, reactions, read receipts, file sharing |
| 📹 **Video Calls** | 1-on-1 and group calls via mediasoup WebRTC SFU, adaptive bitrate, screen sharing, recording |
| 🎙 **Meetings** | Scheduled meetings, participant management, raise-hand, mute controls, breakout rooms, polls |
| 📡 **Live Streaming** | HLS + RTMP ingest (OBS compatible), DVR, adaptive bitrate, viewer analytics |
| 🟢 **Presence** | Online / away / busy / DND status with Redis SETEX TTL |
| 🔔 **Push Notifications** | FCM (Android), APNS (iOS), Email (SMTP), in-app — with preference management |
| 🛡 **Moderation** | Auto-moderation rules, bans, content reports, admin audit trail |
| 📊 **Analytics** | MAU tracking, usage metrics, per-app billing plans |

---

## Architecture

```
                          ┌─────────────────────────────────────────────────┐
  Client Apps ──────────► │  API Gateway :3000   │  WS Gateway :3100        │
  (Web/Mobile)            │  (REST · JWT auth)   │  (Socket.io · Redis pub) │
                          └────────────┬────────────────────┬────────────────┘
                                       │  HTTP              │  WebSocket
           ┌───────────────────────────▼────────────────────▼────────────────┐
           │                      Core Services                               │
           │                                                                  │
           │  auth :3001    user :3002    chat :3003    call :3004            │
           │  meeting :3005  stream :3006  notify :3007  presence :3008       │
           │  media :3009   analytics :3010  moderation :3011                 │
           │                                                                  │
           │                  signaling-server :3012                          │
           │                  (mediasoup WebRTC SFU)                          │
           └──────────┬──────────────┬──────────────┬────────────────────────┘
                      │              │              │
              ┌───────▼───┐  ┌───────▼───┐  ┌──────▼──────┐
              │ PostgreSQL│  │  MongoDB  │  │    Redis    │
              │  (5432)   │  │  (27017)  │  │   (6379)    │
              └───────────┘  └───────────┘  └─────────────┘
              ┌───────────────────────────┐  ┌─────────────┐
              │      Apache Kafka         │  │    MinIO    │
              │  (event streaming :9092)  │  │ (S3 :9000)  │
              └───────────────────────────┘  └─────────────┘
```

---

## Repository Structure

```
streamkit/
├── services/               # 14 Node.js microservices
│   ├── api-gateway/        # REST entry point, JWT validation, reverse proxy
│   ├── ws-gateway/         # Socket.io real-time gateway (Redis-backed)
│   ├── auth-service/       # JWT issuance, OAuth, API key management
│   ├── user-service/       # User profiles, device registration
│   ├── chat-service/       # Channels, messages, reactions, Kafka events
│   ├── call-service/       # Call lifecycle, recording, Kafka events
│   ├── meeting-service/    # Scheduled meetings, breakout rooms, polls
│   ├── stream-service/     # Live streams, RTMP keys, HLS, Kafka events
│   ├── notification-service/ # FCM / APNS / SMTP, preference management
│   ├── presence-service/   # Online status via Redis SETEX TTL
│   ├── media-service/      # File uploads, S3/MinIO, presigned URLs
│   ├── analytics-service/  # MAU tracking, usage records, billing plans
│   ├── moderation-service/ # Bans, content rules, reports, auto-moderation
│   └── signaling-server/   # mediasoup WebRTC SFU — rooms, transports, producers
│
├── packages/               # npm packages (pnpm workspace)
│   ├── core/               # @rajutechie-streamkit/core — shared primitives
│   ├── js-sdk/             # @rajutechie-streamkit/js-sdk — browser SDK
│   ├── react-sdk/          # @rajutechie-streamkit/react-sdk — hooks + components
│   ├── angular-sdk/        # @rajutechie-streamkit/angular-sdk — Angular services
│   ├── react-native-sdk/   # @rajutechie-streamkit/react-native-sdk
│   ├── server-sdk/         # @rajutechie-streamkit/server-sdk — backend admin API
│   └── backend-adapters/
│       └── express/        # @rajutechie-streamkit/express — Express middleware + router
│
├── sdks/                   # Native SDKs
│   ├── ios/                # Swift Package (iOS 15+, macOS 13+)
│   ├── android/            # Kotlin + Gradle (minSdk 24)
│   └── flutter/            # Dart package (Flutter ≥3.16, Dart ≥3.2)
│
├── infrastructure/
│   ├── docker/             # docker-compose.yml + docker-compose.deps.yml
│   ├── k8s/                # Kubernetes manifests (base + overlays)
│   ├── helm/               # Helm chart
│   └── terraform/          # IaC for cloud deployment
│
└── docs/
    ├── index.html          # Marketing / landing page
    ├── user-manual.html    # End-user guide
    ├── integration-wiki.html # Full developer integration guide (23 sections)
    ├── api-reference/      # REST, WebSocket events, Webhooks
    ├── architecture/       # System design docs
    ├── sdk-guides/         # Per-SDK integration guides
    ├── deployment/         # Docker, K8s, Terraform, CI/CD guides
    └── examples/           # 4 complete example apps
        ├── react-django/
        ├── react-springboot/
        ├── flutter-django/
        └── flutter-springboot/
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 20, pnpm ≥ 9
- Docker & Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/rajutechie/streamkit.git
cd streamkit
pnpm install
```

### 2. Start infrastructure (database, cache, queue, storage)

```bash
pnpm docker:deps
# Starts: PostgreSQL · MongoDB · Redis · Kafka · MinIO
```

### 3. Configure environment

```bash
cp infrastructure/docker/.env.example .env
# Edit .env — set JWT_SECRET, SMTP credentials, FCM/APNS keys as needed
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start all services in development

```bash
pnpm dev
# All 14 services start with hot-reload via tsx watch
```

### Or run the full stack with Docker

```bash
pnpm docker:up
# Brings up all services + all infrastructure
```

Service endpoints after startup:

| Service | URL |
|---|---|
| REST API | `http://localhost:3000` |
| WebSocket Gateway | `ws://localhost:3100` |
| Signaling Server | `ws://localhost:3012` |
| MinIO Console | `http://localhost:9001` |

---

## Services

| Service | Port | Purpose |
|---|---|---|
| `api-gateway` | 3000 | HTTP entry point — JWT auth, rate limiting, reverse proxy |
| `ws-gateway` | 3100 | Socket.io WebSocket hub — Redis adapter for horizontal scaling |
| `auth-service` | 3001 | Token issuance, refresh, API key management (Prisma + PostgreSQL) |
| `user-service` | 3002 | User CRUD, device registration for push notifications |
| `chat-service` | 3003 | Channels, messages, reactions, read receipts, Kafka fan-out |
| `call-service` | 3004 | Call lifecycle (create / join / end), recording state |
| `meeting-service` | 3005 | Scheduled meetings, participant management, breakout rooms |
| `stream-service` | 3006 | Live stream CRUD, RTMP key rotation, HLS, KafkaJS producer |
| `notification-service` | 3007 | FCM + APNS + SMTP delivery, preference management |
| `presence-service` | 3008 | Online status via Redis `SETEX` — no polling needed |
| `media-service` | 3009 | Presigned S3/MinIO uploads, metadata tracking |
| `analytics-service` | 3010 | MAU records, usage metrics, app plan management |
| `moderation-service` | 3011 | Bans, content rules, auto-moderation, report resolution |
| `signaling-server` | 3012 | mediasoup SFU — rooms, WebRTC transports, producers, consumers |

---

## SDKs and Packages

### JavaScript / TypeScript

| Package | Description |
|---|---|
| `@rajutechie-streamkit/core` | Shared primitives, event emitter, typed models |
| `@rajutechie-streamkit/js-sdk` | Browser SDK — drop-in for any JS framework |
| `@rajutechie-streamkit/react-sdk` | React hooks (`useChat`, `useCall`, `usePresence`, `useMeeting`) + components |
| `@rajutechie-streamkit/angular-sdk` | Angular services with RxJS Observables |
| `@rajutechie-streamkit/react-native-sdk` | React Native with native WebRTC media |
| `@rajutechie-streamkit/server-sdk` | Backend admin SDK — token generation, API management |
| `@rajutechie-streamkit/express` | Express middleware + pre-built REST router |

### Native SDKs

| Platform | Language | Min Version | Distribution |
|---|---|---|---|
| **iOS** | Swift 5.9 | iOS 15 / macOS 13 | Swift Package Manager |
| **Android** | Kotlin | Android 7.0 (API 24) | AAR via local Maven / JitPack |
| **Flutter** | Dart 3.2 | Flutter 3.16 | pub.dev / path dependency |

---

## Client SDK Quick Examples

### React

```tsx
import { RajutechieStreamKitProvider, useChat, useCall } from '@rajutechie-streamkit/react-sdk';

function App() {
  return (
    <RajutechieStreamKitProvider apiKey="sk_live_..." userToken={token}>
      <ChatRoom />
    </RajutechieStreamKitProvider>
  );
}

function ChatRoom() {
  const { messages, sendMessage } = useChat('general');
  const { startCall } = useCall();
  // ...
}
```

### Flutter

```dart
final client = RajutechieStreamKitClient(
  apiKey: 'sk_live_...',
  baseUrl: 'https://your-domain.com',
);
await client.connect(userToken: token);

final call = await client.calls.startCall(
  targetUserId: 'user_456',
  type: CallType.video,
);
```

### Android (Kotlin)

```kotlin
val client = RajutechieStreamKitClient(
    context = this,
    apiKey = "sk_live_...",
    baseUrl = "https://your-domain.com"
)
client.connect(userToken = token)

lifecycleScope.launch {
    val call = client.calls.startCall(StartCallInput(targetUserId = "user_456"))
}
```

### Server-side (Node.js)

```typescript
import { RajutechieStreamKitServer } from '@rajutechie-streamkit/server-sdk';

const streamkit = new RajutechieStreamKitServer({
  apiKey: process.env.STREAMKIT_API_KEY,
  apiSecret: process.env.STREAMKIT_API_SECRET,
  baseUrl: 'https://your-domain.com',
});

// Generate a user token
const token = streamkit.generateToken({ userId: 'user_123', role: 'user' });

// Create a channel
await streamkit.chat.createChannel({ name: 'general', type: 'public' });

// Send a push notification
await streamkit.notifications.send({
  userId: 'user_456',
  title: 'New message',
  body: 'You have a new message in #general',
});
```

---

## Infrastructure

### Environment Variables

Copy `.env.example` and configure:

```bash
# Core
JWT_SECRET=your-secret-here
NODE_ENV=production

# Databases
POSTGRES_HOST=localhost
POSTGRES_DB=streamkit
POSTGRES_USER=streamkit
POSTGRES_PASSWORD=password
MONGODB_URI=mongodb://localhost:27017/streamkit
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092

# Storage (MinIO / S3)
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=streamkit-media

# Push Notifications
FCM_PROJECT_ID=your-firebase-project
FCM_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-apple-team-id
APNS_BUNDLE_ID=com.yourapp.bundle

# Email
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=password
SMTP_FROM=StreamKit <noreply@example.com>

# WebRTC (for production NAT traversal)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_SERVER_USERNAME=user
TURN_SERVER_CREDENTIAL=password
```

### Deployment options

| Method | Command | Best for |
|---|---|---|
| Docker (deps only) | `pnpm docker:deps` | Local development |
| Docker (full stack) | `pnpm docker:up` | Staging / demo |
| Kubernetes | `kubectl apply -k infrastructure/k8s/overlays/production` | Production |
| Helm | `helm install streamkit infrastructure/helm/streamkit` | Production (Helm) |
| Terraform | `cd infrastructure/terraform && terraform apply` | Cloud IaC |

---

## Development

### Monorepo commands

```bash
pnpm dev              # Start all services with hot-reload
pnpm build            # Build all packages and services
pnpm test             # Run all tests
pnpm lint             # ESLint across all packages
pnpm typecheck        # TypeScript type-check across all packages
pnpm format           # Prettier formatting
pnpm db:migrate       # Run Prisma migrations on all services
pnpm db:seed          # Seed databases with dev data
pnpm clean            # Remove all build artefacts and node_modules
```

### Build a single service

```bash
cd services/chat-service
pnpm dev       # hot-reload
pnpm build     # compile
pnpm start     # production
```

### Build native SDKs

**Android**

```bash
cd sdks/android
gradle clean build publish
# AAR → sdks/android/streamkit-sdk/build/outputs/aar/
# Maven → sdks/maven-local/
```

**Flutter**

```bash
cd sdks/flutter
flutter pub get
dart analyze .
flutter pub publish --dry-run   # validate before release
```

**iOS**

Open `sdks/ios/Package.swift` in Xcode, or resolve via Swift Package Manager:

```bash
cd sdks/ios
swift build
swift test
```

---

## Example Applications

Four fully working example apps live in `docs/examples/`:

| Example | Frontend | Backend | Features |
|---|---|---|---|
| `react-django` | React 18 + Vite + TypeScript | Python 3.12 + Django REST Framework | Auth, Chat, Calls, Meetings, Webhooks |
| `react-springboot` | React 18 + Vite + TypeScript | Java 17 + Spring Boot 3.2 | Auth, Chat, Calls, Meetings, Webhooks |
| `flutter-django` | Flutter 3 (Dart) | Python 3.12 + Django REST Framework | Auth, Chat, Calls, Meetings, Webhooks |
| `flutter-springboot` | Flutter 3 (Dart) | Java 17 + Spring Boot 3.2 | Auth, Chat, Calls, Meetings, Webhooks |

Each example is fully self-contained with its own README, `.env.example`, and run instructions.

---

## Documentation

| Document | Description |
|---|---|
| [Developer Integration Wiki](docs/integration-wiki.html) | 23-section guide covering every service, SDK, and integration pattern |
| [User Manual](docs/user-manual.html) | End-user guide for chat, calls, meetings, and streaming |
| [REST API Reference](docs/api-reference/rest-api.md) | Full REST endpoint reference |
| [WebSocket Events](docs/api-reference/websocket-events.md) | Real-time event payloads |
| [Webhooks](docs/api-reference/webhooks.md) | Webhook event schema and verification |
| [Architecture Overview](docs/architecture/overview.md) | System design and data flow |
| [Deployment Guide](docs/deployment/docker.md) | Docker, Kubernetes, Terraform |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 20, TypeScript 5, ESM |
| **HTTP** | Express.js 4 |
| **Real-time** | Socket.io 4 (WebSocket), mediasoup 3 (WebRTC SFU) |
| **Event streaming** | Apache Kafka 3.7 (KRaft, no Zookeeper) |
| **Databases** | PostgreSQL 16, MongoDB 7, Redis 7 |
| **ORM** | Prisma 5 |
| **Object storage** | MinIO (S3-compatible) |
| **Build system** | Turborepo 2, tsup, tsc |
| **Package manager** | pnpm 9 (workspace) |
| **Notifications** | Firebase Admin (FCM), node-apn (APNS), Nodemailer (SMTP) |
| **Frontend SDKs** | React 18, Angular 17, React Native 0.72 |
| **Native SDKs** | Swift 5.9 (SPM), Kotlin (Gradle KTS), Dart 3.2 (pub.dev) |
| **Infrastructure** | Docker, Kubernetes, Helm, Terraform |

---

## License

[MIT](LICENSE) © 2026 Rajutechie

---

*Built with ❤️ for developers who want real-time communication without vendor lock-in.*
