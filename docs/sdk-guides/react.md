# React SDK Guide

The RajutechieStreamKit React SDK (`@rajutechie-streamkit/react-sdk`) provides React hooks and pre-built components for integrating real-time chat, voice/video calls, meetings, and live streaming into React applications.

## Installation

```bash
npm install @rajutechie-streamkit/react-sdk
# or
yarn add @rajutechie-streamkit/react-sdk
# or
pnpm add @rajutechie-streamkit/react-sdk
```

> **Note:** The React SDK has a peer dependency on `react >= 18.0.0` and `@rajutechie-streamkit/core`. Both are installed automatically.

## Provider Setup

Wrap your application with `RajutechieStreamKitProvider` to initialize the client and manage the connection lifecycle:

```tsx
import { RajutechieStreamKitProvider } from '@rajutechie-streamkit/react-sdk';

function App() {
  const [userToken, setUserToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch a token from your backend
    fetchToken().then(setUserToken);
  }, []);

  if (!userToken) return <p>Loading...</p>;

  return (
    <RajutechieStreamKitProvider apiKey="sk_live_xxxxx" userToken={userToken}>
      <YourApp />
    </RajutechieStreamKitProvider>
  );
}
```

### Provider Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `apiKey` | `string` | Yes | Your RajutechieStreamKit project API key |
| `userToken` | `string` | No | JWT token for the current user. When provided, the SDK connects automatically. When removed, the SDK disconnects. |
| `config` | `Partial<RajutechieStreamKitConfig>` | No | Optional overrides for region, API URL, WebSocket URL, log level, auto-reconnect |
| `children` | `ReactNode` | Yes | Your application components |

The provider automatically:
- Creates a singleton `RajutechieStreamKitClient` keyed by `apiKey`
- Connects when `userToken` is set
- Disconnects when `userToken` is removed or the provider unmounts
- Tracks and exposes the current connection state

---

## Hooks Reference

### useRajutechieStreamKit()

Access the client instance and connection state from the nearest `RajutechieStreamKitProvider`.

```tsx
import { useRajutechieStreamKit } from '@rajutechie-streamkit/react-sdk';

function StatusBadge() {
  const { client, connectionState, isConnected } = useRajutechieStreamKit();

  return (
    <div>
      <span className={isConnected ? 'online' : 'offline'}>
        {isConnected ? 'Connected' : connectionState}
      </span>
    </div>
  );
}
```

**Return type:**

```typescript
interface UseRajutechieStreamKitResult {
  client: RajutechieStreamKitClient;
  connectionState: ConnectionState;  // 'connecting' | 'connected' | 'disconnected' | 'reconnecting'
  isConnected: boolean;
}
```

---

### useChat(channelId)

Hook for interacting with a RajutechieStreamKit chat channel. Automatically subscribes to the channel, fetches the initial page of messages, and listens for real-time events.

```tsx
import { useChat } from '@rajutechie-streamkit/react-sdk';

function ChatRoom({ channelId }: { channelId: string }) {
  const {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    typing,
    loading,
    error,
    loadMore,
    hasMore,
  } = useChat(channelId);

  if (loading) return <p>Loading messages...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div>
      {hasMore && <button onClick={loadMore}>Load older messages</button>}

      {messages.map((msg) => (
        <div key={msg.id}>
          <strong>{msg.senderId}</strong>: {msg.content.text}
        </div>
      ))}

      {typing.length > 0 && (
        <p>{typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...</p>
      )}

      <button onClick={() => sendMessage({ text: 'Hello!' })}>
        Send
      </button>
    </div>
  );
}
```

**Return type:**

```typescript
interface UseChatResult {
  messages: Message[];
  sendMessage: (input: MessageInput) => Promise<Message>;
  editMessage: (messageId: string, input: EditMessageInput) => Promise<Message>;
  deleteMessage: (messageId: string) => Promise<void>;
  typing: string[];          // Array of user IDs currently typing
  loading: boolean;          // Initial message load in progress
  error: Error | null;
  loadMore: () => Promise<boolean>;  // Returns false when no more pages
  hasMore: boolean;
}
```

