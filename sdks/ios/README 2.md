# RajutechieStreamKit

A modern, Swift-native SDK for real-time communication, streaming, and collaboration. Built with Swift Concurrency for seamless async/await integration.

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

1. **File** → **Add Package Dependencies**
2. Enter the repository URL: `https://github.com/yourusername/RajutechieStreamKit`
3. Select the version or branch
4. Add to your target

Or add it to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/yourusername/RajutechieStreamKit", from: "1.0.0")
]
```

## Quick Start

```swift
import RajutechieStreamKit

// 1. Configure the SDK
let config = RajutechieStreamKitConfig(
    apiKey: "your-api-key",
    region: .usEast1
)

let sdk = RajutechieStreamKit.shared.configure(config)

// 2. Connect with user token
Task {
    try await sdk.connect(token: "user-token")
    print("Connected! State: \(sdk.connectionState)")
}
```

## Usage Examples

### Chat Module

#### Create a Channel

```swift
// Create a group channel
let groupChannel = try await sdk.chat.createChannel(
    .group(name: "Team Chat", members: ["user1", "user2", "user3"])
)

// Create a direct message channel
let dmChannel = try await sdk.chat.createChannel(
    .direct(members: ["user1", "user2"])
)
```

#### Send Messages

```swift
// Send a text message
let message = try await sdk.chat.send(
    to: channelId,
    message: .text("Hello, everyone!")
)

// Send a message with attachments
let messageWithAttachment = SendMessageInput(
    text: "Check out this file",
    attachments: [
        MessageAttachment(
            type: "image",
            url: "https://example.com/image.jpg",
            filename: "image.jpg"
        )
    ]
)
let sentMessage = try await sdk.chat.send(to: channelId, message: messageWithAttachment)
```

#### Listen for Messages

```swift
sdk.chat.onMessage(in: channelId) { message in
    print("📨 New message from \(message.senderId): \(message.content.text ?? "")")
}
```

#### Typing Indicators

```swift
// Start typing
sdk.chat.startTyping(in: channelId)

// Stop typing
sdk.chat.stopTyping(in: channelId)
```

#### Message Management

```swift
// Edit a message
let editedMessage = try await sdk.chat.editMessage(
    in: channelId,
    messageId: messageId,
    text: "Updated message text"
)

// Delete a message
try await sdk.chat.deleteMessage(in: channelId, messageId: messageId)

// Add a reaction
try await sdk.chat.addReaction(in: channelId, messageId: messageId, emoji: "👍")
```

#### Retrieve Messages

```swift
// Get messages with pagination
let messages = try await sdk.chat.getMessages(
    in: channelId,
    limit: 50,
    after: lastMessageId
)
```

### Call Module

#### Start a Call

```swift
let callConfig = CallConfig(
    type: "video",
    participants: ["user1", "user2"],
    channelId: "channel-123"
)

let call = try await sdk.call.start(callConfig)
print("Call started: \(call.id)")
```

#### Accept or Reject a Call

```swift
// Accept incoming call
try await sdk.call.accept(callId)

// Reject with reason
try await sdk.call.reject(callId, reason: "Busy")
```

#### Control Media

```swift
// Toggle audio
sdk.call.toggleAudio(callId, enabled: false) // Mute
sdk.call.toggleAudio(callId, enabled: true)  // Unmute

// Toggle video
sdk.call.toggleVideo(callId, enabled: false)
sdk.call.toggleVideo(callId, enabled: true)

// Switch camera
sdk.call.switchCamera(callId)
```

#### Screen Sharing

```swift
// Start screen sharing
try await sdk.call.startScreenShare(callId)

// Stop screen sharing
try await sdk.call.stopScreenShare(callId)
```

#### Recording

```swift
// Start recording
try await sdk.call.startRecording(callId)

// Stop recording
try await sdk.call.stopRecording(callId)
```

#### Listen for Incoming Calls

```swift
Task {
    for await call in sdk.call.incomingCalls {
        print("📞 Incoming call: \(call.id) from \(call.initiatedBy)")
        // Show incoming call UI
    }
}
```

#### Call Statistics

```swift
let stats = try await sdk.call.getStats(callId)
print("Audio packets lost: \(stats.audioPacketsLost)")
print("Video packets lost: \(stats.videoPacketsLost)")
print("Round trip time: \(stats.roundTripTime)ms")
```

### Meeting Module

#### Schedule a Meeting

```swift
let meetingConfig = MeetingConfigInput(
    title: "Team Standup",
    description: "Daily standup meeting",
    scheduledAt: "2026-03-02T10:00:00Z",
    durationMins: 30
)

let meeting = try await sdk.meeting.schedule(meetingConfig)
print("Meeting code: \(meeting.meetingCode)")
```

#### Join a Meeting

```swift
// Join by meeting ID
let participant = try await sdk.meeting.join(meetingId)

