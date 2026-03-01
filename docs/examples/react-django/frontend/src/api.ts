/**
 * Axios API client for the Django backend.
 *
 * Every outgoing request automatically attaches the RajutechieStreamKit user token
 * (if present in localStorage) via a request interceptor.
 */

import axios from 'axios';
import type { AppUser, AuthPayload, CallData, ChannelData, MeetingData, StreamData } from './types';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// -- Request interceptor: attach token -------------------------------------

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rajutechie-streamkit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -- Response interceptor: handle 401 globally -----------------------------

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rajutechie-streamkit_token');
      localStorage.removeItem('rajutechie-streamkit_user');
      // Let individual callers handle the redirect / UI
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>('/auth/login', { username, password });
  return data;
}

export async function register(
  username: string,
  password: string,
  displayName?: string,
): Promise<AuthPayload> {
  const { data } = await api.post<AuthPayload>('/auth/register', {
    username,
    password,
    display_name: displayName,
  });
  return data;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function getUsers(): Promise<AppUser[]> {
  const { data } = await api.get<AppUser[]>('/users');
  return data;
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export async function createChannel(
  type: 'direct' | 'group',
  memberIds: string[],
  name?: string,
): Promise<ChannelData> {
  const { data } = await api.post<ChannelData>('/channels/create', {
    type,
    member_ids: memberIds,
    name,
  });
  return data;
}

export async function getChannels(): Promise<ChannelData[]> {
  const { data } = await api.get<ChannelData[]>('/channels');
  // The RajutechieStreamKit API may return a paginated wrapper -- normalise.
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as unknown as { data: ChannelData[] }).data;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export async function createCall(
  type: 'audio' | 'video',
  participantIds: string[],
): Promise<CallData> {
  const { data } = await api.post<CallData>('/calls', {
    type,
    participant_ids: participantIds,
  });
  return data;
}

export async function getCall(callId: string): Promise<CallData> {
  const { data } = await api.get<CallData>(`/calls/${callId}`);
  return data;
}

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

export async function createStream(
  title: string,
  visibility: 'public' | 'private' | 'unlisted' = 'public',
): Promise<StreamData> {
  const { data } = await api.post<StreamData>('/streams/create', { title, visibility });
  return data;
}

export async function getStreams(): Promise<StreamData[]> {
  const { data } = await api.get<StreamData[]>('/streams');
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as unknown as { data: StreamData[] }).data;
  }
  return [];
}

export async function startStream(streamId: string): Promise<StreamData> {
  const { data } = await api.post<StreamData>(`/streams/${streamId}/start`);
  return data;
}

export async function stopStream(streamId: string): Promise<StreamData> {
  const { data } = await api.post<StreamData>(`/streams/${streamId}/stop`);
  return data;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export async function createMeeting(
  title: string,
  durationMins = 60,
  password?: string,
): Promise<MeetingData> {
  const { data } = await api.post<MeetingData>('/meetings/create', {
    title,
    duration_mins: durationMins,
    ...(password ? { password } : {}),
  });
  return data;
}

export async function getMeetings(): Promise<MeetingData[]> {
  const { data } = await api.get<MeetingData[] | { data: MeetingData[] }>('/meetings');
  return Array.isArray(data) ? data : (data as { data: MeetingData[] }).data ?? [];
}

export async function getMeeting(meetingId: string): Promise<MeetingData> {
  const { data } = await api.get<MeetingData>(`/meetings/${meetingId}`);
  return data;
}

export async function joinMeeting(meetingId: string, password?: string): Promise<MeetingData> {
  const { data } = await api.post<MeetingData>(`/meetings/${meetingId}/join`, {
    ...(password ? { password } : {}),
  });
  return data;
}

export async function leaveMeeting(meetingId: string): Promise<void> {
  await api.post(`/meetings/${meetingId}/leave`);
}

export async function endMeeting(meetingId: string): Promise<MeetingData> {
  const { data } = await api.post<MeetingData>(`/meetings/${meetingId}/end`);
  return data;
}

export default api;
