import type { User } from './user';

export type MeetingStatus = 'scheduled' | 'active' | 'ended' | 'cancelled';

export interface MeetingSettings {
  waitingRoom: boolean;
  allowScreenShare: boolean;
  muteOnJoin: boolean;
  recordingAutoStart: boolean;
  maxParticipants: number;
  breakoutRoomsEnabled: boolean;
  chatEnabled: boolean;
  raiseHandEnabled: boolean;
  pollingEnabled: boolean;
}

export interface Meeting {
  id: string;
  appId: string;
  title: string;
  description?: string;
  hostId: string;
  meetingCode: string;
  password?: string;
  scheduledAt?: string;
  durationMins: number;
  status: MeetingStatus;
  settings: MeetingSettings;
  recordingUrl?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
}

export interface MeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  user?: User;
  role: 'host' | 'co_host' | 'attendee';
  status: 'invited' | 'waiting' | 'joined' | 'left' | 'removed';
  joinedAt?: string;
  leftAt?: string;
  isMuted: boolean;
  hasVideo: boolean;
  handRaised: boolean;
  breakoutRoom?: string;
}

export interface MeetingConfig {
  title: string;
  description?: string;
  password?: string;
  scheduledAt?: string;
  durationMins?: number;
  settings?: Partial<MeetingSettings>;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  password?: string;
  scheduledAt?: string;
  durationMins?: number;
  settings?: Partial<MeetingSettings>;
}

export interface MeetingPoll {
  id: string;
  meetingId: string;
  question: string;
  options: PollOption[];
  isAnonymous: boolean;
  isActive: boolean;
  results: Record<string, number>;
  createdBy?: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
}

export interface CreatePollInput {
  question: string;
  options: string[];
  isAnonymous?: boolean;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  participants: string[];
}

export interface CreateBreakoutRoomsInput {
  rooms: { name: string; participants?: string[] }[];
}
