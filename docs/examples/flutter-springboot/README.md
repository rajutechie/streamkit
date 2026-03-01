# RajutechieStreamKit: Flutter + Spring Boot Example

A production-quality example showing how to integrate the **RajutechieStreamKit Flutter SDK** with a
**Spring Boot** backend. The application demonstrates real-time chat, video/audio calling,
and live streaming features.

## Architecture

```
Flutter App  <--HTTP-->  Spring Boot API  <--REST-->  RajutechieStreamKit Platform
     |                        |
     +---WebSocket------------+---Webhooks--->  RajutechieStreamKit Events
```

- **Spring Boot backend** -- handles authentication, generates RajutechieStreamKit user tokens,
  and proxies management operations (create channels, initiate calls, manage streams).
- **Flutter app** -- connects to the RajutechieStreamKit platform via the Flutter SDK for
  real-time messaging, calling, and streaming, while talking to the backend for auth
  and resource management.

## Prerequisites

| Tool         | Version   |
|--------------|-----------|
| Java         | 17+       |
| Maven        | 3.8+      |
| Flutter      | 3.16+     |
| Dart         | 3.2+      |
| Android SDK  | 33+ (for Android) |
| Xcode        | 15+ (for iOS)     |

## Quick Start

### 1. Start the backend

```bash
cd backend
export RAJUTECHIE_STREAMKIT_API_KEY=sk_dev_rajutechie-streamkit_001
export RAJUTECHIE_STREAMKIT_API_SECRET=dev_secret_001_change_me_in_production
mvn spring-boot:run
```

The API starts at `http://localhost:8080`.

### 2. Run the Flutter app

```bash
cd app
flutter pub get
flutter run
```

> **Tip:** On the Android emulator the backend is reachable at `10.0.2.2:8080`.
> On the iOS simulator use `localhost:8080`. The app auto-detects the platform.

## Backend API Endpoints

| Method | Path                         | Description               |
|--------|------------------------------|---------------------------|
| POST   | `/api/auth/login`            | Log in (returns token)    |
| POST   | `/api/auth/register`         | Register a new user       |
| GET    | `/api/auth/users`            | List all users            |
| POST   | `/api/channels`              | Create a channel          |
| GET    | `/api/channels`              | List channels             |
| POST   | `/api/calls`                 | Initiate a call           |
| GET    | `/api/calls/{id}`            | Get call details          |
| POST   | `/api/streams`               | Create a live stream      |
| GET    | `/api/streams`               | List live streams         |
| POST   | `/api/streams/{id}/start`    | Start streaming           |
| POST   | `/api/streams/{id}/stop`     | Stop streaming            |
| POST   | `/api/webhooks/rajutechie-streamkit`    | RajutechieStreamKit webhook handler |

## Project Structure

```
flutter-springboot/
├── backend/                 Spring Boot API
│   ├── pom.xml
│   └── src/main/
│       ├── java/com/rajutechie/streamkit/example/
│       │   ├── Application.java
│       │   ├── config/
│       │   ├── controller/
│       │   ├── dto/
│       │   ├── model/
│       │   └── service/
│       └── resources/
│           └── application.yml
└── app/                     Flutter mobile app
    ├── pubspec.yaml
    └── lib/
        ├── main.dart
        ├── app.dart
        ├── theme.dart
        ├── services/
        ├── models/
        ├── screens/
        └── widgets/
```

## Features Demonstrated

- **Authentication** -- register / login with in-memory user store; JWT-based RajutechieStreamKit tokens.
- **Chat** -- create channels (DM and group), send messages, typing indicators, reactions.
- **Calls** -- start audio/video calls, accept/reject incoming calls, mute/camera controls.
- **Streaming** -- host a live stream, browse active streams, viewer experience with chat overlay.

## Configuration

### Backend (`application.yml`)

| Property                     | Default                                    | Description                |
|------------------------------|--------------------------------------------|----------------------------|
| `rajutechie-streamkit.api-key`          | `sk_dev_rajutechie-streamkit_001`                     | RajutechieStreamKit API key          |
| `rajutechie-streamkit.api-secret`       | `dev_secret_001_change_me_in_production`   | RajutechieStreamKit API secret       |
| `rajutechie-streamkit.webhook-secret`   | `whsec_dev_secret`                         | Webhook signature secret   |

### Flutter App

Edit `lib/services/api_service.dart` to change the backend URL. By default the app
uses `10.0.2.2:8080` on Android and `localhost:8080` on iOS/desktop.

## License

This example is part of the RajutechieStreamKit documentation and is released under the MIT license.
