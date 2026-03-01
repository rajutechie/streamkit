# Android SDK Guide

The RajutechieStreamKit Android SDK is written in Kotlin and provides native access to chat, voice/video calling, meetings, and live streaming for Android applications.

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

Add the dependency to your module-level `build.gradle.kts`:

```kotlin
dependencies {
    implementation("com.rajutechie.streamkit:rajutechie-streamkit-sdk:1.0.0")
}
```

Add the Maven repository to your project-level `settings.gradle.kts`:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.rajutechie-streamkit.io/releases")
    }
}
```

### Permissions

Add to `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

**Minimum SDK**: API 24 (Android 7.0)

---

## Initialization

Initialize RajutechieStreamKit once in your `Application` class:

```kotlin
import com.rajutechie.streamkit.RajutechieStreamKit
import com.rajutechie.streamkit.RajutechieStreamKitConfig
import com.rajutechie.streamkit.Region

class MyApp : Application() {
    override fun onCreate() {
        super.onCreate()

        RajutechieStreamKit.initialize(
            context = this,
            config = RajutechieStreamKitConfig(
                apiKey = "sk_live_xxxxx",
                region = Region.US_EAST_1
            )
        )
    }
}
```

Access the singleton instance anywhere:

```kotlin
val streamKit = RajutechieStreamKit.getInstance()
```

### Configuration Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `apiKey` | `String` | required | Your RajutechieStreamKit API key |
| `region` | `Region` | `US_EAST_1` | Server region |
| `apiUrl` | `String` | `https://api.rajutechie-streamkit.io/v1` | REST API base URL |
| `wsUrl` | `String` | `wss://ws.rajutechie-streamkit.io` | WebSocket server URL |
| `logLevel` | `LogLevel` | `WARN` | Logging verbosity |

---

## Authentication

Connect with a user token obtained from your backend:

```kotlin
import kotlinx.coroutines.launch

lifecycleScope.launch {
    val token = yourApi.getRajutechieStreamKitToken(userId)
    RajutechieStreamKit.getInstance().connect(token)
}
```

Check and monitor connection state:

```kotlin
val streamKit = RajutechieStreamKit.getInstance()

// Synchronous check
if (streamKit.isConnected) {
    // ready to use
}

// Disconnect
lifecycleScope.launch {
    streamKit.disconnect()
}
```

---

## Chat

Access chat features through `streamKit.chat`:

### Creating Channels

```kotlin
// Direct message
val dm = streamKit.chat.createChannel(
    type = "direct",
    members = listOf("user_001", "user_002")
)

// Group channel
val group = streamKit.chat.createChannel(
    type = "group",
    name = "Team Alpha",
    members = listOf("user_001", "user_002", "user_003")
)
```

### Listing Channels

```kotlin
val channels = streamKit.chat.getChannels()
channels.forEach { channel ->
    Log.d("Chat", "${channel.name} — ${channel.memberCount} members")
}
```

### Sending Messages

```kotlin
streamKit.chat.sendMessage(
    channelId = channel.id,
    text = "Hello team!"
)
```

### Observing Messages (Kotlin Flow)

```kotlin
// Collect real-time messages
lifecycleScope.launch {
    streamKit.chat.observeMessages(channelId)
        .collect { message ->
            Log.d("Chat", "${message.senderName}: ${message.text}")
        }
}
```

### Fetching Message History

```kotlin
val messages = streamKit.chat.getMessages(
    channelId = channel.id,
    limit = 50
)
```

### Typing Indicators

```kotlin
// Send typing event
streamKit.chat.sendTypingStart(channelId)

// Observe typing
lifecycleScope.launch {
    streamKit.chat.observeTyping(channelId)
        .collect { typingUsers ->
            val names = typingUsers.joinToString(", ") { it.name }
            binding.typingLabel.text = "$names typing..."
        }
}
```

### Reactions

```kotlin
streamKit.chat.addReaction(channelId, messageId, "👍")
streamKit.chat.removeReaction(channelId, messageId, "👍")
```

---

## Voice & Video Calls

Access calling through `streamKit.call`:

### Starting a Call

```kotlin
val call = streamKit.call.start(
    CallConfig(type = CallType.VIDEO, participants = listOf("user_002"))
)

// Observe call state
lifecycleScope.launch {
    call.stateFlow.collect { state ->
        when (state) {
            CallState.RINGING -> showRingingUI()
            CallState.ACTIVE -> showActiveCallUI()
            CallState.ENDED -> navigateBack()
        }
    }
}
```

