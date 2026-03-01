# RajutechieStreamKit

A modern Swift SDK for real-time communication, streaming, and collaboration built for iOS and macOS.

## Features

- 💬 **Chat** - Real-time messaging with channels, reactions, and typing indicators
- 📞 **Calls** - Video/audio calling with screen sharing and recording
- 👥 **Meetings** - Virtual meetings with polls, breakout rooms, and participant management
- 📺 **Live Streaming** - HLS streaming with viewer analytics

## Requirements

- iOS 15.0+ / macOS 13.0+
- Swift 5.9+
- Xcode 15.0+

## Installation

### Swift Package Manager

Add RajutechieStreamKit to your project via Xcode:

1. Go to **File** > **Add Package Dependencies**
2. Enter the repository URL: `https://github.com/yourusername/RajutechieStreamKit`
3. Select the version you want to use
4. Add to your target

Or add it to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/yourusername/RajutechieStreamKit", from: "1.0.0")
]
```

Then add `"RajutechieStreamKit"` to your target dependencies:

```swift
.target(
    name: "YourTarget",
    dependencies: ["RajutechieStreamKit"]
)
```

## Quick Start

```swift
import RajutechieStreamKit

// Configure the SDK
let config = RajutechieStreamKitConfig(
    apiKey: "your-api-key",
    region: .usEast1
)

let sdk = RajutechieStreamKit.shared.configure(config)

// Connect with user token
Task {
    try await sdk.connect(token: "user-token")
    
    // SDK is ready to use!
    print("Connection state: \(sdk.connectionState)")
}
```

## Usage

### Chat Module

Create channels, send messages, and listen for real-time updates:

```swift
// Create a group channel
let channel = try await sdk.chat.createChannel(
    .group(name: "Team Chat", members: ["user1", "user2", "user3"])
)

// Send a message
let message = try await sdk.chat.send(
    to: channel.id,
    message: .text("Hello, team!")
)

// Listen for new messages
sdk.chat.onMessage(in: channel.id) { message in
    print("New message from \(message.senderId): \(message.content.text ?? "")")
}

// Add a reaction
try await sdk.chat.addReaction(
    in: channel.id,
    messageId: message.id,
    emoji: "👍"
)

// Start typing indicator
sdk.chat.startTyping(in: channel.id)

// Stop typing indicator
sdk.chat.stopTyping(in: channel.id)

// Get message history
let messages = try await sdk.chat.getMessages(
    in: channel.id,
    limit: 50
)

// Edit a message
let edited = try await sdk.chat.editMessage(
    in: channel.id,
    messageId: message.id,
    text: "Updated message"
)

// Delete a message
try await sdk.chat.deleteMessage(
    in: channel.id,
    messageId: message.id
)
```

### Call Module

Start video/audio calls with advanced features:

```swift
// Start a video call
let call = try await sdk.call.start(
    CallConfig(
        type: "video",
        participants: ["user1", "user2"]
    )
)

// Accept an incoming call
try await sdk.call.accept(call.id)

// Reject a call
try await sdk.call.reject(call.id, reason: "Busy")

// Toggle audio
sdk.call.toggleAudio(call.id, enabled: false)

// Toggle video
sdk.call.toggleVideo(call.id, enabled: true)

// Switch camera (front/back)
sdk.call.switchCamera(call.id)

// Start screen sharing
try await sdk.call.startScreenShare(call.id)

// Stop screen sharing
try await sdk.call.stopScreenShare(call.id)

// Start recording
try await sdk.call.startRecording(call.id)

// Stop recording
try await sdk.call.stopRecording(call.id)

// Get call statistics
let stats = try await sdk.call.getStats(call.id)
print("Bitrate: \(stats.bitrate), RTT: \(stats.roundTripTime)")

// End the call
try await sdk.call.end(call.id)

// Listen for incoming calls
for await call in sdk.call.incomingCalls {
    print("Incoming call: \(call.id)")
}
```

### Meeting Module

Host virtual meetings with advanced collaboration features:

```swift
// Schedule a meeting
let meeting = try await sdk.meeting.schedule(
    MeetingConfigInput(
        title: "Team Standup",
        description: "Daily standup meeting",
        scheduledAt: "2026-03-02T10:00:00Z",
        durationMins: 30
    )
)

