# React Native SDK Guide

The RajutechieStreamKit React Native SDK (`@rajutechie-streamkit/react-native-sdk`) extends the React SDK with native platform capabilities for building real-time chat, voice/video calls, meetings, and live streaming into iOS and Android applications.

## Installation

```bash
npm install @rajutechie-streamkit/react-native-sdk
# or
yarn add @rajutechie-streamkit/react-native-sdk
```

### iOS Setup

Install native dependencies via CocoaPods:

```bash
npx pod-install
```

### Android Setup

No additional steps are required for Android. The SDK auto-links its native modules.

> **Minimum Requirements:**
> - iOS 14.0+
> - Android SDK 24+ (Android 7.0)
> - React Native 0.72+

---

## Platform-Specific Configuration

### iOS Permissions

Add the following keys to your `ios/<YourApp>/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>RajutechieStreamKit needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>RajutechieStreamKit needs microphone access for voice and video calls</string>
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>voip</string>
    <string>remote-notification</string>
</array>
```

### Android Permissions

Add these permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PROJECTION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- For push notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

## Provider Setup

The provider setup is identical to the React SDK:

```tsx
import { RajutechieStreamKitProvider } from '@rajutechie-streamkit/react-native-sdk';

function App() {
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    fetchToken().then(setUserToken);
  }, []);

  if (!userToken) return <ActivityIndicator />;

  return (
    <RajutechieStreamKitProvider apiKey="sk_live_xxxxx" userToken={userToken}>
      <NavigationContainer>
        <MainNavigator />
      </NavigationContainer>
    </RajutechieStreamKitProvider>
  );
}
```

---

## Hooks

The React Native SDK re-exports all hooks from the React SDK with identical APIs:

| Hook | Description |
|------|-------------|
| `useRajutechieStreamKit()` | Access client instance and connection state |
| `useChat(channelId)` | Messages, typing indicators, send/edit/delete |
| `useCall(callId?)` | Call operations, media streams, controls |
| `useMeeting(meetingId)` | Meeting operations, participants, polls |
| `usePresence(userIds)` | Online status tracking |
| `useNativeChat(channelId)` | Native-optimized chat with paginated history and real-time events |
| `useNativeMeeting(meetingId)` | Native meeting with WebRTC media, polls, and participant management |

See the [React SDK Guide](./react.md) for the base hook documentation.

### `useNativeChat`

A native-first chat hook that uses React Native's FlatList-compatible patterns and exposes paginated message loading:

```tsx
import { useNativeChat } from '@rajutechie-streamkit/react-native-sdk';

function NativeChatRoom({ channelId }: { channelId: string }) {
  const {
    messages,       // Message[] (newest first for FlatList inverted)
    sendMessage,    // (input: MessageInput) => Promise<void>
    loadMore,       // () => Promise<void> — paginate older messages
    hasMore,        // boolean
    loading,        // boolean — initial load
    typing,         // string[] — IDs of users currently typing
    deleteMessage,  // (messageId: string) => Promise<void>
  } = useNativeChat(channelId);

  return (
    <FlatList
      data={messages}
      inverted
      keyExtractor={(m) => m.id}
      onEndReached={() => hasMore && loadMore()}
      renderItem={({ item }) => <MessageBubble message={item} />}
    />
  );
}
```

### `useNativeMeeting`

A native meeting hook that wraps `react-native-webrtc` for media management and exposes meeting controls:

```tsx
import { useNativeMeeting } from '@rajutechie-streamkit/react-native-sdk';

function NativeMeetingRoom({ meetingId }: { meetingId: string }) {
  const {
    meeting,             // Meeting | null
    participants,        // MeetingParticipant[]
    localStream,         // MediaStream | null (from react-native-webrtc)
    remoteStreams,        // Map<userId, MediaStream>
    join,                // (displayName: string) => Promise<void>
    leave,               // () => Promise<void>
    toggleAudio,         // () => void
    toggleVideo,         // () => void
    flipCamera,          // () => void
    muteParticipant,     // (userId: string) => Promise<void>
    polls,               // MeetingPoll[]
    createPoll,          // (input) => Promise<MeetingPoll>
    votePoll,            // (pollId, optionId) => Promise<void>
  } = useNativeMeeting(meetingId);

  useEffect(() => {
    join('Alice');
    return () => { leave(); };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {localStream && (
        <VideoView stream={localStream} mirror style={{ width: 120, height: 160 }} />
      )}
      {[...remoteStreams.entries()].map(([userId, stream]) => (
        <VideoView key={userId} stream={stream} style={{ flex: 1 }} />
      ))}
    </View>
  );
}
```