**Behavior details:**
- Subscribes to the channel WebSocket on mount, unsubscribes on unmount
- Fetches the 25 most recent messages initially (newest-first from API, reversed for display)
- Real-time events: `message.new`, `message.updated`, `message.deleted`, `typing.start`, `typing.stop`
- Typing indicators auto-clear after 3 seconds if no `typing.stop` is received

---

### useCall(callId?)

Hook for managing a voice/video call. If a `callId` is provided, the hook fetches the call and subscribes to its events. Otherwise, use `startCall` to initiate a new call.

```tsx
import { useCall } from '@rajutechie-streamkit/react-sdk';

function CallScreen({ callId }: { callId: string }) {
  const {
    call,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    screenSharing,
    recording,
    toggleAudio,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    endCall,
    startRecording,
    stopRecording,
    error,
  } = useCall(callId);

  return (
    <div>
      {/* Local video */}
      <video
        ref={(el) => { if (el && localStream) el.srcObject = localStream; }}
        autoPlay
        muted
        playsInline
      />

      {/* Remote videos */}
      {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
        <video
          key={userId}
          ref={(el) => { if (el) el.srcObject = stream; }}
          autoPlay
          playsInline
        />
      ))}

      {/* Controls */}
      <button onClick={toggleAudio}>
        {audioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={toggleVideo}>
        {videoEnabled ? 'Camera Off' : 'Camera On'}
      </button>
      <button onClick={screenSharing ? stopScreenShare : startScreenShare}>
        {screenSharing ? 'Stop Share' : 'Share Screen'}
      </button>
      <button onClick={endCall}>End Call</button>
    </div>
  );
}
```

**Return type:**

```typescript
interface UseCallResult {
  call: Call | null;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  recording: boolean;
  toggleAudio: () => void;
  toggleVideo: () => void;
  switchCamera: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => void;
  endCall: () => Promise<void>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  startCall: (config: CallConfig) => Promise<Call>;
  acceptCall: (callId: string) => Promise<void>;
  rejectCall: (callId: string, reason?: string) => Promise<void>;
  error: Error | null;
}
```

**Initiating a call (without an existing callId):**

```tsx
function CallStarter() {
  const { startCall, call } = useCall();

  const handleCall = async () => {
    const newCall = await startCall({
      type: 'video',
      participants: ['user-2'],
    });
    console.log('Call started:', newCall.id);
  };

  return <button onClick={handleCall}>Start Video Call</button>;
}
```

**Handling incoming calls:**

```tsx
function IncomingCallHandler() {
  const { client } = useRajutechieStreamKit();
  const { acceptCall, rejectCall } = useCall();
  const [incoming, setIncoming] = useState<Call | null>(null);

  useEffect(() => {
    const unsub = client.on('call.incoming', (call) => {
      setIncoming(call);
    });
    return unsub;
  }, [client]);

  if (!incoming) return null;

  return (
    <div>
      <p>Incoming {incoming.type} call</p>
      <button onClick={() => acceptCall(incoming.id)}>Accept</button>
      <button onClick={() => rejectCall(incoming.id, 'Busy')}>Reject</button>
    </div>
  );
}
```

---

### useMeeting(meetingId)

Hook for managing participation in a RajutechieStreamKit meeting. Automatically joins the meeting, acquires local media, subscribes to real-time events, and leaves on unmount.

```tsx
import { useMeeting } from '@rajutechie-streamkit/react-sdk';

function MeetingRoom({ meetingId }: { meetingId: string }) {
  const {
    meeting,
    participants,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    handRaised,
    polls,
    raiseHand,
    lowerHand,
    toggleAudio,
    toggleVideo,
    leave,
    loading,
    error,
  } = useMeeting(meetingId);

  if (loading) return <p>Joining meeting...</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!meeting) return null;

  return (
    <div>
      <h2>{meeting.title}</h2>
      <p>{participants.length} participants</p>

      <button onClick={toggleAudio}>
        {audioEnabled ? 'Mute' : 'Unmute'}
      </button>
      <button onClick={toggleVideo}>
        {videoEnabled ? 'Camera Off' : 'Camera On'}
      </button>
      <button onClick={handRaised ? lowerHand : raiseHand}>
        {handRaised ? 'Lower Hand' : 'Raise Hand'}
      </button>
      <button onClick={leave}>Leave Meeting</button>

      {polls.map((poll) => (
        <div key={poll.id}>
          <strong>{poll.question}</strong>
          {/* render poll options */}
        </div>
      ))}
    </div>
  );
}
```

