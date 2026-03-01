/** Application-level types shared across components. */

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface AuthState {
  user: AppUser | null;
  authToken: string | null;
  rajutechieStreamKitToken: string | null;
}

export interface ChannelInfo {
  id: string;
  type: 'direct' | 'group';
  name: string;
  memberCount: number;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  members?: string[];
}

export interface CallInfo {
  id: string;
  type: 'audio' | 'video';
  status: string;
  initiatedBy: string;
  participants: string[];
  startedAt: string;
}

export interface StreamInfo {
  id: string;
  title: string;
  hostId: string;
  streamKey: string;
  status: 'idle' | 'live' | 'ended';
  visibility: string;
  viewerCount: number;
  peakViewers: number;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface ApiResult<T> {
  success: boolean;
  data: T;
  error?: string;
}

// -- Meetings ---------------------------------------------------------------

export interface MeetingParticipant {
  userId: string;
  role: 'host' | 'participant';
  joinedAt?: string;
}

export interface MeetingInfo {
  id: string;
  title: string;
  status: 'scheduled' | 'active' | 'ended';
  scheduledAt?: string;
  durationMins: number;
  hasPassword: boolean;
  participantCount: number;
  participants?: MeetingParticipant[];
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}