### Handling Incoming Calls

```kotlin
lifecycleScope.launch {
    streamKit.call.incomingCalls.collect { incoming ->
        // Show incoming call dialog
        showIncomingCallDialog(
            callerName = incoming.callerName,
            callType = incoming.type,
            onAccept = { incoming.accept() },
            onReject = { incoming.reject() }
        )
    }
}
```

### Local Video Track

```kotlin
// Attach local video to a SurfaceViewRenderer
call.localVideoTrack.observe(this) { track ->
    track?.addSink(binding.localVideoView)
}

// Remote participants
call.remoteParticipants.observe(this) { participants ->
    participants.forEach { participant ->
        participant.videoTrack?.addSink(/* renderer */)
    }
}
```

### Media Controls

```kotlin
call.toggleAudio()   // Mute/unmute
call.toggleVideo()   // Camera on/off
call.switchCamera()  // Front/back

// Screen sharing
call.startScreenShare(activity)
call.stopScreenShare()

// End call
call.end()
```

---

## Meetings

Access meetings through `streamKit.meeting`:

### Scheduling a Meeting

```kotlin
val meeting = streamKit.meeting.schedule(
    MeetingConfig(
        title = "Sprint Review",
        scheduledAt = ZonedDateTime.now().plusHours(2),
        settings = MeetingSettings(
            waitingRoom = true,
            muteOnJoin = true,
            maxParticipants = 50
        )
    )
)

Log.d("Meeting", "Code: ${meeting.meetingCode}")
```

### Joining a Meeting

```kotlin
// By ID
streamKit.meeting.join(meetingId = meeting.id)

// By code
streamKit.meeting.joinByCode(code = "ABC-DEF-GHI")
```

### Host Controls

```kotlin
meeting.muteParticipant(userId = "user_003")
meeting.muteAll()
meeting.removeParticipant(userId = "user_003")
meeting.end()
```

### Participant Events

```kotlin
lifecycleScope.launch {
    meeting.participantEvents.collect { event ->
        when (event.action) {
            "joined" -> Log.d("Meeting", "${event.user.name} joined")
            "left" -> Log.d("Meeting", "${event.user.name} left")
        }
    }
}
```

---

## Live Streaming

Access streaming through `streamKit.stream`:

### Creating and Starting a Stream

```kotlin
val stream = streamKit.stream.create(
    title = "Live Coding Session",
    visibility = "public"
)

// Go live
streamKit.stream.start(streamId = stream.id)
```

### Watching a Stream

```kotlin
val liveStream = streamKit.stream.join(streamId = stream.id)

// Use HLS URL with ExoPlayer
val hlsUrl = liveStream.hlsUrl
```

### Browsing Active Streams

```kotlin
val streams = streamKit.stream.list(status = "live")
streams.forEach { s ->
    Log.d("Stream", "${s.title} — ${s.viewerCount} viewers")
}
```

### Stopping a Stream

```kotlin
streamKit.stream.stop(streamId = stream.id)
```

---

## Media Management

### Camera Manager

```kotlin
import com.rajutechie.streamkit.media.CameraManager

val cameraManager = CameraManager(context)

// List available cameras
val cameras = cameraManager.getAvailableCameras()

// Switch camera
cameraManager.switchCamera()
```

### Audio Manager

```kotlin
import com.rajutechie.streamkit.media.AudioManager

val audioManager = AudioManager(context)

// Route audio to speaker
audioManager.setSpeakerphone(true)

// Route to bluetooth
audioManager.setBluetoothEnabled(true)
```

---

## Error Handling

```kotlin
try {
    streamKit.chat.sendMessage(channelId = id, text = "Hello")
} catch (e: RajutechieStreamKitException) {
    Log.e("RajutechieStreamKit", "Error: ${e.message}, Code: ${e.code}")
} catch (e: Exception) {
    Log.e("RajutechieStreamKit", "Unexpected: ${e.message}")
}
```

### ProGuard Rules

If using ProGuard/R8, add to `proguard-rules.pro`:

```
-keep class com.rajutechie.streamkit.** { *; }
-keep class org.webrtc.** { *; }
```
