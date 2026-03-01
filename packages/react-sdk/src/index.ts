/**
 * @rajutechie-streamkit/react-sdk
 *
 * React hooks and components for building real-time communication
 * experiences with RajutechieStreamKit.
 */

// Provider
export { RajutechieStreamKitProvider, useRajutechieStreamKitClient } from './provider';
export type { RajutechieStreamKitProviderProps } from './provider';

// Hooks
export { useRajutechieStreamKit } from './hooks/useRajutechieStreamKit';
export { useChat } from './hooks/useChat';
export { useCall } from './hooks/useCall';
export { usePresence } from './hooks/usePresence';
export { useMeeting } from './hooks/useMeeting';

// Components
export { MessageList } from './components/MessageList';
export type { MessageListProps } from './components/MessageList';

export { MessageInput } from './components/MessageInput';
export type { MessageInputProps } from './components/MessageInput';

export { ChannelList } from './components/ChannelList';
export type { ChannelListProps } from './components/ChannelList';

export { VideoGrid } from './components/VideoGrid';
export type { VideoGridProps, VideoStreamEntry } from './components/VideoGrid';

export { CallControls } from './components/CallControls';
export type { CallControlsProps } from './components/CallControls';

export { ParticipantList } from './components/ParticipantList';
export type { ParticipantListProps } from './components/ParticipantList';

// Re-export core types for convenience
export type {
  RajutechieStreamKitConfig,
  ConnectionState,
  RajutechieStreamKitEventName,
  RajutechieStreamKitEvents,
  Message,
  MessageInput,
  Channel,
  ChannelType,
  Call,
  CallType,
  CallParticipant,
  Meeting,
  MeetingParticipant,
  MeetingPoll,
  PresenceStatus,
  User,
  PaginatedResult,
  PaginationOptions,
} from '@rajutechie-streamkit/core';
