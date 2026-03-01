# RajutechieStreamKit: React + Django Example

Full-featured demo app showcasing RajutechieStreamKit SDK integration with a React (TypeScript) frontend and Django REST backend.

## Features Demonstrated

- **Private Chat (1-on-1)**: Direct messaging between two users
- **Group Chat**: Multi-user channels with real-time messaging
- **Audio & Video Calls**: WebRTC-powered calls with camera, mic, and screen sharing
- **Live Streaming**: Host and viewer modes with live status and viewer counts

## Prerequisites

- Python 3.10+
- Node.js 20+
- pnpm or npm

## Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
```

The Django server runs at `http://localhost:8000`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173`.

## Project Structure

```
backend/            Django REST API
  api/views.py      Auth, channels, calls, streams endpoints
  api/webhooks.py   RajutechieStreamKit webhook handler
  config/           Django settings and URL routing

frontend/           React + TypeScript + Vite
  src/pages/        Login, Chat, Call, Stream pages
  src/components/   Reusable UI components
  src/contexts/     Auth context provider
  src/api.ts        Axios API client
```

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, TypeScript, Vite          |
| SDK      | @rajutechie-streamkit/react-sdk                |
| Backend  | Django 4.2, Django REST Framework   |
| Adapter  | rajutechie-streamkit-django                    |
