# Kubernetes Deployment

This guide covers deploying RajutechieStreamKit to Kubernetes using the provided manifests and Helm chart.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Architecture Overview](#architecture-overview)
- [Kustomize Deployment](#kustomize-deployment)
- [Helm Chart Deployment](#helm-chart-deployment)
- [Service Configuration](#service-configuration)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Kubernetes cluster 1.24+
- `kubectl` configured for your cluster
- `helm` v3.x (for Helm deployments)
- Container registry with RajutechieStreamKit images
- External dependencies deployed (PostgreSQL, MongoDB, Redis, Kafka)

---

## Architecture Overview

RajutechieStreamKit deploys as a set of microservices in a dedicated namespace:

```
rajutechie-streamkit namespace
├── api-gateway          (Deployment + Service + Ingress)
├── ws-gateway           (Deployment + Service, sticky sessions)
├── auth-service         (Deployment + Service)
├── user-service         (Deployment + Service)
├── chat-service         (Deployment + Service)
├── call-service         (Deployment + Service)
├── meeting-service      (Deployment + Service)
├── stream-service       (Deployment + Service)
├── notification-service (Deployment + Service)
├── presence-service     (Deployment + Service)
├── media-service        (Deployment + Service)
├── analytics-service    (Deployment + Service)
├── moderation-service   (Deployment + Service)
└── signaling-server     (Deployment + Service, hostNetwork optional)
```

---

## Kustomize Deployment

The `infrastructure/k8s/` directory uses Kustomize with environment overlays.

### Directory Structure

```
infrastructure/k8s/
├── base/
│   ├── namespace.yaml
│   ├── config-maps.yaml
│   ├── ingress.yaml
│   ├── kustomization.yaml
│   └── services/
│       ├── api-gateway.yaml
│       ├── ws-gateway.yaml
│       ├── auth-service.yaml
│       ├── user-service.yaml
│       ├── chat-service.yaml
│       ├── call-service.yaml
│       ├── meeting-service.yaml
│       ├── stream-service.yaml
│       ├── notification-service.yaml
│       ├── presence-service.yaml
│       ├── media-service.yaml
│       ├── analytics-service.yaml
│       ├── moderation-service.yaml
│       └── signaling-server.yaml
├── overlays/
│   ├── development/
│   ├── staging/
│   └── production/
└── kustomization.yaml
```

### Deploy to Development

```bash
kubectl apply -k infrastructure/k8s/overlays/development
```

### Deploy to Production

```bash
kubectl apply -k infrastructure/k8s/overlays/production
```

### Verify Deployment

```bash
kubectl -n rajutechie-streamkit get pods
kubectl -n rajutechie-streamkit get services
kubectl -n rajutechie-streamkit get ingress
```

---

## Helm Chart Deployment

The Helm chart provides a configurable deployment option.

### Install

```bash
helm install rajutechie-streamkit infrastructure/helm/rajutechie-streamkit \
  --namespace rajutechie-streamkit \
  --create-namespace \
  -f my-values.yaml
```

### Upgrade

```bash
helm upgrade rajutechie-streamkit infrastructure/helm/rajutechie-streamkit \
  --namespace rajutechie-streamkit \
  -f my-values.yaml
```

### Uninstall

```bash
helm uninstall rajutechie-streamkit --namespace rajutechie-streamkit
```

### Key values.yaml Options

```yaml
# Global settings
global:
  imageRegistry: "your-registry.io"
  imageTag: "1.0.0"
  imagePullPolicy: Always

# Replica counts
apiGateway:
  replicas: 3
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 500m
      memory: 512Mi

wsGateway:
  replicas: 3
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: "1"
      memory: 1Gi

chatService:
  replicas: 2

callService:
  replicas: 2

signalingServer:
  replicas: 2
  resources:
    requests:
      cpu: "1"
      memory: 1Gi
    limits:
      cpu: "2"
      memory: 2Gi

# Database connections
postgresql:
  host: "postgres.rajutechie-streamkit.svc.cluster.local"
  port: 5432
  database: "rajutechie-streamkit"
  username: "rajutechie-streamkit"
  existingSecret: "rajutechie-streamkit-db-credentials"

mongodb:
  uri: "mongodb://mongo.rajutechie-streamkit.svc.cluster.local:27017/rajutechie-streamkit"
  existingSecret: "rajutechie-streamkit-mongo-credentials"

redis:
  host: "redis.rajutechie-streamkit.svc.cluster.local"
  port: 6379

kafka:
  brokers: "kafka.rajutechie-streamkit.svc.cluster.local:9092"

# Ingress
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: api.rajutechie-streamkit.example.com
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: rajutechie-streamkit-tls
      hosts:
        - api.rajutechie-streamkit.example.com

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilization: 70
```

---

## Service Configuration

### Environment Variables

All services read configuration from environment variables and ConfigMaps:

```yaml
# config-maps.yaml (shared configuration)
apiVersion: v1
kind: ConfigMap
metadata:
  name: rajutechie-streamkit-config
  namespace: rajutechie-streamkit
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  POSTGRES_HOST: "postgres.rajutechie-streamkit.svc.cluster.local"
  POSTGRES_PORT: "5432"
  POSTGRES_DB: "rajutechie-streamkit"
  MONGODB_URI: "mongodb://mongo.rajutechie-streamkit.svc.cluster.local:27017/rajutechie-streamkit"
  REDIS_URL: "redis://redis.rajutechie-streamkit.svc.cluster.local:6379"
  KAFKA_BROKERS: "kafka.rajutechie-streamkit.svc.cluster.local:9092"
```

### Secrets

Store sensitive values in Kubernetes Secrets:

```bash
kubectl -n rajutechie-streamkit create secret generic rajutechie-streamkit-secrets \
  --from-literal=POSTGRES_PASSWORD=your_password \
  --from-literal=JWT_SECRET=your_jwt_secret \
  --from-literal=API_SECRET=your_api_secret \
  --from-literal=WEBHOOK_SECRET=your_webhook_secret
```

### WebSocket Gateway — Sticky Sessions

The WebSocket Gateway requires sticky sessions for long-lived connections:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ws-gateway
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "RAJUTECHIE_STREAMKIT_WS"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
spec:
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### Signaling Server — Host Networking

For optimal WebRTC performance, the signaling server may use host networking:

```yaml
spec:
  template:
    spec:
      hostNetwork: true
      dnsPolicy: ClusterFirstWithHostNet
```

---

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-gateway-hpa
  namespace: rajutechie-streamkit
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-gateway
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Scaling Targets

| Service | Min Replicas | Max Replicas | Scale Metric |
|---------|-------------|-------------|-------------|
| API Gateway | 2 | 10 | CPU 70% |
| WebSocket Gateway | 2 | 20 | Connections per pod |
| Chat Service | 2 | 8 | CPU 70% |
| Call Service | 2 | 6 | CPU 70% |
| Signaling Server | 2 | 10 | Active rooms |
| Presence Service | 2 | 6 | Memory 70% |

### Manual Scaling

```bash
kubectl -n rajutechie-streamkit scale deployment api-gateway --replicas=5
kubectl -n rajutechie-streamkit scale deployment ws-gateway --replicas=8
```

---

## Monitoring

### Health Checks

All services expose health endpoints:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Pod Status

```bash
# Check all pods
kubectl -n rajutechie-streamkit get pods -o wide

# View pod logs
kubectl -n rajutechie-streamkit logs -f deployment/chat-service

# Describe a pod (for debugging)
kubectl -n rajutechie-streamkit describe pod <pod-name>

# Resource usage
kubectl -n rajutechie-streamkit top pods
```

---

## Troubleshooting

### Common Issues

**Pods stuck in Pending:**
```bash
kubectl -n rajutechie-streamkit describe pod <pod-name>
# Check Events section for scheduling failures
```

**CrashLoopBackOff:**
```bash
kubectl -n rajutechie-streamkit logs <pod-name> --previous
# Check for missing env vars or connection failures
```

**Service connectivity:**
```bash
# Test internal DNS resolution
kubectl -n rajutechie-streamkit run debug --rm -it --image=busybox -- nslookup chat-service

# Test service connection
kubectl -n rajutechie-streamkit run debug --rm -it --image=curlimages/curl -- \
  curl http://chat-service:3000/health
```

**WebSocket connections dropping:**
- Verify sticky session configuration on ingress
- Check ws-gateway pod logs for connection errors
- Ensure Redis adapter is configured for cross-instance communication
