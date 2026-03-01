// Client
export { RajutechieStreamKitClient } from './client';
export type { RajutechieStreamKitConfig } from './client';

// Modules
export { ChatModule } from './modules/chat';
export { CallModule } from './modules/call';
export { MeetingModule } from './modules/meeting';
export { LiveStreamModule } from './modules/stream';
export type { LiveStream, LiveStreamSettings, CreateStreamInput } from './modules/stream';

// Models
export type {
  User, UserDevice, CreateUserInput, UpdateUserInput,
  RegisterDeviceInput, PresenceStatus,
} from './models/user';
export type {
  Channel, ChannelMember, ChannelConfig, ChannelSettings,
  ChannelType, UpdateChannelInput, AddMemberInput, UpdateMemberInput, ChannelListOptions,
} from './models/channel';
export type {
  Message, MessageInput, EditMessageInput, Attachment, Reaction,
  ReadReceipt, MessageType, MessageSearchOptions, TypingEvent, ReactionEvent,
} from './models/message';
export type {
  Call, CallConfig, CallParticipant, CallType, CallStatus, CallStats, CallSignalData,
} from './models/call';
export type {
  Meeting, MeetingConfig, UpdateMeetingInput, MeetingParticipant,
  MeetingPoll, PollOption, CreatePollInput, MeetingStatus, MeetingSettings,
  BreakoutRoom, CreateBreakoutRoomsInput,
} from './models/meeting';

// Events
export { TypedEventEmitter } from './events/emitter';
export type { Unsubscribe } from './events/emitter';
export type {
  RajutechieStreamKitEvents, RajutechieStreamKitEventName, ConnectionState, WebSocketMessage,
} from './events/types';

// Transport
export { HttpClient } from './transport/http';
export type { HttpClientConfig, HttpResponse } from './transport/http';
export { WebSocketManager } from './transport/websocket';
export type { WebSocketConfig } from './transport/websocket';
export { RetryPolicy } from './transport/retry';
export type { RetryConfig } from './transport/retry';

// Auth
export { TokenManager } from './auth/token-manager';
export type { TokenRefreshFn } from './auth/token-manager';
export { decodeJwt, isTokenExpired, getTokenExpiresIn } from './auth/jwt';
export type { JwtPayload } from './auth/jwt';

// Media
export { SignalingClient } from './media/signaling';
export type { SignalingConfig, TransportParams, ProducerParams, ConsumerParams } from './media/signaling';
export { DeviceManager } from './media/webrtc';
export type { MediaConstraints, MediaDeviceInfo } from './media/webrtc';

// Utils
export { Logger, LogLevel, defaultLogger } from './utils/logger';
export type { LoggerConfig, LogHandler } from './utils/logger';
export {
  RajutechieStreamKitError, AuthError, NetworkError, ValidationError, ApiError,
  RajutechieStreamKitErrorCode, isRetryableError,
} from './utils/errors';
export type { PaginationOptions, PaginatedResult, CursorPagination } from './utils/pagination';
export { paginationToParams, clampPageSize, emptyPage, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './utils/pagination';