### Additional React Native Hooks

```tsx
import { usePermissions } from '@rajutechie-streamkit/react-native-sdk';

function CallSetup() {
  const { cameraGranted, micGranted, requestPermissions } = usePermissions();

  const handleStartCall = async () => {
    if (!cameraGranted || !micGranted) {
      const result = await requestPermissions(['camera', 'microphone']);
      if (!result.allGranted) {
        Alert.alert('Permissions Required', 'Camera and microphone are needed for video calls.');
        return;
      }
    }
    // proceed with call
  };

  return <Button title="Start Call" onPress={handleStartCall} />;
}
```

---

## Native Features

### Push Notifications

Configure push notifications for incoming calls and messages when the app is in the background.

**Firebase Cloud Messaging (Android):**

```tsx
import { RajutechieStreamKitNotifications } from '@rajutechie-streamkit/react-native-sdk';
import messaging from '@react-native-firebase/messaging';

// Register device token
useEffect(() => {
  const registerToken = async () => {
    const fcmToken = await messaging().getToken();
    await RajutechieStreamKitNotifications.registerDevice({
      token: fcmToken,
      platform: 'android',
      provider: 'fcm',
    });
  };
  registerToken();
}, []);

// Handle background notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  RajutechieStreamKitNotifications.handleBackgroundMessage(remoteMessage);
});
```

**Apple Push Notification Service (iOS):**

```tsx
import { RajutechieStreamKitNotifications } from '@rajutechie-streamkit/react-native-sdk';
import { requestNotifications } from 'react-native-permissions';

useEffect(() => {
  const registerForPush = async () => {
    const { status } = await requestNotifications(['alert', 'sound', 'badge']);
    if (status === 'granted') {
      const apnsToken = await RajutechieStreamKitNotifications.getAPNSToken();
      await RajutechieStreamKitNotifications.registerDevice({
        token: apnsToken,
        platform: 'ios',
        provider: 'apns',
      });
    }
  };
  registerForPush();
}, []);
```

### Background Audio

The SDK automatically manages audio sessions to keep calls alive when the app is backgrounded. Ensure you have added `audio` and `voip` to `UIBackgroundModes` in your `Info.plist` (see iOS Permissions above).

```tsx
import { AudioSession } from '@rajutechie-streamkit/react-native-sdk';

// Configure audio session for a call
await AudioSession.configure({
  category: 'playAndRecord',
  mode: 'voiceChat',
  options: ['defaultToSpeaker', 'allowBluetooth'],
});

// Switch to speaker
await AudioSession.setOutputToSpeaker(true);

// Reset when call ends
await AudioSession.reset();
```

### Camera and Microphone Permissions

The SDK provides a unified permissions API:

```tsx
import { Permissions } from '@rajutechie-streamkit/react-native-sdk';

// Check current permission status
const cameraStatus = await Permissions.check('camera');
const micStatus = await Permissions.check('microphone');

// Request permissions
const result = await Permissions.request('camera');
if (result === 'granted') {
  console.log('Camera access granted');
} else if (result === 'denied') {
  console.log('Camera access denied');
} else if (result === 'blocked') {
  // User has permanently blocked access; direct them to settings
  await Permissions.openSettings();
}
```

---

## Native Components

### VideoView

A native video rendering component optimized for mobile performance. Uses platform-native rendering (SurfaceView on Android, RTCMTLVideoView on iOS).

```tsx
import { VideoView } from '@rajutechie-streamkit/react-native-sdk';

function VideoParticipant({ stream, mirror }: { stream: MediaStream; mirror: boolean }) {
  return (
    <VideoView
      stream={stream}
      mirror={mirror}
      objectFit="cover"
      style={{ width: 200, height: 300, borderRadius: 12 }}
    />
  );
}
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `stream` | `MediaStream` | - | The media stream to render |
| `mirror` | `boolean` | `false` | Mirror the video (for front camera) |
| `objectFit` | `'cover' \| 'contain'` | `'cover'` | How the video fills the container |
| `style` | `ViewStyle` | - | Standard React Native styles |
| `zOrder` | `number` | `0` | Z-order for overlapping videos |

### CallScreen

A pre-built, full-screen call UI with video grid, controls, and participant management.

```tsx
import { CallScreen } from '@rajutechie-streamkit/react-native-sdk';

