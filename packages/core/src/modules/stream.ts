import { BaseModule } from './base';

export interface LiveStream {
  id: string;
  appId: string;
  title: string;
  hostId: string;
  streamKey: string;
  status: 'idle' | 'live' | 'ended';
  visibility: 'public' | 'private' | 'unlisted';
  hlsUrl?: string;
  rtmpUrl?: string;
  viewerCount: number;
  peakViewers: number;
  settings: LiveStreamSettings;
  startedAt?: string;
  endedAt?: string;
  recordingUrl?: string;
  createdAt: string;
}

export interface LiveStreamSettings {
  lowLatency: boolean;
  chatEnabled: boolean;
  dvrEnabled: boolean;
  moderationEnabled: boolean;
  maxQuality: '720p' | '1080p' | '4k';
}

export interface CreateStreamInput {
  title: string;
  visibility?: 'public' | 'private' | 'unlisted';
  settings?: Partial<LiveStreamSettings>;
}

export class LiveStreamModule extends BaseModule {
  async create(input: CreateStreamInput): Promise<LiveStream> {
    const { data } = await this.http.post<LiveStream>('/streams', input);
    return data;
  }

  async get(streamId: string): Promise<LiveStream> {
    const { data } = await this.http.get<LiveStream>(`/streams/${streamId}`);
    return data;
  }

  async start(streamId: string): Promise<LiveStream> {
    const { data } = await this.http.post<LiveStream>(`/streams/${streamId}/start`);
    return data;
  }

  async stop(streamId: string): Promise<LiveStream> {
    const { data } = await this.http.post<LiveStream>(`/streams/${streamId}/stop`);
    return data;
  }

  async getViewerCount(streamId: string): Promise<{ count: number }> {
    const { data } = await this.http.get<{ count: number }>(`/streams/${streamId}/viewers`);
    return data;
  }

  async moderate(streamId: string, action: { type: string; targetUserId?: string }): Promise<void> {
    await this.http.post(`/streams/${streamId}/moderate`, action);
  }
}
