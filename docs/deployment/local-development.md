# RajutechieStreamKit -- Local Development Guide

This guide walks you through setting up a complete RajutechieStreamKit development environment on your local machine. By the end, you will have all 14 microservices running alongside the infrastructure dependencies they require.

---

## Prerequisites

Before you begin, make sure the following tools are installed and available on your `PATH`:

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| **Node.js** | 20.0.0+ | [nodejs.org](https://nodejs.org) or via `nvm` |
| **pnpm** | 9.0.0+ | `corepack enable && corepack prepare pnpm@9 --activate` |
| **Docker** | 24.0+ | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2 (plugin) | Ships with Docker Desktop; Linux users see [compose install](https://docs.docker.com/compose/install/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com) |

Verify each tool:

```bash
node -v          # v20.x.x or higher
pnpm -v          # 9.x.x or higher
docker --version # Docker version 24.x or higher
docker compose version  # Docker Compose version v2.x.x
git --version    # git version 2.30+
```

---

## Quick Start

The fastest way to get up and running is the automated setup script. It checks prerequisites, installs dependencies, starts infrastructure containers, runs migrations, and seeds sample data in a single command:

```bash
git clone https://github.com/rajutechie-streamkit/rajutechie-streamkit.git
cd rajutechie-streamkit
./tools/scripts/setup-dev.sh
```

Once the script finishes, start all services in development mode:

```bash
pnpm dev
```

The API gateway will be available at `http://localhost:3000` and the WebSocket gateway at `ws://localhost:3100`.

---

## Manual Setup

If you prefer to set things up step by step, or if the setup script encounters issues, follow these instructions.

### Step 1: Clone the Repository

```bash
git clone https://github.com/rajutechie-streamkit/rajutechie-streamkit.git
cd rajutechie-streamkit
```

### Step 2: Install Dependencies

RajutechieStreamKit is a pnpm monorepo managed by Turborepo. Install all workspace dependencies:

```bash
pnpm install
```

This installs dependencies for every package and service in the workspace. The `pnpm-workspace.yaml` file defines the workspace topology.

### Step 3: Configure Environment Variables

If a `.env` file does not already exist in the project root, create one:

```bash
cp infrastructure/docker/.env.example .env
```

If no `.env.example` exists, the `setup-dev.sh` script generates a minimal `.env` automatically. See the [Environment Variables](#environment-variables) section below for all supported variables.

### Step 4: Start Infrastructure Dependencies

RajutechieStreamKit's microservices depend on PostgreSQL, MongoDB, Redis, Kafka, and MinIO. Start them with the infrastructure-only compose file:

```bash
docker compose -f infrastructure/docker/docker-compose.deps.yml up -d
```

Or use the shortcut defined in `package.json`:

```bash
pnpm docker:deps
```

### Step 5: Wait for Services to Become Healthy

All infrastructure containers have health checks configured. Wait until every container reports as healthy before proceeding:

```bash
docker compose -f infrastructure/docker/docker-compose.deps.yml ps
```

Expected output shows `healthy` in the STATUS column for all services. Typical startup times:

| Container | Expected Ready Time |
|-----------|-------------------|
| `rajutechie-streamkit-redis` | ~10 seconds |
| `rajutechie-streamkit-postgres` | ~15 seconds |
| `rajutechie-streamkit-minio` | ~15 seconds |
| `rajutechie-streamkit-mongodb` | ~20 seconds |
| `rajutechie-streamkit-kafka` | ~45-60 seconds |

Kafka takes the longest to start because it initializes the KRaft controller and creates default topics.

### Step 6: Run Database Migrations

```bash
pnpm db:migrate
```

This uses Turborepo to run the `db:migrate` script across all services that define one.

### Step 7: Start All Services in Development Mode

```bash
pnpm dev
```

Turborepo launches all services concurrently. Each service watches for file changes and restarts automatically.

---

## Infrastructure Services

The `docker-compose.deps.yml` file starts the following infrastructure:

| Service | Image | Port | Default Credentials | Used By |
|---------|-------|------|-------------------|---------|
| **PostgreSQL 16** | `postgres:16-alpine` | 5432 | `rajutechie-streamkit` / `rajutechie-streamkit_secret` | auth, user, meeting, analytics, media |
| **MongoDB 7** | `mongo:7` | 27017 | `rajutechie-streamkit` / `rajutechie-streamkit_secret` | chat, notification, moderation |
| **Redis 7** | `redis:7-alpine` | 6379 | Password: `rajutechie-streamkit_secret` | All services (cache, pub/sub, presence) |
| **Kafka 3.7** (KRaft) | `bitnami/kafka:3.7` | 9092 (external) / 29092 (internal) | No auth | All services (event streaming) |
| **MinIO** | `minio/minio:latest` | 9000 (API) / 9001 (Console) | `rajutechie-streamkit` / `rajutechie-streamkit_secret` | media, stream |

### Connecting to Infrastructure Locally

**PostgreSQL:**
```bash
psql postgresql://rajutechie-streamkit:rajutechie-streamkit_secret@localhost:5432/rajutechie-streamkit
```

**MongoDB:**
```bash
mongosh "mongodb://rajutechie-streamkit:rajutechie-streamkit_secret@localhost:27017/rajutechie-streamkit?authSource=admin"
```

**Redis:**
```bash
redis-cli -h localhost -p 6379 -a rajutechie-streamkit_secret
```

**MinIO Console:**
Open `http://localhost:9001` in your browser. Log in with `rajutechie-streamkit` / `rajutechie-streamkit_secret`.

**Kafka:**
Use the external listener at `localhost:9092` for local tooling. Services running inside Docker use the internal listener at `kafka:29092`.

---

## Service Ports

When running locally via `pnpm dev`, each service binds to its own port. When running via Docker Compose, the same ports are mapped from the containers to the host.

| Service | Port | Description |
|---------|------|-------------|
| **API Gateway** | 3000 | Public HTTP entrypoint; routes to downstream services |
| **Auth Service** | 3001 (Docker) / 3010 (local) | JWT token issuance, validation, API key management |
| **User Service** | 3002 (Docker) / 3011 (local) | User profiles, device registration |
| **Chat Service** | 3003 (Docker) / 3012 (local) | Channels, messages, reactions, read receipts |
| **Call Service** | 3004 (Docker) / 3013 (local) | Voice/video call session management |
| **Meeting Service** | 3005 (Docker) / 3014 (local) | Scheduled meetings, waiting room, polls |
| **Stream Service** | 3006 (Docker) / 3015 (local) | Live streaming lifecycle |
| **Notification Service** | 3007 (Docker) / 3016 (local) | Push notifications (FCM/APNs), email |
| **Presence Service** | 3008 (Docker) / 3017 (local) | Online/offline/away status |
| **Media Service** | 3009 (Docker) / 3018 (local) | File upload/download via presigned URLs |
| **Analytics Service** | 3010 (Docker) / 3019 (local) | Usage tracking, billing |
| **Moderation Service** | 3011 (Docker) / 3020 (local) | Content filtering, reports, bans |
| **Signaling Server** | 3012 (Docker) / 3030 (local) | WebRTC signaling via mediasoup |
| **WebSocket Gateway** | 3100 | Persistent WebSocket connections, real-time events |

> **Note:** Port assignments in Docker Compose (the `docker-compose.yml` file) differ from the Helm chart and Kubernetes manifests. The Docker Compose file uses ports 3000-3012 + 3100, while the Helm chart assigns ports starting at 3000 for the API gateway, 3001 for the WS gateway, and 3010-3030 for backend services. When developing locally with `pnpm dev`, services use the ports defined in their individual `package.json` or config files. Check each service's configuration for the definitive binding.

---

## Environment Variables

Below is a comprehensive reference of all environment variables used across the platform.

### Infrastructure Connection Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_HOST` | `localhost` | PostgreSQL hostname |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `rajutechie-streamkit` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `rajutechie-streamkit_secret` | PostgreSQL password |
| `POSTGRES_DB` | `rajutechie-streamkit` | PostgreSQL database name |
| `DATABASE_URL` | (constructed) | Full PostgreSQL connection string |
| `MONGODB_HOST` | `localhost` | MongoDB hostname |
| `MONGODB_PORT` | `27017` | MongoDB port |
| `MONGO_USER` | `rajutechie-streamkit` | MongoDB username |
| `MONGO_PASSWORD` | `rajutechie-streamkit_secret` | MongoDB password |
| `MONGO_DB` | `rajutechie-streamkit` | MongoDB database name |
| `MONGODB_URI` | (constructed) | Full MongoDB connection string |
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_PASSWORD` | `rajutechie-streamkit_secret` | Redis password |
| `REDIS_URL` | (constructed) | Full Redis connection string |
| `KAFKA_BROKERS` | `localhost:9092` | Comma-separated Kafka broker addresses |
| `KAFKA_CLIENT_ID` | `rajutechie-streamkit` | Kafka client identifier |

### S3 / MinIO Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint URL |
| `S3_ACCESS_KEY` | `rajutechie-streamkit` | S3 access key |
| `S3_SECRET_KEY` | `rajutechie-streamkit_secret` | S3 secret key |
| `S3_BUCKET_MEDIA` | `media` | Bucket for user-uploaded media |
| `S3_BUCKET_RECORDINGS` | `recordings` | Bucket for call/stream recordings |
| `S3_BUCKET_THUMBNAILS` | `thumbnails` | Bucket for generated thumbnails |
| `S3_FORCE_PATH_STYLE` | `true` | Use path-style addressing (required for MinIO) |
| `S3_REGION` | `us-east-1` | S3 region |

### Authentication Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `change-me-in-production-please` | Secret key for signing JWTs |
| `JWT_EXPIRATION` | `3600` | Access token TTL in seconds (1 hour) |
| `JWT_REFRESH_EXPIRATION` | `604800` | Refresh token TTL in seconds (7 days) |
| `BCRYPT_ROUNDS` | `12` | bcrypt hashing rounds for passwords |
| `OAUTH_GOOGLE_CLIENT_ID` | (empty) | Google OAuth client ID |
| `OAUTH_GOOGLE_CLIENT_SECRET` | (empty) | Google OAuth client secret |
| `OAUTH_GITHUB_CLIENT_ID` | (empty) | GitHub OAuth client ID |
| `OAUTH_GITHUB_CLIENT_SECRET` | (empty) | GitHub OAuth client secret |

### Service-Specific Variables

| Variable | Default | Service | Description |
|----------|---------|---------|-------------|
| `NODE_ENV` | `development` | All | Runtime environment |
| `LOG_LEVEL` | `debug` | All | Logging verbosity: `debug`, `info`, `warn`, `error` |
| `RATE_LIMIT_WINDOW_MS` | `60000` | API Gateway | Rate limit sliding window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | API Gateway | Max requests per window |
| `CORS_ORIGINS` | `http://localhost:5173,...` | API Gateway | Allowed CORS origins |
| `WS_MAX_CONNECTIONS` | `10000` | WS Gateway | Maximum concurrent WebSocket connections |
| `WS_HEARTBEAT_INTERVAL` | `30000` | WS Gateway | Heartbeat ping interval (ms) |
| `WS_PATH` | `/ws` | WS Gateway | WebSocket endpoint path |
| `CHAT_MAX_MESSAGE_LENGTH` | `4096` | Chat Service | Maximum message body length |
| `CHAT_MAX_ATTACHMENTS` | `10` | Chat Service | Maximum attachments per message |
| `CALL_MAX_PARTICIPANTS` | `100` | Call Service | Max participants in a call |
| `CALL_RECORDING_ENABLED` | `true` | Call Service | Enable call recording |
| `MEETING_MAX_DURATION_HOURS` | `24` | Meeting Service | Maximum meeting duration |
| `MEETING_MAX_PARTICIPANTS` | `500` | Meeting Service | Maximum meeting participants |
| `STREAM_MAX_BITRATE` | `8000` | Stream Service | Max stream bitrate (kbps) |
| `STREAM_RECORDING_ENABLED` | `true` | Stream Service | Enable stream recording |
| `PRESENCE_TTL_SECONDS` | `300` | Presence Service | Presence entry TTL |
| `PRESENCE_CLEANUP_INTERVAL_MS` | `60000` | Presence Service | Stale presence cleanup interval |
| `MEDIA_MAX_FILE_SIZE_MB` | `100` | Media Service | Maximum upload file size |
| `MEDIA_ALLOWED_TYPES` | `image/*,video/*,...` | Media Service | Allowed MIME types |
| `MEDIA_THUMBNAIL_WIDTH` | `320` | Media Service | Thumbnail generation width |
| `MEDIA_THUMBNAIL_HEIGHT` | `240` | Media Service | Thumbnail generation height |
| `ANALYTICS_FLUSH_INTERVAL_MS` | `10000` | Analytics Service | Metrics flush interval |
| `ANALYTICS_BATCH_SIZE` | `100` | Analytics Service | Metrics batch size |
| `MODERATION_AUTO_FLAG_ENABLED` | `true` | Moderation Service | Enable automatic content flagging |
| `MODERATION_PROFANITY_FILTER` | `true` | Moderation Service | Enable profanity filter |
| `SIGNALING_MAX_ROOMS` | `10000` | Signaling Server | Maximum concurrent rooms |
| `SIGNALING_MAX_PEERS_PER_ROOM` | `100` | Signaling Server | Max peers per room |

### Notification Provider Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SMTP_HOST` | (empty) | SMTP server hostname |
| `SMTP_PORT` | `587` | SMTP server port |
| `SMTP_USER` | (empty) | SMTP username |
| `SMTP_PASSWORD` | (empty) | SMTP password |
| `SMTP_FROM` | `noreply@rajutechie-streamkit.io` | Default from address |
| `FCM_PROJECT_ID` | (empty) | Firebase Cloud Messaging project ID |
| `FCM_PRIVATE_KEY` | (empty) | FCM service account private key |
| `APNS_KEY_ID` | (empty) | Apple Push Notification Service key ID |
| `APNS_TEAM_ID` | (empty) | Apple Developer team ID |

### WebRTC / TURN Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TURN_SERVER_URL` | (empty) | TURN server URL for NAT traversal |
| `TURN_SERVER_USERNAME` | (empty) | TURN server username |
| `TURN_SERVER_CREDENTIAL` | (empty) | TURN server credential |
| `STUN_SERVER_URL` | `stun:stun.l.google.com:19302` | STUN server URL |

---

## Database Seeding

After starting the infrastructure and services, seed the development database with sample data:

```bash
./tools/scripts/seed-db.sh
```

The seed script calls the running service APIs and creates the following data:

### Default Application
- **Name:** RajutechieStreamKit Dev App
- **API Key:** `sk_dev_rajutechie-streamkit_001`
- **API Secret:** `dev_secret_001_change_me_in_production`
- **Allowed Origins:** `http://localhost:*`, `http://127.0.0.1:*`
- **Features:** chat, voice, video, streaming, recording

### Test Users

| Username | Email | Role | Password |
|----------|-------|------|----------|
| `alice` | alice@rajutechie-streamkit.dev | admin | `password123` |
| `bob` | bob@rajutechie-streamkit.dev | member | `password123` |
| `charlie` | charlie@rajutechie-streamkit.dev | member | `password123` |

### Test Channels

| Channel | Type | Members | Messages |
|---------|------|---------|----------|
| `#general` | public | all | 4 sample messages |
| `#random` | public | all | 3 sample messages |
| `#team-alpha` | private | alice, bob | 2 sample messages |

> **Important:** The seed script requires services to be running. Start them with `pnpm dev` before running `seed-db.sh`. The script will warn but continue if services are unreachable.

---

## Turborepo Commands

RajutechieStreamKit uses [Turborepo](https://turbo.build) to orchestrate builds, tests, and linting across the monorepo. All commands are run from the project root.

| Command | Description |
|---------|-------------|
| `pnpm build` | Build all packages and services (respects dependency graph) |
| `pnpm dev` | Start all services in development mode with file watching |
| `pnpm test` | Run all test suites (depends on `build`) |
| `pnpm lint` | Lint all packages with ESLint |
| `pnpm typecheck` | Run TypeScript type checking across the workspace |
| `pnpm clean` | Remove all `dist`, `node_modules`, and build artifacts |
| `pnpm format` | Format all files with Prettier |
| `pnpm db:migrate` | Run database migrations across all services |
| `pnpm db:seed` | Seed databases (depends on `db:migrate`) |
| `pnpm docker:deps` | Start infrastructure containers |
| `pnpm docker:deps:down` | Stop infrastructure containers |
| `pnpm docker:up` | Start the full stack via Docker Compose |
| `pnpm docker:down` | Stop the full stack |

### Running Commands for a Single Service

Use pnpm's `--filter` flag to target a specific workspace:

```bash
pnpm --filter api-gateway dev       # Start only the API gateway
pnpm --filter chat-service test     # Run tests for the chat service
pnpm --filter @rajutechie-streamkit/core build # Build only the core package
```

### Turbo Cache

Turborepo caches task outputs. To force a clean rebuild:

```bash
pnpm build --force
```

---

## Troubleshooting

### Port Already in Use

**Symptom:** A service fails to start with `EADDRINUSE`.

**Solution:**
```bash
# Find the process occupying the port (e.g., 3000)
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or change the port via environment variable
API_GATEWAY_PORT=3050 pnpm dev
```

### Docker Containers Not Starting

**Symptom:** `docker compose up` exits immediately or containers restart in a loop.

**Solution:**
```bash
# Check container logs
docker compose -f infrastructure/docker/docker-compose.deps.yml logs

# Check individual container
docker logs rajutechie-streamkit-kafka

# Reset everything (WARNING: deletes all data volumes)
docker compose -f infrastructure/docker/docker-compose.deps.yml down -v
docker compose -f infrastructure/docker/docker-compose.deps.yml up -d
```

### Kafka Connection Errors

**Symptom:** Services log `KafkaJSConnectionError` or `ECONNREFUSED` when connecting to Kafka.

**Causes and solutions:**

1. **Kafka is still starting.** Kafka can take 45-60 seconds to initialize. Wait for its health check to pass:
   ```bash
   docker inspect --format='{{.State.Health.Status}}' rajutechie-streamkit-kafka
   ```

2. **Wrong broker address.** Services running outside Docker must use `localhost:9092`. Services running inside Docker must use `kafka:29092`. Check that `KAFKA_BROKERS` is set correctly for your context.

3. **Kafka data corruption after unclean shutdown.** Remove the Kafka volume and restart:
   ```bash
   docker compose -f infrastructure/docker/docker-compose.deps.yml down
   docker volume rm rajutechie-streamkit_kafka_data
   docker compose -f infrastructure/docker/docker-compose.deps.yml up -d
   ```

### Redis Connection Refused

**Symptom:** `ECONNREFUSED 127.0.0.1:6379` or authentication errors.

**Solution:**
```bash
# Verify Redis is running and healthy
docker inspect --format='{{.State.Health.Status}}' rajutechie-streamkit-redis

# Test connectivity with the password
redis-cli -h localhost -p 6379 -a rajutechie-streamkit_secret ping
# Expected: PONG
```

If you see `NOAUTH Authentication required`, make sure `REDIS_PASSWORD` is set correctly in your `.env` file and matches the password configured in `docker-compose.deps.yml`.

### MongoDB Authentication Failure

**Symptom:** `MongoServerError: Authentication failed`.

**Solution:** The MongoDB container uses `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` only on first initialization. If you changed credentials after the volume was created, you need to delete the volume:

```bash
docker compose -f infrastructure/docker/docker-compose.deps.yml down
docker volume rm rajutechie-streamkit_mongodb_data rajutechie-streamkit_mongodb_config
docker compose -f infrastructure/docker/docker-compose.deps.yml up -d
```

### MinIO Buckets Not Created

**Symptom:** Media uploads fail with "bucket not found" errors.

**Solution:** The `minio-init` container runs once to create the required buckets (`media`, `recordings`, `thumbnails`). If it failed silently, run it manually:

```bash
docker compose -f infrastructure/docker/docker-compose.deps.yml run --rm minio-init
```

Or create buckets via the MinIO Console at `http://localhost:9001`.

### pnpm Install Fails

**Symptom:** `ERR_PNPM_OUTDATED_LOCKFILE` or version mismatch errors.

**Solution:**
```bash
# Ensure you are using the correct pnpm version
corepack enable
corepack prepare pnpm@9 --activate

# If the lockfile is out of date
pnpm install --no-frozen-lockfile
```

### TypeScript Build Errors After Pulling New Code

**Symptom:** `tsc` reports errors about missing types or stale declarations.

**Solution:**
```bash
pnpm clean
pnpm install
pnpm build
```

The `clean` command removes all `dist` directories and `node_modules`, giving you a fresh state.

---

## Stopping the Development Environment

### Stop Services Only

Press `Ctrl+C` in the terminal running `pnpm dev`.

### Stop Infrastructure

```bash
pnpm docker:deps:down
```

### Stop Everything and Remove Volumes

```bash
docker compose -f infrastructure/docker/docker-compose.deps.yml down -v
```

> **Warning:** The `-v` flag deletes all data volumes. All database content, Kafka topics, Redis data, and MinIO objects will be permanently lost.

---

## Next Steps

- [Docker Deployment Guide](./docker.md) -- Run the full stack in containers
- [Kubernetes Deployment Guide](./kubernetes.md) -- Deploy to a Kubernetes cluster
- [Microservices Reference Manual](./services.md) -- Detailed per-service documentation
- [CI/CD Pipeline Guide](./ci-cd.md) -- Understand the automated build and deploy pipeline
