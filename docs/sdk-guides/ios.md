# iOS SDK Guide

The RajutechieStreamKit iOS SDK is written in Swift and provides native access to chat, voice/video calling, meetings, and live streaming for iOS, iPadOS, and macOS applications.

---

## Table of Contents

- [Installation](#installation)
- [Initialization](#initialization)
- [Authentication](#authentication)
- [Chat](#chat)
- [Voice & Video Calls](#voice--video-calls)
- [Meetings](#meetings)
- [Live Streaming](#live-streaming)
- [Media Management](#media-management)
- [Error Handling](#error-handling)

---

## Installation

### Swift Package Manager (Recommended)

Add RajutechieStreamKit via Xcode:

1. **File > Add Package Dependencies...**
2. Enter the repository URL: `https://github.com/rajutechie/streamkit`
3. Set the version rule to **Up to Next Major Version: 1.0.0**
4. Add `RajutechieStreamKit` to your target

Or add to `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/rajutechie/streamkit", from: "1.0.0")
]
```

### CocoaPods

```ruby
pod 'RajutechieStreamKit', '~> 1.0'
```

### Info.plist

Add required privacy descriptions:

```xml
<key>NSCameraUsageDescription</key>
<string>RajutechieStreamKit needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>RajutechieStreamKit needs microphone access for audio calls</string>
```

**Minimum deployment target**: iOS 15.0

---

## Initialization

Configure the shared singleton:

```swift
import RajutechieStreamKit

let config = RajutechieStreamKitConfig(
    apiKey: "sk_live_xxxxx",
    apiUrl: "https://your-streamkit-domain.com",
    wsUrl:  "wss://your-streamkit-domain.com"
)

let client = RajutechieStreamKit.shared.configure(config)
```

### Configuration Options

| Parameter | Type | Description |
|-----------|------|-------------|
| `apiKey` | `String` | Your RajutechieStreamKit API key (**required**) |
| `apiUrl` | `String` | REST API URL of your self-hosted instance (**required**) |
| `wsUrl` | `String` | WebSocket URL of your self-hosted instance (**required**) |

---

## Authentication

Connect with a user token from your backend:

```swift
let token = try await yourAPI.getRajutechieStreamKitToken(userId: userId)
try await client.connect(token: token)
```

Monitor connection state:

```swift
// Connection state enum
public enum ConnectionState {
    case connecting, connected, disconnected, reconnecting
}

// Check current state
print(client.connectionState) // .connected

// Disconnect
await client.disconnect()
```

---

## Chat

Access chat through `client.chat`:

### Creating Channels

```swift
// Direct message
let dm = try await client.chat.createChannel(
    .direct(members: ["user_001", "user_002"])
)

// Group channel
let group = try await client.chat.createChannel(
    .group(name: "Team Alpha", members: ["user_001", "user_002", "user_003"])
)
```

### Listing Channels

```swift
let channels = try await client.chat.getChannels()
for channel in channels {
    print("\(channel.name ?? "DM") — \(channel.memberCount) members")
}
```

### Sending Messages

```swift
// Text message
try await client.chat.send(
    to: channel.id,
    message: .text("Hello team!")
)

// Message with attachment
try await client.chat.send(
    to: channel.id,
    message: .text("Check this out", attachments: [
        .image(url: imageURL)
    ])
)
```

### Listening for Messages

```swift
// Closure-based
client.chat.onMessage(in: channelId) { message in
    print("\(message.sender.name): \(message.content.text ?? "")")
}

// Async stream (Swift concurrency)
for await message in client.chat.messages(in: channelId) {
    print("\(message.sender.name): \(message.content.text ?? "")")
}
```

### Fetching Message History

```swift
let messages = try await client.chat.getMessages(
    in: channelId,
    limit: 50
)
```

### Typing Indicators

```swift
// Send typing
client.chat.sendTypingStart(in: channelId)

// Listen for typing
client.chat.onTyping(in: channelId) { typingUsers in
    let names = typingUsers.map(\.name).joined(separator: ", ")
    print("\(names) typing...")
}
```

### Reactions

```swift
try await client.chat.addReaction(to: messageId, in: channelId, emoji: "👍")
try await client.chat.removeReaction(from: messageId, in: channelId, emoji: "👍")
```

### Read Receipts

```swift
try await client.chat.markAsRead(in: channelId, messageId: messageId)
```

---

## Voice & Video Calls

Access calling through `client.call`:

### Starting a Call

```swift
let call = try await client.call.start(
    .video(participants: ["user_002"])
)
```

### Handling Incoming Calls

Use `incomingCalls`, an `AsyncStream<Call>`, to observe incoming calls:

```swift
Task {
    for await incomingCall in client.call.incomingCalls {
        // Present call UI
        let accepted = await showIncomingCallAlert(
            caller: incomingCall.callerName,
            type: incomingCall.type
        )
        if accepted {
            try await incomingCall.accept()
        } else {
            try await incomingCall.reject()
        }
    }
}
```

### Call State

```swift
// Observe call state changes
call.onStateChange { state in
    switch state {
    case .ringing:
        showRingingUI()
    case .active:
        showActiveCallUI()
    case .ended(let reason):
        showEndedUI(reason: reason)
    }
}
```

### Media Controls

```swift
// Toggle audio
try await call.toggleAudio()
print(call.isAudioEnabled)

// Toggle video
try await call.toggleVideo()
print(call.isVideoEnabled)

// Switch camera (front / back)
try await call.switchCamera()

// Screen sharing
try await call.startScreenShare()
try await call.stopScreenShare()

// End call
try await call.end()
```

### Call Statistics

```swift
let stats: CallStats = try await call.getStats()
print("Duration: \(stats.duration)s, bitrate: \(stats.bitrate) bps")
```

### Rendering Video

```swift
import SwiftUI

struct CallView: View {
    @ObservedObject var call: ActiveCall

    var body: some View {
        ZStack {
            // Remote video
            ForEach(call.remoteParticipants) { participant in
                VideoView(track: participant.videoTrack)
            }

            // Local video (picture-in-picture)
            VideoView(track: call.localVideoTrack)
                .frame(width: 120, height: 160)
                .cornerRadius(12)
        }
    }
}
```

---

## Meetings

Access meetings through `client.meeting`:

### Scheduling a Meeting

```swift
let meeting = try await client.meeting.schedule(
    MeetingConfig(title: "Sprint Review", scheduledAt: meetingDate)
        .waitingRoom(true)
        .muteOnJoin(true)
        .maxParticipants(50)
)

print("Meeting code: \(meeting.meetingCode)")
```

### Joining a Meeting

```swift
// By ID
try await client.meeting.join(meetingId: meeting.id)

// By code
try await client.meeting.join(code: "ABC-DEF-GHI")
```

### Host Controls

```swift
try await meeting.muteParticipant(userId: "user_003")
try await meeting.muteAll()
try await meeting.removeParticipant(userId: "user_003")
try await meeting.end()
```

### Observing Participants (Real-time)

Use `observeParticipants(meetingId:)`, an `AsyncStream<[MeetingParticipant]>`, to get live participant updates:

```swift
Task {
    for await participants in client.meeting.observeParticipants(meetingId: meeting.id) {
        updateParticipantList(participants)
    }
}
```

### Polls

```swift
// Create a poll (host only)
let poll = try await meeting.createPoll(
    question: "Which date works best?",
    options: [
        PollOption(id: "opt-1", text: "Monday"),
        PollOption(id: "opt-2", text: "Wednesday"),
    ],
    anonymous: false
)

// Vote on a poll
try await meeting.votePoll(pollId: poll.id, optionId: "opt-1")

// Observe poll updates in real time
Task {
    for await polls in client.meeting.observePolls(meetingId: meeting.id) {
        updatePollsUI(polls)
    }
}
```

### Breakout Rooms

```swift
let rooms = try await meeting.createBreakoutRooms(
    count: 3,
    assignAutomatically: true
)
print("Created \(rooms.count) breakout rooms")
```

---

## Live Streaming

Access streaming through `client.stream`:

### Creating and Starting a Stream

```swift
let stream = try await client.stream.create(
    title: "Live Coding Session",
    visibility: .public
)

// Go live
try await client.stream.start(streamId: stream.id)
```

### Watching a Stream

```swift
let liveStream = try await client.stream.join(streamId: stream.id)

// Use HLS URL with AVPlayer
if let hlsURL = URL(string: liveStream.hlsUrl) {
    let player = AVPlayer(url: hlsURL)
    player.play()
}
```

### Browsing Active Streams

```swift
let streams = try await client.stream.list(status: "live")
for s in streams {
    print("\(s.title) — \(s.viewerCount) viewers")
}
```

### Stopping a Stream

```swift
try await client.stream.stop(streamId: stream.id)
```

---

## Media Management

### Camera Manager

```swift
import RajutechieStreamKit

let cameraManager = CameraManager()

// List available cameras
let cameras = cameraManager.availableCameras

// Switch between front and back
cameraManager.switchCamera()

// Set preferred resolution
cameraManager.setPreferredResolution(.hd1080)
```

### Audio Manager

```swift
let audioManager = AudioManager()

// Route audio to speaker
audioManager.setSpeakerphone(true)

// Available audio routes
let routes = audioManager.availableRoutes
```

---

## Error Handling

RajutechieStreamKit uses Swift's native error handling:

```swift
do {
    try await client.chat.send(to: channelId, message: .text("Hello"))
} catch let error as RajutechieStreamKitError {
    switch error {
    case .unauthorized:
        // Token expired, re-authenticate
        break
    case .notFound(let resource):
        print("Resource not found: \(resource)")
    case .rateLimited(let retryAfter):
        print("Rate limited, retry after \(retryAfter)s")
    case .serverError(let message):
        print("Server error: \(message)")
    case .networkError(let underlying):
        print("Network error: \(underlying.localizedDescription)")
    }
} catch {
    print("Unexpected error: \(error)")
}
```
