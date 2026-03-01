/** Shared TypeScript types used across the frontend. */

// -- Auth -------------------------------------------------------------------

export interface AppUser {
  id: string;
  username: string;
  display_name: string;
}

export interface AuthPayload {
  user: AppUser;
  token: string;
}

// -- Channels ---------------------------------------------------------------

export interface ChannelData {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  memberCount: number;
  lastMessageAt?: string;
  createdAt: string;
  members?: string[];
}

// -- Calls ------------------------------------------------------------------

export interface CallData {
  id: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'active' | 'ended' | 'missed';
  initiatedBy: string;
  startedAt: string;
}

// -- Streams ----------------------------------------------------------------

export interface StreamData {
  id: string;
  title: string;
  hostId: string;
  status: 'idle' | 'live' | 'ended';
  visibility: 'public' | 'private' | 'unlisted';
  hlsUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
  viewerCount: number;
  startedAt?: string;
  createdAt: string;
}

// -- Meetings ---------------------------------------------------------------

export interface MeetingParticipant {
  user_id: string;
  display_name?: string;
  role: 'host' | 'participant';
  joined_at?: string;
}

export interface MeetingData {
  id: string;
  title: string;
  host_id: string;
  host_name?: string;
  status: 'scheduled' | 'active' | 'ended';
  scheduled_at?: string;
  duration_mins: number;
  has_password: boolean;
  participant_count: number;
  participants?: MeetingParticipant[];
  started_at?: string;
  ended_at?: string;
  created_at: string;
}
