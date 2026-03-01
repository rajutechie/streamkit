/**
 * @rajutechie-streamkit/react-native-sdk
 *
 * React Native SDK for RajutechieStreamKit - provides native media, push notifications,
 * permission helpers, hooks, and components tailored for iOS and Android.
 */

// ── Re-export core types consumers will need ──
export type {
  RajutechieStreamKitClient,
  RajutechieStreamKitConfig,
  Call,
  CallConfig,
  CallParticipant,
  CallType,
  CallStatus,
  Message,
  MessageInput,
  Meeting,
  MeetingConfig,
  MeetingParticipant,
  Channel,
  ChannelConfig,
  TypingEvent,
  ConnectionState,
} from '@rajutechie-streamkit/core';

// ── Native media ──
export {
  getNativeMediaStream,
  switchCamera,
  releaseStream,
} from './native/media';
export type { NativeMediaConstraints } from './native/media';

// ── Notifications ──
export {
  registerForPushNotifications,
  handleNotification,
  dispatchNotification,
  getRegisteredToken,
  clearNotificationHandlers,
} from './native/notifications';
export type {
  PushProvider,
  PushNotificationPayload,
  NotificationHandler,
} from './native/notifications';

// ── Permissions ──
export {
  requestCameraPermission,
  requestMicPermission,
  requestNotificationPermission,
  requestMediaPermissions,
} from './native/permissions';
export type { PermissionResult } from './native/permissions';

// ── Hooks ──
export {
  useRajutechieStreamKitConnection,
  useNativeCall,
  useNativeChat,
  useNativeMeeting,
} from './hooks';
export type {
  NativeCallState,
  NativeCallActions,
  NativeChatState,
  NativeChatActions,
  NativeMeetingState,
  NativeMeetingActions,
} from './hooks';

// ── Components ──
export { VideoView } from './components/VideoView';
export type { VideoViewProps, VideoObjectFit } from './components/VideoView';
