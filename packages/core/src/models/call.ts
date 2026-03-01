import type { User } from './user';

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'active' | 'ended' | 'missed';

export interface Call {
  id: string;
  appId: string;
  type: CallType;
  status: CallStatus;
  initiatedBy: string;
  channelId?: string;
  recordingUrl?: string;
  recordingStatus: 'none' | 'recording' | 'processing' | 'ready';
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  endReason?: 'completed' | 'missed' | 'declined' | 'error';
  metadata: Record<string, unknown>;
}

export interface CallParticipant {
  id: string;
  callId: string;
  userId: string;
  user?: User;
  role: 'caller' | 'callee' | 'participant';
  status: 'invited' | 'ringing' | 'connected' | 'left';
  joinedAt?: string;
  leftAt?: string;
  hasAudio: boolean;
  hasVideo: boolean;
  hasScreen: boolean;
}

export interface CallConfig {
  type: CallType;
  participants: string[];
  channelId?: string;
  metadata?: Record<string, unknown>;
}

export interface CallStats {
  callId: string;
  duration: number;
  participants: number;
  audioQuality?: {
    bitrate: number;
    packetLoss: number;
    jitter: number;
  };
  videoQuality?: {
    bitrate: number;
    resolution: string;
    frameRate: number;
    packetLoss: number;
  };
}

export interface CallSignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: string;
  candidate?: RTCIceCandidateJSON;
}

interface RTCIceCandidateJSON {
  candidate: string;
  sdpMid?: string;
  sdpMLineIndex?: number;
}