function ActiveCall({ callId }: { callId: string }) {
  return (
    <CallScreen
      callId={callId}
      onCallEnded={() => navigation.goBack()}
      showParticipantCount={true}
      showCallDuration={true}
      theme={{
        backgroundColor: '#1a1a1a',
        controlBarColor: '#2d2d2d',
        activeColor: '#4CAF50',
        dangerColor: '#f44336',
      }}
    />
  );
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `callId` | `string` | ID of the call to display |
| `onCallEnded` | `() => void` | Callback when the call ends |
| `showParticipantCount` | `boolean` | Show participant count badge |
| `showCallDuration` | `boolean` | Show call duration timer |
| `theme` | `CallScreenTheme` | Custom theme colors |

### ChatScreen

A pre-built chat UI with message list, input bar, and typing indicators.

```tsx
import { ChatScreen } from '@rajutechie-streamkit/react-native-sdk';

function ChatView({ channelId }: { channelId: string }) {
  return (
    <ChatScreen
      channelId={channelId}
      currentUserId="user-1"
      onPressAttachment={() => showImagePicker()}
      onPressCall={() => navigation.navigate('Call')}
      theme={{
        sentBubbleColor: '#007AFF',
        receivedBubbleColor: '#E5E5EA',
        inputBackgroundColor: '#F2F2F7',
      }}
    />
  );
}
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `channelId` | `string` | Channel to display |
| `currentUserId` | `string` | ID of the current user |
| `onPressAttachment` | `() => void` | Attachment button callback |
| `onPressCall` | `() => void` | Call button callback |
| `theme` | `ChatScreenTheme` | Custom theme colors |
| `renderMessage` | `(message: Message) => ReactNode` | Custom message renderer |

---

## Full Example: Chat Application

```tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  RajutechieStreamKitProvider,
  useRajutechieStreamKit,
  useChat,
} from '@rajutechie-streamkit/react-native-sdk';

function ChatRoom({ channelId }: { channelId: string }) {
  const { isConnected } = useRajutechieStreamKit();
  const { messages, sendMessage, typing, loading, loadMore, hasMore } = useChat(channelId);
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage({ text });
    setText('');
  };

  if (!isConnected) return <ActivityIndicator style={styles.center} />;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {loading ? (
        <ActivityIndicator style={styles.center} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted={false}
          onEndReached={() => hasMore && loadMore()}
          renderItem={({ item }) => (
            <View style={styles.messageBubble}>
              <Text style={styles.sender}>{item.senderId}</Text>
              <Text>{item.content.text}</Text>
            </View>
          )}
        />
      )}

      {typing.length > 0 && (
        <Text style={styles.typing}>{typing.join(', ')} typing...</Text>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type a message..."
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageBubble: {
    marginHorizontal: 16, marginVertical: 4,
    padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8,
  },
  sender: { fontWeight: 'bold', marginBottom: 2 },
  typing: { paddingHorizontal: 16, color: '#888', fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, height: 40 },
  sendButton: { marginLeft: 8, justifyContent: 'center', paddingHorizontal: 16 },
  sendText: { color: '#007AFF', fontWeight: '600' },
});

export default function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://your-server.com/api/rajutechie-streamkit/token')
      .then((r) => r.json())
      .then((data) => setToken(data.token));
  }, []);

  if (!token) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <RajutechieStreamKitProvider apiKey="sk_live_xxxxx" userToken={token}>
      <ChatRoom channelId="general" />
    </RajutechieStreamKitProvider>
  );
}
```

---

## Differences from the React SDK

| Feature | React SDK | React Native SDK |
|---------|-----------|-----------------|
| Video rendering | HTML `<video>` elements | Native `VideoView` component |
| Screen sharing | `getDisplayMedia()` | System broadcast extension (iOS) / MediaProjection (Android) |
| Push notifications | Not supported | FCM (Android) and APNs (iOS) |
| Background audio | Not applicable | Managed audio sessions |
| Camera switching | `switchCamera()` | `switchCamera()` with native camera API |
| Permissions | Browser permission prompts | Native permission dialogs + settings redirect |
| Pre-built screens | Basic components | `CallScreen` and `ChatScreen` with native feel |

---

## Troubleshooting

**Build fails on iOS after installation:**
Make sure you ran `npx pod-install` and cleaned your build folder:
```bash
cd ios && pod install && cd ..
npx react-native start --reset-cache
```

**Camera/mic not working on Android emulator:**
The Android emulator has limited camera support. Test on a physical device for reliable media behavior.

**Push notifications not received:**
Verify your FCM/APNs credentials in the RajutechieStreamKit dashboard and ensure the device token is registered via `RajutechieStreamKitNotifications.registerDevice()`.