**Return type:**

```typescript
interface UseMeetingResult {
  meeting: Meeting | null;
  participants: MeetingParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  handRaised: boolean;
  polls: MeetingPoll[];
  raiseHand: () => void;
  lowerHand: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  leave: () => Promise<void>;
  loading: boolean;
  error: Error | null;
}
```

---

### usePresence(userIds)

Hook that subscribes to presence updates for a set of user IDs. Returns a `Map` that is kept up to date as `presence.changed` events arrive.

```tsx
import { usePresence } from '@rajutechie-streamkit/react-sdk';

function OnlineIndicator({ userId }: { userId: string }) {
  const presenceMap = usePresence([userId]);
  const status = presenceMap.get(userId);

  return (
    <span className={status?.status === 'online' ? 'green' : 'gray'}>
      {status?.status ?? 'offline'}
    </span>
  );
}

function MemberList({ memberIds }: { memberIds: string[] }) {
  const presenceMap = usePresence(memberIds);

  return (
    <ul>
      {memberIds.map((id) => {
        const status = presenceMap.get(id);
        return (
          <li key={id}>
            {id} - {status?.status ?? 'offline'}
            {status?.lastSeen && ` (last seen: ${status.lastSeen})`}
          </li>
        );
      })}
    </ul>
  );
}
```

**Return type:** `Map<string, PresenceStatus>`

> **Note:** The hook stabilizes the `userIds` array internally. It only re-subscribes when the actual set of IDs changes, not on every render.

---

## Built-in Components

### MessageList

Renders a scrollable list of messages with automatic scroll-to-bottom behavior.

```tsx
import { MessageList } from '@rajutechie-streamkit/react-sdk';

<MessageList
  messages={messages}
  currentUserId="user-1"
  onLoadMore={loadMore}
  hasMore={hasMore}
  loading={loading}
  renderMessage={(message) => (
    <div className="custom-message">
      <strong>{message.senderId}</strong>
      <p>{message.content.text}</p>
    </div>
  )}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `messages` | `Message[]` | Array of messages to display |
| `currentUserId` | `string` | ID of the current user (for alignment) |
| `onLoadMore` | `() => Promise<boolean>` | Callback to load older messages |
| `hasMore` | `boolean` | Whether older messages are available |
| `loading` | `boolean` | Show loading state |
| `renderMessage` | `(message: Message) => ReactNode` | Custom message renderer |
| `className` | `string` | CSS class for the container |

### VideoGrid

Displays participant video streams in a responsive grid layout.

```tsx
import { VideoGrid } from '@rajutechie-streamkit/react-sdk';

<VideoGrid
  localStream={localStream}
  remoteStreams={remoteStreams}
  layout="grid"
  showLabels={true}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `localStream` | `MediaStream \| null` | The local user's media stream |
| `remoteStreams` | `Map<string, MediaStream>` | Remote participant streams |
| `layout` | `'grid' \| 'spotlight' \| 'sidebar'` | Layout mode |
| `showLabels` | `boolean` | Show participant name labels |
| `className` | `string` | CSS class for the container |

### CallControls

Renders a toolbar of call control buttons (mute, camera, screen share, end call).

