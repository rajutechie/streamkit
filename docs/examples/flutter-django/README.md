# RajutechieStreamKit Flutter + Django Example

A full-featured real-time communication app built with **Flutter** on the frontend
and **Django REST Framework** on the backend, powered by the **RajutechieStreamKit** platform.

Features include:

- User registration and login (JWT-based)
- Real-time 1:1 and group chat
- Audio and video calling
- Live streaming (host and viewer)

---

## Prerequisites

| Tool            | Version           |
| --------------- | ----------------- |
| Python           | 3.10+             |
| Flutter          | 3.16+             |
| Dart             | 3.2+              |
| RajutechieStreamKit account | API key + secret |

---

## Project Structure

```
flutter-django/
  backend/          # Django REST API
    api/            # Views, serializers, URL routing, webhooks
    config/         # Django settings, root URL conf
    manage.py
    requirements.txt
  app/              # Flutter mobile app
    lib/
      models/       # Data models (AppUser)
      services/     # API client, auth service
      screens/      # Login, Home, Chat, Call, Stream screens
      widgets/      # Reusable UI components
    pubspec.yaml
```

---

## Backend Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the `backend/` directory:

```env
DJANGO_SECRET_KEY=your-django-secret-key
DJANGO_DEBUG=True
RAJUTECHIE_STREAMKIT_API_KEY=sk_dev_rajutechie-streamkit_001
RAJUTECHIE_STREAMKIT_API_SECRET=your-rajutechie-streamkit-api-secret
RAJUTECHIE_STREAMKIT_WEBHOOK_SECRET=your-rajutechie-streamkit-webhook-secret
RAJUTECHIE_STREAMKIT_API_URL=https://api.rajutechie-streamkit.io/v1
```

### 4. Run the server

```bash
python manage.py runserver 0.0.0.0:8000
```

The API will be available at `http://localhost:8000/api/`.

### API Endpoints

| Method | Endpoint                          | Description              |
| ------ | --------------------------------- | ------------------------ |
| POST   | `/api/auth/register`              | Register a new user      |
| POST   | `/api/auth/login`                 | Login                    |
| GET    | `/api/users`                      | List all users           |
| GET    | `/api/channels`                   | List user channels       |
| POST   | `/api/channels/create`            | Create a channel         |
| POST   | `/api/calls`                      | Start a call             |
| GET    | `/api/calls/<id>`                 | Get call details         |
| GET    | `/api/streams`                    | List streams             |
| POST   | `/api/streams/create`             | Create a stream          |
| POST   | `/api/streams/<id>/start`         | Start (go live)          |
| POST   | `/api/streams/<id>/stop`          | Stop a stream            |

---

## Flutter App Setup

### 1. Install dependencies

```bash
cd app
flutter pub get
```

### 2. Configure the API base URL

The default base URL is `http://10.0.2.2:8000/api` which routes to
`localhost:8000` from the Android emulator. Change this in
`lib/services/api_service.dart` if you are running on a physical device
or iOS simulator:

| Platform            | Base URL                          |
| ------------------- | --------------------------------- |
| Android emulator    | `http://10.0.2.2:8000/api`        |
| iOS simulator       | `http://localhost:8000/api`        |
| Physical device     | `http://<your-ip>:8000/api`       |

### 3. Run the app

```bash
flutter run
```

---

## Usage

1. **Register** two or more users from different emulator instances (or the
   same instance by logging out and back in).
2. **Chat** -- create a direct message or group channel and send messages in
   real time.
3. **Call** -- start an audio or video call with another user.
4. **Stream** -- go live and have other users watch your stream.

---

## Architecture Notes

- **State management**: Provider (`ChangeNotifier` for auth state).
- **HTTP**: The `ApiService` class wraps the `http` package and communicates
  with the Django backend. Auth tokens are stored in `SharedPreferences`.
- **Real-time**: The RajutechieStreamKit Flutter SDK manages WebSocket connections for
  chat messages, call signaling, and stream events.
- **Theme**: Material 3 dark theme with deep purple / indigo color scheme.

---

## Troubleshooting

| Issue                             | Solution                                    |
| --------------------------------- | ------------------------------------------- |
| `Connection refused` on Android   | Use `10.0.2.2` instead of `localhost`        |
| `Connection refused` on iOS sim   | Use `localhost` or `127.0.0.1`               |
| CORS errors                       | `CORS_ALLOW_ALL_ORIGINS = True` is set       |
| RajutechieStreamKit token errors            | Verify `RAJUTECHIE_STREAMKIT_API_KEY` matches in both   |

---

## License

This example is provided as-is for demonstration purposes as part of the
RajutechieStreamKit documentation.
