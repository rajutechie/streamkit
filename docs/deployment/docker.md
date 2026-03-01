# RajutechieStreamKit -- Docker Deployment Guide

This guide covers building, running, and managing the full RajutechieStreamKit platform using Docker and Docker Compose. It is the recommended approach for staging environments, integration testing, and teams that prefer containerized deployments without Kubernetes.

---

## Prerequisites

| Tool | Minimum Version | Installation |
|------|----------------|--------------|
| **Docker** | 24.0+ | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| **Docker Compose** | v2 (plugin) | Ships with Docker Desktop; Linux users see [compose install](https://docs.docker.com/compose/install/) |

Verify:

```bash
docker --version            # Docker version 24.x or higher
docker compose version      # Docker Compose version v2.x.x
```

---

## Docker Compose Files

RajutechieStreamKit ships with two Compose files in `infrastructure/docker/`:

```
infrastructure/docker/
├── docker-compose.yml          # Full stack (all 14 services + dependencies)
├── docker-compose.deps.yml     # Dependencies only (Postgres, MongoDB, Redis, Kafka, MinIO)
└── .env.example                # Environment variable template
```

| File | Purpose | Use Case |
|------|---------|----------|
| `docker-compose.deps.yml` | Infrastructure only | Local development with `pnpm dev` |
| `docker-compose.yml` | Full stack (includes deps) | Self-contained deployment, CI, staging |

The full stack file uses `include` to pull in the dependencies file automatically, so you never need to specify both.

---

## Building Images

### Build All Services

From the repository root:

```bash
docker compose -f infrastructure/docker/docker-compose.yml build
```

### Build Individual Services

Each service has its own `Dockerfile` in its directory under `services/`:

```bash
docker build -t rajutechie-streamkit/api-gateway:latest services/api-gateway/
docker build -t rajutechie-streamkit/ws-gateway:latest services/ws-gateway/
docker build -t rajutechie-streamkit/auth-service:latest services/auth-service/
docker build -t rajutechie-streamkit/user-service:latest services/user-service/
docker build -t rajutechie-streamkit/chat-service:latest services/chat-service/
docker build -t rajutechie-streamkit/call-service:latest services/call-service/
docker build -t rajutechie-streamkit/meeting-service:latest services/meeting-service/
docker build -t rajutechie-streamkit/stream-service:latest services/stream-service/
docker build -t rajutechie-streamkit/notification-service:latest services/notification-service/
docker build -t rajutechie-streamkit/presence-service:latest services/presence-service/
docker build -t rajutechie-streamkit/media-service:latest services/media-service/
docker build -t rajutechie-streamkit/analytics-service:latest services/analytics-service/
docker build -t rajutechie-streamkit/moderation-service:latest services/moderation-service/
docker build -t rajutechie-streamkit/signaling-server:latest services/signaling-server/
```

---

## Multi-Stage Build Pattern

All RajutechieStreamKit services use an identical multi-stage Dockerfile pattern to keep production images small and secure:

```dockerfile
# Stage 1: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
RUN addgroup -S rajutechie-streamkit && adduser -S rajutechie-streamkit -G rajutechie-streamkit
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER rajutechie-streamkit
EXPOSE <port>
HEALTHCHECK CMD wget -q --spider http://localhost:<port>/health || exit 1
CMD ["node", "dist/index.js"]
```

Key properties of this pattern:

- **Non-root execution** -- All services run as the `rajutechie-streamkit` user, never as root.
- **Minimal image size** -- Only production artifacts (`dist/`, `node_modules/`, `package.json`) are copied to the final stage. Build tools, source code, and dev dependencies are discarded.
- **Built-in health checks** -- Each image includes a `HEALTHCHECK` instruction so Docker can monitor service readiness.
- **Alpine base** -- Uses `node:20-alpine` to minimize the attack surface and image size (typically under 200 MB per service).

---

## Running the Full Stack

### Start Everything

```bash
cd infrastructure/docker
cp .env.example .env          # Create .env if it does not exist
docker compose up -d
```

### Check Status

```bash
docker compose ps
```

All containers should show `healthy` in the STATUS column. Infrastructure services start first; application services wait for their dependencies via `depends_on` with `condition: service_healthy`.

### View Logs

```bash
# All services
docker compose logs -f

# Specific services
docker compose logs -f api-gateway ws-gateway

# Last 100 lines for a single service
docker compose logs --tail=100 chat-service
```

### Stop

```bash
# Stop all containers (data is preserved in volumes)
docker compose down

# Stop and remove all volumes (WARNING: destroys all data)
docker compose down -v
```

---

## Infrastructure Services

The `docker-compose.deps.yml` file provisions these stateful dependencies:

| Service | Image | Host Port | Container Port | Volume | Used By |
|---------|-------|-----------|----------------|--------|---------|
| **PostgreSQL 16** | `postgres:16-alpine` | 5432 | 5432 | `postgres_data` | auth, user, meeting, analytics, media |
| **MongoDB 7** | `mongo:7` | 27017 | 27017 | `mongodb_data`, `mongodb_config` | chat, notification, moderation |
| **Redis 7** | `redis:7-alpine` | 6379 | 6379 | `redis_data` | All services (cache, pub/sub, presence) |
| **Kafka 3.7** (KRaft) | `bitnami/kafka:3.7` | 9092 | 29092 (internal) | `kafka_data` | All services (event streaming) |
| **MinIO** | `minio/minio:latest` | 9000 (API), 9001 (Console) | 9000, 9001 | `minio_data` | media, stream |
| **MinIO Init** | `minio/mc:latest` | -- | -- | -- | Creates buckets on first run |

### Networking

All containers join the `rajutechie-streamkit-network` bridge network. Services reference each other by container name (e.g., `postgres`, `redis`, `kafka`). The Kafka broker advertises two listeners:

- **Internal** (`kafka:29092`) -- used by services running inside Docker.
- **External** (`localhost:9092`) -- used by tools running on the host machine.

---

## Application Services

When running via Docker Compose, services use the following port mapping:

| Service | Container Name | Host Port | Internal Port |
|---------|---------------|-----------|---------------|
| API Gateway | `rajutechie-streamkit-api-gateway` | 3000 | 3000 |
| WebSocket Gateway | `rajutechie-streamkit-ws-gateway` | 3100 | 3100 |
| Auth Service | `rajutechie-streamkit-auth-service` | 3001 | 3001 |
| User Service | `rajutechie-streamkit-user-service` | 3002 | 3002 |
| Chat Service | `rajutechie-streamkit-chat-service` | 3003 | 3003 |
| Call Service | `rajutechie-streamkit-call-service` | 3004 | 3004 |
| Meeting Service | `rajutechie-streamkit-meeting-service` | 3005 | 3005 |
| Stream Service | `rajutechie-streamkit-stream-service` | 3006 | 3006 |
| Notification Service | `rajutechie-streamkit-notification-service` | 3007 | 3007 |
| Presence Service | `rajutechie-streamkit-presence-service` | 3008 | 3008 |
| Media Service | `rajutechie-streamkit-media-service` | 3009 | 3009 |
| Analytics Service | `rajutechie-streamkit-analytics-service` | 3010 | 3010 |
| Moderation Service | `rajutechie-streamkit-moderation-service` | 3011 | 3011 |
| Signaling Server | `rajutechie-streamkit-signaling-server` | 3012 | 3012 |

> **Note:** These Docker Compose ports (3001-3012 for backend services) differ from the Helm chart / Kubernetes ports (3010-3030). See the [Microservices Reference](./services.md) for the Kubernetes port assignments.

---

## Health Checks

Every RajutechieStreamKit service exposes a `GET /health` endpoint. Docker Compose configures health checks for all containers with:

- **Interval:** 15 seconds
- **Timeout:** 5 seconds
- **Retries:** 5
- **Start period:** 30 seconds

Example health check response:

```json
{
  "status": "ok",
  "service": "api-gateway",
  "timestamp": "2026-02-12T10:30:00.000Z"
}
```

Verify health status:

```bash
# Check all containers
docker compose ps

# Inspect a specific container
docker inspect --format='{{.State.Health.Status}}' rajutechie-streamkit-api-gateway
```

---

## Environment Configuration

Copy the template and modify as needed:

```bash
cp infrastructure/docker/.env.example .env
```

### Key Variable Groups

**Infrastructure Credentials:**

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_USER` | `rajutechie-streamkit` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `rajutechie-streamkit_secret` | PostgreSQL password |
| `POSTGRES_DB` | `rajutechie-streamkit` | PostgreSQL database name |
| `MONGO_USER` | `rajutechie-streamkit` | MongoDB username |
| `MONGO_PASSWORD` | `rajutechie-streamkit_secret` | MongoDB password |
| `REDIS_PASSWORD` | `rajutechie-streamkit_secret` | Redis password |
| `MINIO_ROOT_USER` | `rajutechie-streamkit` | MinIO access key |
| `MINIO_ROOT_PASSWORD` | `rajutechie-streamkit_secret` | MinIO secret key |

**Application Settings:**

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment |
| `LOG_LEVEL` | `debug` | Logging verbosity (`debug`, `info`, `warn`, `error`) |
| `JWT_SECRET` | `change-me-in-production-please` | JWT signing secret |
| `JWT_EXPIRATION` | `3600` | Access token TTL (seconds) |
| `JWT_REFRESH_EXPIRATION` | `604800` | Refresh token TTL (seconds) |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Allowed CORS origins |

**Port Overrides:**

Every service port can be overridden. For example, `API_GATEWAY_PORT=8080` maps the API gateway to host port 8080 instead of the default 3000. See `infrastructure/docker/.env.example` for the full list.

---

## Scaling

Docker Compose supports horizontal scaling for stateless services:

```bash
# Scale the WebSocket gateway to 3 instances and the chat service to 2
docker compose up -d --scale ws-gateway=3 --scale chat-service=2
```

When scaling, keep in mind:

- **Port conflicts** -- Only one container can bind to a host port. Remove the `ports` mapping or use a reverse proxy (NGINX, Traefik) in front of scaled services.
- **Session affinity** -- The WebSocket gateway requires sticky sessions. Use a load balancer with client IP affinity in front of multiple instances.
- **Redis adapter** -- The WS gateway uses Redis pub/sub for cross-instance communication. Scaling works automatically when Redis is available.

---

## Logging

All services use the `json-file` logging driver with rotation:

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
```

This means each container retains at most 30 MB of logs (3 files of 10 MB each). For production, consider switching to a centralized logging driver:

```yaml
logging:
  driver: fluentd
  options:
    fluentd-address: "localhost:24224"
    tag: "rajutechie-streamkit.{{.Name}}"
```

---

## Resource Limits

By default, the Docker Compose file does not set CPU or memory limits, relying on the host machine's resources. For production-like environments, add resource constraints:

```yaml
services:
  api-gateway:
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
        reservations:
          cpus: "0.25"
          memory: 128M
```

---

## Production Considerations

Running Docker Compose is suitable for development, testing, and small-scale staging environments. For production workloads, consider the following:

### Use a Container Orchestrator

Docker Compose does not provide multi-host scheduling, automatic failover, or rolling updates. For production, deploy to:

- **Kubernetes** -- See [Kubernetes Deployment Guide](./kubernetes.md)
- **Docker Swarm** -- Convert the Compose file using `docker stack deploy`

### External Managed Databases

Replace containerized databases with managed services:

| Dependency | Managed Alternative |
|-----------|---------------------|
| PostgreSQL | AWS RDS, Google Cloud SQL, Azure Database |
| MongoDB | MongoDB Atlas, DocumentDB |
| Redis | AWS ElastiCache, Google Memorystore |
| Kafka | AWS MSK, Confluent Cloud |
| MinIO | AWS S3 (native) |

See [Terraform Infrastructure Guide](./terraform.md) for automated provisioning of AWS managed services.

### Image Registry

Push images to a private registry instead of building locally:

```bash
# Tag for ECR
docker tag rajutechie-streamkit/api-gateway:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/rajutechie-streamkit/api-gateway:v1.2.3

# Push
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/rajutechie-streamkit/api-gateway:v1.2.3
```

Supported registries: Amazon ECR, GitHub Container Registry (GHCR), Docker Hub, Google Artifact Registry.

### Secrets Management

Never store production secrets in `.env` files or Docker Compose configurations. Use:

- **Docker Secrets** (Swarm mode)
- **AWS Secrets Manager** or **HashiCorp Vault** with environment injection
- **Kubernetes Secrets** (when migrating to K8s)

### Network Security

- Run services on an internal network; expose only the API gateway and WebSocket gateway.
- Use TLS termination at a reverse proxy (NGINX, Traefik, or a cloud load balancer).
- Restrict database ports to internal-only access.

---

## Common Operations

### Run Database Migrations

```bash
# Execute migrations inside a running service container
docker compose exec auth-service node dist/migrate.js

# Or run the Turbo command from the host
pnpm db:migrate
```

### Access a Service Shell

```bash
docker compose exec api-gateway sh
```

### Rebuild a Single Service

```bash
docker compose build api-gateway
docker compose up -d api-gateway
```

### View Infrastructure Data

```bash
# PostgreSQL
docker compose exec postgres psql -U rajutechie-streamkit -d rajutechie-streamkit

# MongoDB
docker compose exec mongodb mongosh -u rajutechie-streamkit -p rajutechie-streamkit_secret --authenticationDatabase admin

# Redis
docker compose exec redis redis-cli -a rajutechie-streamkit_secret

# MinIO Console
# Open http://localhost:9001 -- credentials: rajutechie-streamkit / rajutechie-streamkit_secret
```

### Clean Everything

```bash
# Stop containers, remove volumes, networks, and images
docker compose down -v --rmi local

# Remove all dangling images
docker image prune -f
```

---

## Troubleshooting

### Containers Stuck in "Starting"

Infrastructure containers have health checks that must pass before application services start. Kafka takes the longest (up to 60 seconds). Check the status:

```bash
docker compose ps
docker inspect --format='{{.State.Health.Status}}' rajutechie-streamkit-kafka
```

### Port Already Allocated

If a port is already in use on the host, override it in `.env`:

```bash
API_GATEWAY_PORT=8080
WS_GATEWAY_PORT=8100
```

### Kafka Connection Errors

Services inside Docker connect to `kafka:29092` (internal listener). Services on the host use `localhost:9092` (external listener). Make sure `KAFKA_BROKERS` is set correctly for the context.

### MinIO Buckets Missing

The `minio-init` container creates buckets automatically. If it failed, run it manually:

```bash
docker compose run --rm minio-init
```

---

## Next Steps

- [Kubernetes Deployment Guide](./kubernetes.md) -- Deploy to a production Kubernetes cluster
- [Terraform Infrastructure Guide](./terraform.md) -- Provision AWS infrastructure
- [CI/CD Pipeline Guide](./ci-cd.md) -- Automated builds and deployments
- [Microservices Reference](./services.md) -- Detailed per-service documentation
