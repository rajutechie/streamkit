# RajutechieStreamKit: React + Spring Boot Example

Full-featured demo app showcasing RajutechieStreamKit SDK integration with a React (TypeScript) frontend and Spring Boot backend.

## Features Demonstrated

- **Private Chat (1-on-1)**: Direct messaging between two users
- **Group Chat**: Multi-user channels with real-time messaging
- **Audio & Video Calls**: WebRTC-powered calls with camera, mic, and screen sharing
- **Live Streaming**: Host and viewer modes with live status and viewer counts

## Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 20+
- pnpm or npm

## Backend Setup

```bash
cd backend
mvn spring-boot:run
```

The Spring Boot server runs at `http://localhost:8080`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173`.

## Project Structure

```
backend/                        Spring Boot REST API
  src/main/java/com/rajutechie/streamkit/example/
    controller/                 Auth, Channel, Call, Stream, Webhook endpoints
    config/                     RajutechieStreamKit, Security, Web configuration
    service/                    User and Token services
    dto/                        Request/response DTOs
    model/                      Domain models

frontend/                       React + TypeScript + Vite
  src/pages/                    Login, Chat, Call, Stream pages
  src/components/               Reusable UI components
  src/contexts/                 Auth context provider
  src/api.ts                    Axios API client
```

## Tech Stack

| Layer    | Technology                            |
|----------|---------------------------------------|
| Frontend | React 18, TypeScript, Vite            |
| SDK      | @rajutechie-streamkit/react-sdk                  |
| Backend  | Spring Boot 3, Java 17               |
| Adapter  | rajutechie-streamkit-spring-boot-starter         |