// Join a meeting by ID
let participant = try await sdk.meeting.join(meeting.id)

// Join by meeting code
let joinedMeeting = try await sdk.meeting.joinByCode("ABC-123-DEF")

// Mute a participant (host only)
try await sdk.meeting.muteParticipant(meeting.id, userId: "user1")

// Mute all participants (host only)
try await sdk.meeting.muteAll(meeting.id)

// Remove a participant (host only)
try await sdk.meeting.removeParticipant(meeting.id, userId: "user2")

// Raise hand
sdk.meeting.raiseHand(meeting.id)

// Lower hand
sdk.meeting.lowerHand(meeting.id)

// Create a poll
let poll = try await sdk.meeting.createPoll(
    meeting.id,
    question: "Are we ready to start?",
    options: ["Yes", "No", "Need a minute"],
    isAnonymous: true
)

// Vote on a poll
try await sdk.meeting.votePoll(
    meeting.id,
    pollId: poll.id,
    optionId: "option-1"
)

// Create breakout rooms
let rooms = try await sdk.meeting.createBreakoutRooms(
    meeting.id,
    rooms: [
        BreakoutRoomInput(name: "Room 1", participants: ["user1", "user2"]),
        BreakoutRoomInput(name: "Room 2", participants: ["user3", "user4"])
    ]
)

// Observe participant events
for await participant in sdk.meeting.observeParticipants(meetingId: meeting.id) {
    print("Participant \(participant.userId) joined")
}

// Observe poll events
for await poll in sdk.meeting.observePolls(meetingId: meeting.id) {
    print("Poll: \(poll.question)")
}

// Leave the meeting
try await sdk.meeting.leave(meeting.id)

// End the meeting (host only)
try await sdk.meeting.end(meeting.id)
```

### Stream Module

Create and manage live streams:

```swift
// Create a live stream
let stream = try await sdk.stream.create(
    title: "My First Stream",
    visibility: "public"
)

print("Stream key: \(stream.streamKey)")

// Start the stream
let activeStream = try await sdk.stream.start(stream.id)

if let hlsUrl = activeStream.hlsUrl {
    print("Watch at: \(hlsUrl)")
}

// Get current viewer count
let viewerCount = try await sdk.stream.getViewerCount(stream.id)
print("Current viewers: \(viewerCount)")

// Stop the stream
let stoppedStream = try await sdk.stream.stop(stream.id)
```

## Advanced Configuration

### Custom API Endpoints

```swift
let config = RajutechieStreamKitConfig(
    apiKey: "your-api-key",
    region: .usEast1,
    apiUrl: "https://custom-api.example.com/v1",
    wsUrl: "wss://custom-ws.example.com"
)
```

### Connection Management

```swift
// Check connection state
switch sdk.connectionState {
case .connecting:
    print("Connecting...")
case .connected:
    print("Connected!")
case .disconnected:
    print("Disconnected")
case .reconnecting:
    print("Reconnecting...")
}

// Disconnect
await sdk.disconnect()

// Reconnect
try await sdk.connect(token: "new-token")
```

## Error Handling

```swift
do {
    let message = try await sdk.chat.send(
        to: channelId,
        message: .text("Hello!")
    )
} catch RajutechieStreamKitError.invalidURL(let url) {
    print("Invalid URL: \(url)")
} catch RajutechieStreamKitError.apiError(let statusCode, let body) {
    print("API Error \(statusCode): \(body ?? "")")
} catch RajutechieStreamKitError.networkError(let error) {
    print("Network error: \(error)")
} catch {
    print("Unknown error: \(error)")
}
```

## Sample App

Check out the [example app](./Examples) to see RajutechieStreamKit in action.

## Documentation

For detailed API documentation, visit our [documentation site](https://docs.rajutechie-streamkit.io).

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

RajutechieStreamKit is available under the MIT license. See the [LICENSE](LICENSE) file for more info.

## Support

- 📧 Email: support@rajutechie-streamkit.io
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/RajutechieStreamKit/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/RajutechieStreamKit/discussions)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

---

Made with ❤️ by the RajutechieStreamKit team