// Join by meeting code
let meeting = try await sdk.meeting.joinByCode("ABC-DEF-123")
```

#### Participant Management

```swift
// Mute a participant
try await sdk.meeting.muteParticipant(meetingId, userId: "user123")

// Remove a participant
try await sdk.meeting.removeParticipant(meetingId, userId: "user123")

// Mute all participants
try await sdk.meeting.muteAll(meetingId)
```

#### Hand Raising

```swift
// Raise hand
sdk.meeting.raiseHand(meetingId)

// Lower hand
sdk.meeting.lowerHand(meetingId)
```

#### Polls

```swift
// Create a poll
let poll = try await sdk.meeting.createPoll(
    meetingId,
    question: "Ready to start?",
    options: ["Yes", "No", "Need a minute"],
    isAnonymous: false
)

// Vote on a poll
try await sdk.meeting.votePoll(meetingId, pollId: poll.id, optionId: "option-1")

// Observe poll events
Task {
    for await poll in sdk.meeting.observePolls(meetingId: meetingId) {
        print("📊 Poll update: \(poll.question)")
        for option in poll.options {
            print("  \(option.text): \(option.votes) votes")
        }
    }
}
```

#### Breakout Rooms

```swift
let rooms = [
    BreakoutRoomInput(name: "Room 1", participants: ["user1", "user2"]),
    BreakoutRoomInput(name: "Room 2", participants: ["user3", "user4"])
]

let createdRooms = try await sdk.meeting.createBreakoutRooms(meetingId, rooms: rooms)
```

#### Observe Participants

```swift
Task {
    for await participant in sdk.meeting.observeParticipants(meetingId: meetingId) {
        print("👤 Participant \(participant.userId) joined with role: \(participant.role)")
    }
}
```

#### Leave or End Meeting

```swift
// Leave meeting
try await sdk.meeting.leave(meetingId)

// End meeting (host only)
try await sdk.meeting.end(meetingId)
```

### Stream Module

#### Create a Live Stream

```swift
let stream = try await sdk.stream.create(
    title: "My Live Stream",
    visibility: "public"
)

print("Stream key: \(stream.streamKey)")
```

#### Start and Stop Streaming

```swift
// Start the stream
let activeStream = try await sdk.stream.start(streamId)
print("HLS URL: \(activeStream.hlsUrl ?? "")")
print("Viewers: \(activeStream.viewerCount)")

// Stop the stream
let stoppedStream = try await sdk.stream.stop(streamId)
```

#### Monitor Viewers

```swift
let viewerCount = try await sdk.stream.getViewerCount(streamId)
print("Current viewers: \(viewerCount)")
```

## Configuration

### Regions

RajutechieStreamKit supports multiple regions:

```swift
let config = RajutechieStreamKitConfig(
    apiKey: "your-api-key",
    region: .usEast1      // US East (default)
    // region: .usWest2    // US West
    // region: .euWest1    // Europe West
    // region: .apSoutheast1 // Asia Pacific Southeast
)
```

### Custom Endpoints

You can specify custom API and WebSocket URLs:

```swift
let config = RajutechieStreamKitConfig(
    apiKey: "your-api-key",
    region: .usEast1,
    apiUrl: "https://custom-api.example.com/v1",
    wsUrl: "wss://custom-ws.example.com"
)
```

## Connection Management

### Connect and Disconnect

```swift
// Connect
try await sdk.connect(token: "user-auth-token")

// Check connection state
print(sdk.connectionState) // .connected

// Disconnect
await sdk.disconnect()
```

### Connection States

- `.disconnected` - Not connected to the service
- `.connecting` - Connection in progress
- `.connected` - Successfully connected
- `.reconnecting` - Attempting to reconnect

## Error Handling

```swift
do {
    let message = try await sdk.chat.send(to: channelId, message: .text("Hello"))
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

## Architecture

RajutechieStreamKit is built with modern Swift practices:

- ✅ **Swift Concurrency** - Full async/await support with actors for thread safety
- ✅ **Type Safety** - Strongly-typed models and configurations
- ✅ **AsyncStream** - Real-time event streaming for calls and meetings
- ✅ **Modular Design** - Separate modules for chat, calls, meetings, and streaming
- ✅ **Actor Isolation** - Thread-safe HTTP and WebSocket clients

## Testing

The SDK includes comprehensive unit tests:

```bash
swift test
```

## Documentation

For detailed API documentation, generate DocC documentation in Xcode:

**Product** → **Build Documentation**

## Example App

Check out the example app in the `Examples/` directory for a complete implementation.

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting pull requests.

## License

RajutechieStreamKit is available under the MIT license. See the LICENSE file for more info.

## Support

- 📧 Email: support@rajutechie-streamkit.io
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/RajutechieStreamKit/issues)
- 📖 Documentation: [https://docs.rajutechie-streamkit.io](https://docs.rajutechie-streamkit.io)

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history and updates.

---

Made with ❤️ by the RajutechieStreamKit team
