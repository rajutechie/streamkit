# CI/CD Pipeline

RajutechieStreamKit uses GitHub Actions for continuous integration and deployment. The pipeline covers linting, testing, building Docker images, publishing SDKs, and deploying to Kubernetes.

---

## Table of Contents

- [Pipeline Overview](#pipeline-overview)
- [CI Workflow](#ci-workflow)
- [SDK Release Workflow](#sdk-release-workflow)
- [Deployment Workflow](#deployment-workflow)
- [Required Secrets](#required-secrets)
- [Branch Strategy](#branch-strategy)

---

## Pipeline Overview

```
Push / PR                    Tag vX.Y.Z                   Merge to main
    │                            │                            │
    ▼                            ▼                            ▼
┌──────────┐            ┌──────────────┐            ┌──────────────┐
│  ci.yml  │            │sdk-release.yml│            │  deploy.yml  │
│          │            │              │            │              │
│ Lint     │            │ Build SDKs   │            │ Build Images │
│ Type-    │            │ Run Tests    │            │ Push to ECR  │
│  check   │            │ Publish:     │            │ Deploy to    │
│ Unit     │            │  - npm       │            │  staging     │
│  tests   │            │  - Maven     │            │ E2E tests    │
│ Integr.  │            │  - CocoaPods │            │ Manual gate  │
│  tests   │            │  - pub.dev   │            │ Deploy to    │
│ Build    │            │  - PyPI      │            │  production  │
└──────────┘            └──────────────┘            └──────────────┘
```

---

## CI Workflow

**File:** `.github/workflows/ci.yml`

Runs on every push and pull request. Validates code quality and correctness across all packages and services.

### Stages

#### 1. Lint & Type Check

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: pnpm
    - run: pnpm install --frozen-lockfile
    - run: pnpm lint          # ESLint across all packages
    - run: pnpm typecheck     # TypeScript compilation check
```

#### 2. Unit Tests

```yaml
test:
  runs-on: ubuntu-latest
  needs: lint
  strategy:
    matrix:
      package:
        - packages/core
        - packages/js-sdk
        - packages/react-sdk
        - packages/angular-sdk
        - packages/server-sdk
        - services/auth-service
        - services/chat-service
        - services/call-service
        # ... all services
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter ./${{ matrix.package }} test
```

#### 3. Integration Tests

```yaml
integration:
  runs-on: ubuntu-latest
  needs: test
  services:
    postgres:
      image: postgres:15
      env:
        POSTGRES_DB: rajutechie-streamkit_test
        POSTGRES_PASSWORD: test
      ports: ['5432:5432']
    redis:
      image: redis:7
      ports: ['6379:6379']
    mongo:
      image: mongo:7
      ports: ['27017:27017']
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
    - run: pnpm install --frozen-lockfile
    - run: pnpm test:integration
      env:
        POSTGRES_URL: postgresql://postgres:test@localhost:5432/rajutechie-streamkit_test
        REDIS_URL: redis://localhost:6379
        MONGODB_URI: mongodb://localhost:27017/rajutechie-streamkit_test
```

#### 4. Build Verification

```yaml
build:
  runs-on: ubuntu-latest
  needs: integration
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
    - run: pnpm install --frozen-lockfile
    - run: pnpm build   # Turborepo builds all packages
```

---

## SDK Release Workflow

**File:** `.github/workflows/sdk-release.yml`

Triggered by tagging a release (e.g., `v1.2.0`). Builds and publishes all SDK packages to their respective registries.

### Trigger

```yaml
on:
  push:
    tags:
      - 'v*.*.*'
```

### Jobs

#### JavaScript SDKs (npm)

```yaml
publish-npm:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v2
    - uses: actions/setup-node@v4
      with:
        registry-url: 'https://registry.npmjs.org'
    - run: pnpm install --frozen-lockfile
    - run: pnpm build
    - run: pnpm test
    - run: |
        pnpm --filter @rajutechie-streamkit/core publish --no-git-checks
        pnpm --filter @rajutechie-streamkit/js-sdk publish --no-git-checks
        pnpm --filter @rajutechie-streamkit/react-sdk publish --no-git-checks
        pnpm --filter @rajutechie-streamkit/react-native-sdk publish --no-git-checks
        pnpm --filter @rajutechie-streamkit/angular-sdk publish --no-git-checks
        pnpm --filter @rajutechie-streamkit/server-sdk publish --no-git-checks
      env:
        NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Android SDK (Maven Central)

```yaml
publish-android:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-java@v4
      with:
        distribution: temurin
        java-version: 17
    - working-directory: sdks/android
      run: ./gradlew publishToMavenCentral
      env:
        MAVEN_USERNAME: ${{ secrets.MAVEN_USERNAME }}
        MAVEN_PASSWORD: ${{ secrets.MAVEN_PASSWORD }}
        SIGNING_KEY: ${{ secrets.GPG_KEY }}
```

#### iOS SDK (CocoaPods + SPM)

```yaml
publish-ios:
  runs-on: macos-latest
  steps:
    - uses: actions/checkout@v4
    - run: pod trunk push RajutechieStreamKit.podspec
      env:
        COCOAPODS_TRUNK_TOKEN: ${{ secrets.COCOAPODS_TOKEN }}
```

#### Flutter SDK (pub.dev)

```yaml
publish-flutter:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: subosito/flutter-action@v2
      with:
        flutter-version: '3.x'
    - working-directory: sdks/flutter
      run: dart pub publish --force
```

#### Python Adapters (PyPI)

```yaml
publish-python:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: '3.12'
    - run: pip install build twine
    - run: |
        cd packages/backend-adapters/django && python -m build && twine upload dist/*
        cd ../fastapi && python -m build && twine upload dist/*
      env:
        TWINE_USERNAME: __token__
        TWINE_PASSWORD: ${{ secrets.PYPI_TOKEN }}
```

---

## Deployment Workflow

**File:** `.github/workflows/deploy.yml`

Triggered on merges to `main`. Builds Docker images, deploys to staging, runs E2E tests, and deploys to production after manual approval.

### Stages

#### 1. Build & Push Docker Images

```yaml
build-images:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      service:
        - api-gateway
        - ws-gateway
        - auth-service
        - user-service
        - chat-service
        - call-service
        - meeting-service
        - stream-service
        - notification-service
        - presence-service
        - media-service
        - analytics-service
        - moderation-service
        - signaling-server
  steps:
    - uses: actions/checkout@v4
    - uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    - uses: aws-actions/amazon-ecr-login@v2
    - run: |
        docker build -t $ECR_REGISTRY/rajutechie-streamkit-${{ matrix.service }}:${{ github.sha }} \
          services/${{ matrix.service }}
        docker push $ECR_REGISTRY/rajutechie-streamkit-${{ matrix.service }}:${{ github.sha }}
```

#### 2. Deploy to Staging

```yaml
deploy-staging:
  needs: build-images
  runs-on: ubuntu-latest
  environment: staging
  steps:
    - uses: actions/checkout@v4
    - uses: aws-actions/configure-aws-credentials@v4
    - run: aws eks update-kubeconfig --name rajutechie-streamkit-staging
    - run: |
        helm upgrade rajutechie-streamkit infrastructure/helm/rajutechie-streamkit \
          --namespace rajutechie-streamkit \
          --set global.imageTag=${{ github.sha }} \
          -f infrastructure/helm/rajutechie-streamkit/values-staging.yaml
```

#### 3. E2E Tests

```yaml
e2e-tests:
  needs: deploy-staging
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - run: pnpm install --frozen-lockfile
    - run: pnpm test:e2e
      env:
        API_URL: https://api.staging.rajutechie-streamkit.example.com
```

#### 4. Deploy to Production (Manual Approval)

```yaml
deploy-production:
  needs: e2e-tests
  runs-on: ubuntu-latest
  environment: production  # Requires manual approval in GitHub
  steps:
    - uses: actions/checkout@v4
    - uses: aws-actions/configure-aws-credentials@v4
    - run: aws eks update-kubeconfig --name rajutechie-streamkit-production
    - run: |
        helm upgrade rajutechie-streamkit infrastructure/helm/rajutechie-streamkit \
          --namespace rajutechie-streamkit \
          --set global.imageTag=${{ github.sha }} \
          -f infrastructure/helm/rajutechie-streamkit/values-production.yaml
```

---

## Required Secrets

Configure these in GitHub repository settings (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `NPM_TOKEN` | npm publish token |
| `PYPI_TOKEN` | PyPI API token |
| `MAVEN_USERNAME` | Maven Central username |
| `MAVEN_PASSWORD` | Maven Central password |
| `GPG_KEY` | GPG signing key for Maven |
| `COCOAPODS_TOKEN` | CocoaPods trunk token |
| `AWS_ACCESS_KEY_ID` | AWS access key for ECR/EKS |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `ECR_REGISTRY` | ECR registry URL |

---

## Branch Strategy

| Branch | Purpose | CI | Deploy |
|--------|---------|-----|--------|
| `main` | Production-ready code | Full CI | Staging + Production |
| `develop` | Integration branch | Full CI | — |
| `feature/*` | Feature development | Lint + Tests | — |
| `release/*` | Release preparation | Full CI | Staging |
| `hotfix/*` | Production fixes | Full CI | Staging + Production |

### Release Process

1. Create a release branch from `main`
2. Bump version numbers across packages
3. Update changelogs
4. Merge to `main`
5. Tag with `vX.Y.Z` to trigger SDK release workflow
6. Deployment workflow deploys services automatically
