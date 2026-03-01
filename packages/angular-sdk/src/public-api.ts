/**
 * @rajutechie-streamkit/angular-sdk
 *
 * Public API surface of the Angular SDK for RajutechieStreamKit.
 *
 * Import from `@rajutechie-streamkit/angular-sdk` to access the module, services,
 * and re-exported core types.
 */

// ── Module ──
export { RajutechieStreamKitModule, RAJUTECHIE_STREAMKIT_CONFIG } from './lib/rajutechie-streamkit.module';

// ── Services ──
export { RajutechieStreamKitService } from './lib/services/rajutechie-streamkit.service';
export { RajutechieStreamKitChatService } from './lib/services/chat.service';
export { RajutechieStreamKitCallService } from './lib/services/call.service';
export { RajutechieStreamKitMeetingService } from './lib/services/meeting.service';

// ── Re-export core types that Angular consumers will need ──
export type {
  RajutechieStreamKitConfig,
  ConnectionState,
  // Chat
  Message,
  MessageInput,
  EditMessageInput,
  TypingEvent,
  ReactionEvent,
  Channel,
  ChannelConfig,
  ChannelMember,
  ChannelType,
  // Calls
  Call,
  CallConfig,
  CallParticipant,
  CallType,
  CallStatus,
  CallStats,
  // Meetings
  Meeting,
  MeetingConfig,
  UpdateMeetingInput,
  MeetingParticipant,
  MeetingPoll,
  CreatePollInput,
  MeetingStatus,
  MeetingSettings,
  BreakoutRoom,
  CreateBreakoutRoomsInput,
  // Users / Presence
  User,
  PresenceStatus,
  // Pagination
  PaginatedResult,
  PaginationOptions,
} from '@rajutechie-streamkit/core';