```tsx
import { CallControls } from '@rajutechie-streamkit/react-sdk';

<CallControls
  audioEnabled={audioEnabled}
  videoEnabled={videoEnabled}
  screenSharing={screenSharing}
  recording={recording}
  onToggleAudio={toggleAudio}
  onToggleVideo={toggleVideo}
  onToggleScreenShare={screenSharing ? stopScreenShare : startScreenShare}
  onEndCall={endCall}
  onToggleRecording={recording ? stopRecording : startRecording}
/>
```

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `audioEnabled` | `boolean` | Current audio state |
| `videoEnabled` | `boolean` | Current video state |
| `screenSharing` | `boolean` | Current screen share state |
| `recording` | `boolean` | Current recording state |
| `onToggleAudio` | `() => void` | Audio toggle callback |
| `onToggleVideo` | `() => void` | Video toggle callback |
| `onToggleScreenShare` | `() => void` | Screen share toggle callback |
| `onEndCall` | `() => void` | End call callback |
| `onToggleRecording` | `() => void` | Recording toggle callback |
| `className` | `string` | CSS class for the container |

---

## Full Example: Chat + Call Application

```tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  RajutechieStreamKitProvider,
  useRajutechieStreamKit,
  useChat,
  useCall,
  MessageList,
  VideoGrid,
  CallControls,
} from '@rajutechie-streamkit/react-sdk';

function ChatWithCalling({ channelId }: { channelId: string }) {
  const { isConnected } = useRajutechieStreamKit();
  const {
    messages, sendMessage, typing, loading, loadMore, hasMore,
  } = useChat(channelId);
  const {
    call, localStream, remoteStreams,
    audioEnabled, videoEnabled, screenSharing,
    toggleAudio, toggleVideo, startScreenShare, stopScreenShare,
    startCall, endCall, acceptCall, rejectCall,
  } = useCall();
  const [text, setText] = useState('');

  const handleSend = useCallback(async () => {
    if (!text.trim()) return;
    await sendMessage({ text });
    setText('');
  }, [text, sendMessage]);

  if (!isConnected) return <p>Connecting...</p>;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <MessageList
          messages={messages}
          currentUserId="current-user"
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
        />

        {typing.length > 0 && (
          <p style={{ padding: '4px 12px', color: '#888' }}>
            {typing.join(', ')} typing...
          </p>
        )}

        <div style={{ display: 'flex', padding: 8 }}>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            style={{ flex: 1, marginRight: 8 }}
          />
          <button onClick={handleSend}>Send</button>
          <button
            onClick={() => startCall({ type: 'video', participants: [] })}
            style={{ marginLeft: 8 }}
          >
            Video Call
          </button>
        </div>
      </div>

      {/* Call Panel (visible when call is active) */}
      {call && (
        <div style={{ width: 400, borderLeft: '1px solid #ccc' }}>
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            layout="grid"
          />
          <CallControls
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            screenSharing={screenSharing}
            recording={false}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={
              screenSharing ? stopScreenShare : startScreenShare
            }
            onEndCall={endCall}
          />
        </div>
      )}
    </div>
  );
}

// Root
export default function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/rajutechie-streamkit/token')
      .then((r) => r.json())
      .then((data) => setToken(data.token));
  }, []);

  if (!token) return <p>Authenticating...</p>;

  return (
    <RajutechieStreamKitProvider apiKey="sk_live_xxxxx" userToken={token}>
      <ChatWithCalling channelId="general" />
    </RajutechieStreamKitProvider>
  );
}
```

---

## TypeScript Support

All hooks, components, and types are fully typed. Import types directly:

```typescript
import type {
  Message,
  MessageInput,
  Channel,
  Call,
  CallConfig,
  Meeting,
  MeetingParticipant,
  ConnectionState,
  PresenceStatus,
} from '@rajutechie-streamkit/react-sdk';
```

---

## Tips

- **Always wrap your app** with `RajutechieStreamKitProvider` at the top level. All hooks throw an error if used outside the provider.
- **Token management:** Pass `userToken` as a prop to the provider. When the token changes (refresh), the provider automatically reconnects.
- **Cleanup is automatic:** Hooks unsubscribe from events and leave channels/meetings when the component unmounts.
- **Error boundaries:** Use React error boundaries to catch rendering errors. Hook-level errors are returned via the `error` property.
