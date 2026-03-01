import type { Message, TypingEvent, ReactionEvent, ReadReceipt } from '../models/message';
import type { Channel, ChannelMember } from '../models/channel';
import type { Call, CallParticipant } from '../models/call';
import type { Meeting, MeetingParticipant, MeetingPoll } from '../models/meeting';
import type { PresenceStatus } from '../models/user';

export interface RajutechieStreamKitEvents {
  // Connection
  'connection.changed': { state: ConnectionState };
  'connection.error': { error: Error };

  // Chat - Messages
  'message.new': Message;
  'message.updated': Message;
  'message.deleted': { channelId: string; messageId: string };
  'message.reaction': ReactionEvent;
  'message.read': ReadReceipt & { channelId: string; messageId: string };

  // Chat - Typing
  'typing.start': TypingEvent;
  'typing.stop': TypingEvent;

  // Chat - Channels
  'channel.created': Channel;
  'channel.updated': Channel;
  'channel.deleted': { channelId: string };
  'channel.member.added': ChannelMember;
  'channel.member.removed': { channelId: string; userId: string };
  'channel.member.updated': ChannelMember;

  // Presence
  'presence.changed': PresenceStatus;

  // Calls
  'call.incoming': Call & { participants: CallParticipant[] };
  'call.accepted': { callId: string; userId: string };
  'call.rejected': { callId: string; userId: string; reason?: string };
  'call.ended': { callId: string; reason: string };
  'call.participant.joined': CallParticipant;
  'call.participant.left': { callId: string; userId: string };
  'call.recording.started': { callId: string };
  'call.recording.stopped': { callId: string; recordingUrl?: string };

  // Meetings
  'meeting.started': Meeting;
  'meeting.ended': { meetingId: string };
  'meeting.participant.joined': MeetingParticipant;
  'meeting.participant.left': { meetingId: string; userId: string };
  'meeting.participant.muted': { meetingId: string; userId: string };
  'meeting.hand.raised': { meetingId: string; userId: string };
  'meeting.hand.lowered': { meetingId: string; userId: string };
  'meeting.poll.created': MeetingPoll;
  'meeting.poll.result': MeetingPoll;

  // Live Streams
  'stream.started': { streamId: string; hlsUrl?: string };
  'stream.ended': { streamId: string };
  'stream.viewer.count': { streamId: string; count: number };

  // Notifications
  'notification': { type: string; title: string; body: string; data?: Record<string, unknown> };

  // Errors
  'error': { code: string; message: string; metadata?: Record<string, unknown> };
}

export type RajutechieStreamKitEventName = keyof RajutechieStreamKitEvents;

export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketMessage {
  type: string;
  id: string;
  timestamp: string;
  data: unknown;
}
