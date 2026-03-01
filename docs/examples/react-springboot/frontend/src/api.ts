import axios from 'axios';
import type {
  ApiResult,
  AppUser,
  ChannelInfo,
  CallInfo,
  MeetingInfo,
  StreamInfo,
} from './types';

/**
 * Axios instance configured for the backend API.
 * The JWT token is injected via a request interceptor.
 */
const client = axios.create({
  baseURL: 'http://localhost:8080/api',
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth interceptor ────────────────────────────────────────────

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

client.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear auth state
      authToken = null;
      localStorage.removeItem('rajutechie_streamkit_auth');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Auth endpoints ──────────────────────────────────────────────

interface AuthResponse {
  user: AppUser;
  authToken: string;
  rajutechieStreamKitToken: string;
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await client.post<ApiResult<AuthResponse>>('/auth/login', {
    username,
    password,
  });
  if (!data.success) throw new Error(data.error ?? 'Login failed');
  return data.data;
}

export async function register(
  username: string,
  password: string,
  displayName?: string
): Promise<AuthResponse> {
  const { data } = await client.post<ApiResult<AuthResponse>>(
    '/auth/register',
    { username, password, displayName }
  );
  if (!data.success) throw new Error(data.error ?? 'Registration failed');
  return data.data;
}

export async function getUsers(): Promise<AppUser[]> {
  const { data } = await client.get<ApiResult<AppUser[]>>('/auth/users');
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch users');
  return data.data;
}

// ── Channel endpoints ───────────────────────────────────────────

export async function createChannel(
  type: string,
  members: string[],
  name?: string
): Promise<ChannelInfo> {
  const { data } = await client.post<ApiResult<ChannelInfo>>('/channels', {
    type,
    members,
    name,
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to create channel');
  return data.data;
}

export async function getChannels(): Promise<ChannelInfo[]> {
  const { data } = await client.get<ApiResult<ChannelInfo[]>>('/channels');
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch channels');
  return data.data;
}

// ── Call endpoints ──────────────────────────────────────────────

export async function createCall(
  type: string,
  participants: string[]
): Promise<CallInfo> {
  const { data } = await client.post<ApiResult<CallInfo>>('/calls', {
    type,
    participants,
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to create call');
  return data.data;
}

export async function getCall(callId: string): Promise<CallInfo> {
  const { data } = await client.get<ApiResult<CallInfo>>(`/calls/${callId}`);
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch call');
  return data.data;
}

export async function getCalls(): Promise<CallInfo[]> {
  const { data } = await client.get<ApiResult<CallInfo[]>>('/calls');
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch calls');
  return data.data;
}

// ── Stream endpoints ────────────────────────────────────────────

export async function createStream(
  title: string,
  visibility?: string
): Promise<StreamInfo> {
  const { data } = await client.post<ApiResult<StreamInfo>>('/streams', {
    title,
    visibility,
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to create stream');
  return data.data;
}

export async function getStreams(status?: string): Promise<StreamInfo[]> {
  const params = status ? { status } : {};
  const { data } = await client.get<ApiResult<StreamInfo[]>>('/streams', {
    params,
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch streams');
  return data.data;
}

export async function startStream(streamId: string): Promise<StreamInfo> {
  const { data } = await client.post<ApiResult<StreamInfo>>(
    `/streams/${streamId}/start`
  );
  if (!data.success) throw new Error(data.error ?? 'Failed to start stream');
  return data.data;
}

export async function stopStream(streamId: string): Promise<StreamInfo> {
  const { data } = await client.post<ApiResult<StreamInfo>>(
    `/streams/${streamId}/stop`
  );
  if (!data.success) throw new Error(data.error ?? 'Failed to stop stream');
  return data.data;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function createMeeting(
  title: string,
  durationMins = 60,
  password?: string,
): Promise<MeetingInfo> {
  const { data } = await client.post<ApiResult<MeetingInfo>>('/meetings', {
    title,
    durationMins,
    ...(password ? { password } : {}),
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to create meeting');
  return data.data;
}

export async function getMeetings(): Promise<MeetingInfo[]> {
  const { data } = await client.get<ApiResult<MeetingInfo[]>>('/meetings');
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch meetings');
  return data.data;
}

export async function getMeeting(meetingId: string): Promise<MeetingInfo> {
  const { data } = await client.get<ApiResult<MeetingInfo>>(`/meetings/${meetingId}`);
  if (!data.success) throw new Error(data.error ?? 'Failed to fetch meeting');
  return data.data;
}

export async function joinMeeting(meetingId: string, password?: string): Promise<MeetingInfo> {
  const { data } = await client.post<ApiResult<MeetingInfo>>(`/meetings/${meetingId}/join`, {
    ...(password ? { password } : {}),
  });
  if (!data.success) throw new Error(data.error ?? 'Failed to join meeting');
  return data.data;
}

export async function leaveMeeting(meetingId: string): Promise<void> {
  await client.post(`/meetings/${meetingId}/leave`);
}

export async function endMeeting(meetingId: string): Promise<MeetingInfo> {
  const { data } = await client.post<ApiResult<MeetingInfo>>(`/meetings/${meetingId}/end`);
  if (!data.success) throw new Error(data.error ?? 'Failed to end meeting');
  return data.data;
}
