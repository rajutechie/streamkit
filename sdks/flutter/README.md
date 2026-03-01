# Rajutechie StreamKit — Flutter SDK

Flutter SDK for the [Rajutechie StreamKit](https://github.com/rajutechie/streamkit) self-hosted real-time communication platform.

## Features

- 💬 **Chat** — channels, messages, reactions, read receipts, real-time events
- 📹 **Video Calls** — 1-on-1 and group calls via mediasoup WebRTC SFU
- 🎙 **Meetings** — scheduled meetings with participant management, raise-hand, mute controls
- 📡 **Live Streaming** — HLS + RTMP ingest (OBS compatible), viewer analytics
- 🟢 **Presence** — online/away/busy/offline status with real-time updates
- 🧩 **Widgets** — drop-in `VideoGrid`, `MessageList`, and `CallControls` widgets

## Installation

Add to your `pubspec.yaml`:

```yaml
dependencies:
  rajutechie_streamkit: ^0.1.0
```

## Quick Start

```dart
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

// Initialise the client
final client = RajutechieStreamKitClient(
  apiKey: 'sk_live_your_api_key',
  baseUrl: 'https://your-streamkit-domain.com',
);

await client.connect(userToken: 'your_user_token');

// Send a message
await client.chat.sendMessage(
  channelId: 'general',
  text: 'Hello, StreamKit!',
);

// Start a video call
final call = await client.calls.startCall(
  targetUserId: 'user_456',
  type: CallType.video,
);

// Listen to incoming calls
client.calls.incomingCalls.listen((call) {
  print('Incoming call from ${call.callerId}');
});
```

## Widgets

```dart
// Drop-in video grid for calls/meetings
VideoGrid(participants: call.participants)

// Real-time message list
MessageList(channelId: 'general', client: client)

// Call control bar (mute, camera, end)
CallControls(call: call)
```

## Requirements

- Flutter >= 3.16.0
- Dart >= 3.2.0
- A running [StreamKit](https://github.com/rajutechie/streamkit) backend

## License

MIT — see [LICENSE](LICENSE)
