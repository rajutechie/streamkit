# Flutter SDK Guide

The RajutechieStreamKit Flutter SDK provides native Dart access to chat, calling, meetings, and live streaming. It works on Android, iOS, web, and desktop platforms.

---

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Authentication](#authentication)
- [Chat](#chat)
- [Voice & Video Calls](#voice--video-calls)
- [Meetings](#meetings)
- [Live Streaming](#live-streaming)
- [Widgets](#widgets)
- [Connection State](#connection-state)
- [Error Handling](#error-handling)

---

## Installation

Add RajutechieStreamKit to your `pubspec.yaml`:

```yaml
dependencies:
  rajutechie_streamkit: ^1.0.0
```

Then run:

```bash
flutter pub get
```

### Platform Configuration

**Android** — Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

**iOS** — Add to `ios/Runner/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Camera access is needed for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is needed for audio calls</string>
```

---

## Initialization

```dart
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

final client = RajutechieStreamKitClient(
  apiKey: 'sk_live_xxxxx',
  apiUrl: 'https://your-streamkit-domain.com',
  wsUrl:  'wss://your-streamkit-domain.com',
);
```

### Configuration Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | `String` | Your RajutechieStreamKit API key (**required**) |
| `apiUrl` | `String` | REST API URL of your self-hosted instance (**required**) |
| `wsUrl` | `String` | WebSocket URL of your self-hosted instance (**required**) |

---

## Authentication

After obtaining a user token from your backend, connect the client:

```dart
// Get token from your backend
final token = await yourApi.getRajutechieStreamKitToken(userId);

// Connect to RajutechieStreamKit
await client.connect(token);

// Check connection
print(client.isConnected); // true
```

To disconnect:

```dart
await client.disconnect();
```

### Listening for Connection State Changes

```dart
client.connectionState.listen((state) {
  switch (state) {
    case ConnectionState.connecting:
      print('Connecting...');
    case ConnectionState.connected:
      print('Connected');
    case ConnectionState.disconnected:
      print('Disconnected');
    case ConnectionState.reconnecting:
      print('Reconnecting...');
  }
});
```

---

## Chat

Access chat features through `client.chat`:

### Creating Channels

```dart
// Direct message
final dm = await client.chat.createChannel(
  type: 'direct',
  members: ['user_001', 'user_002'],
);

// Group channel
final group = await client.chat.createChannel(
  type: 'group',
  name: 'Team Alpha',
  members: ['user_001', 'user_002', 'user_003'],
);
```

### Listing Channels

```dart
final channels = await client.chat.getChannels();
for (final channel in channels) {
  print('${channel.name} — ${channel.memberCount} members');
}
```

### Sending Messages

```dart
// Text message
await client.chat.sendMessage(
  channelId: channel.id,
  text: 'Hello team!',
);

// Message with attachment
await client.chat.sendMessage(
  channelId: channel.id,
  text: 'Check this out',
  attachments: [
    Attachment(type: 'image', url: imageUrl),
  ],
);
```

### Listening for Messages (Stream)

```dart
// Real-time message stream
client.chat.messagesStream(channelId).listen((message) {
  print('${message.senderName}: ${message.text}');
});
```

### Fetching Message History

```dart
final messages = await client.chat.getMessages(
  channelId: channel.id,
  limit: 50,
);
```

### Typing Indicators

```dart
// Send typing start
client.chat.sendTypingStart(channelId);

// Listen for typing events
client.chat.typingStream(channelId).listen((typingUsers) {
  if (typingUsers.isNotEmpty) {
    print('${typingUsers.map((u) => u.name).join(", ")} typing...');
  }
});
```

### Reactions

```dart
await client.chat.addReaction(
  channelId: channelId,
  messageId: messageId,
  emoji: '👍',
);

await client.chat.removeReaction(
  channelId: channelId,
  messageId: messageId,
  emoji: '👍',
);
```

### Read Receipts

```dart
await client.chat.markAsRead(channelId: channelId, messageId: messageId);
```

---

## Voice & Video Calls

Access calling through `client.call`:

### Starting a Call

```dart
final call = await client.call.startCall(
  type: 'video', // or 'audio'
  participants: ['user_002'],
);

// Listen for call state changes
call.stateStream.listen((state) {
  print('Call state: $state'); // ringing, active, ended
});
```

### Handling Incoming Calls

```dart
client.call.onIncomingCall.listen((incomingCall) {
  // Show UI prompt
  showDialog(
    context: context,
    builder: (_) => AlertDialog(
      title: Text('Incoming ${incomingCall.type} call'),
      content: Text('From: ${incomingCall.callerId}'),
      actions: [
        TextButton(
          onPressed: () => incomingCall.reject(),
          child: Text('Decline'),
        ),
        ElevatedButton(
          onPressed: () => incomingCall.accept(),
          child: Text('Accept'),
        ),
      ],
    ),
  );
});
```

### Media Controls

```dart
// Toggle audio
await call.toggleAudio();
print(call.isAudioEnabled);

// Toggle video
await call.toggleVideo();
print(call.isVideoEnabled);

// Switch camera
await call.switchCamera();

// Screen sharing
await call.startScreenShare();
await call.stopScreenShare();
```

### Call Statistics

```dart
final stats = await call.getStats();
print('Duration: ${stats.duration}s, bitrate: ${stats.bitrate} bps');
```

### Call Events (Real-time)

```dart
call.callEvents.listen((event) {
  switch (event.type) {
    case 'participant.joined':
      print('${event.userId} joined');
    case 'recording.started':
      showRecordingBadge();
  }
});
```

### Ending a Call

```dart
await call.end();
```

---

## Meetings

Access meetings through `client.meeting`:

### Scheduling a Meeting

```dart
final meeting = await client.meeting.schedule(
  title: 'Sprint Review',
  scheduledAt: DateTime.now().add(Duration(hours: 2)),
  settings: MeetingSettings(
    waitingRoom: true,
    muteOnJoin: true,
    maxParticipants: 50,
  ),
);

print('Meeting code: ${meeting.meetingCode}');
```

### Joining a Meeting

```dart
// Join by meeting ID
await client.meeting.join(meetingId: meeting.id);

// Join by meeting code
await client.meeting.joinByCode(code: 'ABC-DEF-GHI');
```

### Updating and Cancelling

```dart
// Update meeting details
await client.meeting.update(
  meetingId: meeting.id,
  title: 'Updated Sprint Review',
);

// Cancel a meeting
await client.meeting.cancel(meetingId: meeting.id);
```

### Meeting Controls (Host)

```dart
// Mute a participant
await meeting.muteParticipant(userId: 'user_003');

// Mute all
await meeting.muteAll();

// Remove a participant
await meeting.removeParticipant(userId: 'user_003');

// End meeting
await meeting.end();
```

### Screen Sharing in Meetings

```dart
await meeting.startScreenShare();
await meeting.stopScreenShare();
```

### Participant Events (Real-time)

```dart
// Participant left events
meeting.participantLeftEvents.listen((event) {
  print('${event.userId} left the meeting');
});
```

### Polls

```dart
// Create a poll (host only)
final poll = await meeting.createPoll(
  question: 'Which date works best?',
  options: ['Monday', 'Wednesday', 'Friday'],
  anonymous: false,
);

// Vote on a poll
await meeting.votePoll(pollId: poll.id, optionId: 'opt-0');

// Real-time poll results
meeting.pollResultEvents.listen((poll) {
  print('Poll results updated: ${poll.question}');
});

// Observe all active polls
meeting.pollEvents.listen((polls) {
  setState(() => _polls = polls);
});
```

### Breakout Rooms

```dart
final rooms = await meeting.createBreakoutRooms(
  count: 3,
  assignAutomatically: true,
);
print('Created ${rooms.length} breakout rooms');
```

### Hand Raise Events

```dart
meeting.handEvents.listen((event) {
  print('${event.userId} raised hand');
});
```

---

## Live Streaming

Access live streaming through `client.stream`:

### Creating a Stream

```dart
final stream = await client.stream.create(
  title: 'Live Coding Session',
  visibility: 'public', // or 'private', 'unlisted'
);
```

### Going Live (Host)

```dart
await client.stream.start(streamId: stream.id);
```

### Watching a Stream (Viewer)

```dart
final liveStream = await client.stream.join(streamId: stream.id);

// Get HLS URL for playback
print(liveStream.hlsUrl);

// Viewer count updates
liveStream.viewerCountStream.listen((count) {
  print('Viewers: $count');
});
```

### Browsing Active Streams

```dart
final streams = await client.stream.list(status: 'live');
for (final s in streams) {
  print('${s.title} — ${s.viewerCount} viewers');
}
```

### Stopping a Stream

```dart
await client.stream.stop(streamId: stream.id);
```

---

## Widgets

RajutechieStreamKit Flutter SDK includes pre-built widgets for common UI patterns.

### MessageList

Renders a scrollable, real-time updating message list:

```dart
import 'package:rajutechie_streamkit/rajutechie_streamkit.dart';

MessageList(
  channelId: 'ch_abc123',
  client: client,
  onMessageTap: (message) {
    // Handle message tap
  },
)
```

### VideoGrid

Displays local and remote video streams in a grid layout:

```dart
VideoGrid(
  localStream: call.localStream,
  remoteStreams: call.remoteStreams,
  layout: VideoGridLayout.auto, // auto, grid, spotlight
)
```

### CallControls

Standard call control bar with mute, video, screen share, and end call buttons:

```dart
CallControls(
  audioEnabled: call.isAudioEnabled,
  videoEnabled: call.isVideoEnabled,
  screenSharing: call.isScreenSharing,
  onToggleAudio: () => call.toggleAudio(),
  onToggleVideo: () => call.toggleVideo(),
  onToggleScreenShare: () => call.toggleScreenShare(),
  onEndCall: () => call.end(),
)
```

---

## Connection State

Monitor and react to connection state changes using Dart streams:

```dart
// Stream-based
client.connectionState.listen((state) {
  // Update UI based on state
});

// Synchronous check
if (client.isConnected) {
  // perform action
}
```

---

## Error Handling

RajutechieStreamKit operations throw `RajutechieStreamKitApiException` on failure:

```dart
try {
  await client.chat.sendMessage(channelId: id, text: 'Hello');
} on RajutechieStreamKitApiException catch (e) {
  print('API Error: ${e.message} (status: ${e.statusCode})');
} catch (e) {
  print('Unexpected error: $e');
}
```

### Cleanup

Always dispose the client when your app shuts down:

```dart
client.dispose();
```

This closes the WebSocket connection, stops all streams, and removes the cached instance.
