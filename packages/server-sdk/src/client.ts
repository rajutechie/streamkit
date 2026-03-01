import jwt from 'jsonwebtoken';

export interface ServerConfig {
  apiKey: string;
  apiSecret: string;
  apiUrl?: string;
}

export interface TokenOptions {
  userId: string;
  role?: string;
  expiresIn?: string | number;
  grants?: {
    chat?: string[];
    call?: string[];
    meeting?: string[];
    stream?: string[];
  };
}

export interface ChannelInput {
  type: 'direct' | 'group' | 'community' | 'open';
  name?: string;
  members?: string[];
  createdBy?: string;
  metadata?: Record<string, unknown>;
}

export interface CallInput {
  type: 'audio' | 'video';
  participants: string[];
  channelId?: string;
  metadata?: Record<string, unknown>;
}

export interface MeetingInput {
  title: string;
  description?: string;
  scheduledAt?: string;
  durationMins?: number;
  password?: string;
  settings?: {
    muteOnJoin?: boolean;
    waitingRoom?: boolean;
    maxParticipants?: number;
    recording?: boolean;
  };
}

export interface StreamInput {
  title: string;
  description?: string;
  rtmpKey?: string;
  settings?: {
    maxViewers?: number;
    recording?: boolean;
    latencyMode?: 'low' | 'normal';
  };
}

export interface BanInput {
  userId: string;
  channelId?: string;
  reason: string;
  expiresAt?: string;
}

export interface ModerationRuleInput {
  type: 'word' | 'regex';
  value: string;
  action: 'flag' | 'block' | 'ban';
}

export interface SendNotificationInput {
  userId: string;
  title: string;
  body: string;
  type?: string;
  data?: Record<string, unknown>;
  channels?: ('push' | 'email' | 'in_app')[];
}

export class RajutechieStreamKitServer {
  private apiKey: string;
  private apiSecret: string;
  private apiUrl: string;

  constructor(config: ServerConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.apiUrl = (config.apiUrl ?? 'https://api.rajutechie-streamkit.io/v1').replace(/\/$/, '');
  }

  generateToken(options: TokenOptions): string {
    const payload = {
      sub: options.userId,
      role: options.role ?? 'user',
      grants: options.grants ?? {},
    };

    return jwt.sign(payload, this.apiSecret, {
      issuer: this.apiKey,
      expiresIn: options.expiresIn ?? '1h',
      algorithm: 'HS256',
    });
  }

  verifyToken(token: string): jwt.JwtPayload {
    return jwt.verify(token, this.apiSecret, {
      issuer: this.apiKey,
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
  }

  get chat() {
    return {
      createChannel: (input: ChannelInput) => this.request<unknown>('POST', '/channels', input),
      deleteChannel: (channelId: string) => this.request<void>('DELETE', `/channels/${channelId}`),
      sendMessage: (channelId: string, message: { text?: string; attachments?: unknown[] }) =>
        this.request<unknown>('POST', `/channels/${channelId}/messages`, message),
    };
  }

  get users() {
    return {
      create: (user: { externalId: string; displayName?: string; avatarUrl?: string; role?: string; metadata?: Record<string, unknown> }) =>
        this.request<unknown>('POST', '/users', user),
      get: (userId: string) => this.request<unknown>('GET', `/users/${userId}`),
      list: (params?: { limit?: number; after?: string; appId?: string }) =>
        this.request<unknown>('GET', '/users', undefined, params),
      update: (userId: string, data: Record<string, unknown>) =>
        this.request<unknown>('PATCH', `/users/${userId}`, data),
      delete: (userId: string) => this.request<void>('DELETE', `/users/${userId}`),
      registerDevice: (userId: string, device: { deviceId: string; platform: 'ios' | 'android' | 'web'; pushToken?: string; pushProvider?: string }) =>
        this.request<unknown>('POST', `/users/${userId}/devices`, device),
      removeDevice: (userId: string, deviceId: string) =>
        this.request<void>('DELETE', `/users/${userId}/devices/${deviceId}`),
    };
  }

  get calls() {
    return {
      create: (input: CallInput) => this.request<unknown>('POST', '/calls', input),
      get: (callId: string) => this.request<unknown>('GET', `/calls/${callId}`),
      list: (params?: { userId?: string; status?: string; limit?: number }) =>
        this.request<unknown>('GET', '/calls', undefined, params),
      end: (callId: string) => this.request<void>('POST', `/calls/${callId}/end`),
      startRecording: (callId: string) => this.request<void>('POST', `/calls/${callId}/recording/start`),
      stopRecording: (callId: string) => this.request<void>('POST', `/calls/${callId}/recording/stop`),
    };
  }

  get meetings() {
    return {
      schedule: (input: MeetingInput) => this.request<unknown>('POST', '/meetings', input),
      get: (meetingId: string) => this.request<unknown>('GET', `/meetings/${meetingId}`),
      list: (params?: { hostId?: string; status?: string; limit?: number }) =>
        this.request<unknown>('GET', '/meetings', undefined, params),
      update: (meetingId: string, data: Partial<MeetingInput>) =>
        this.request<unknown>('PATCH', `/meetings/${meetingId}`, data),
      cancel: (meetingId: string) => this.request<void>('DELETE', `/meetings/${meetingId}`),
      end: (meetingId: string) => this.request<void>('POST', `/meetings/${meetingId}/end`),
      addParticipant: (meetingId: string, userId: string, role?: string) =>
        this.request<void>('POST', `/meetings/${meetingId}/participants`, { userId, role }),
      removeParticipant: (meetingId: string, userId: string) =>
        this.request<void>('DELETE', `/meetings/${meetingId}/participants/${userId}`),
      muteAll: (meetingId: string) => this.request<void>('POST', `/meetings/${meetingId}/mute-all`),
    };
  }

  get streams() {
    return {
      create: (input: StreamInput) => this.request<unknown>('POST', '/streams', input),
      get: (streamId: string) => this.request<unknown>('GET', `/streams/${streamId}`),
      list: (params?: { status?: string; limit?: number }) =>
        this.request<unknown>('GET', '/streams', undefined, params),
      start: (streamId: string) => this.request<unknown>('POST', `/streams/${streamId}/start`),
      stop: (streamId: string) => this.request<void>('POST', `/streams/${streamId}/stop`),
      delete: (streamId: string) => this.request<void>('DELETE', `/streams/${streamId}`),
    };
  }

  get moderation() {
    return {
      banUser: (input: BanInput) => this.request<unknown>('POST', '/moderation/bans', input),
      unbanUser: (banId: string) => this.request<void>('DELETE', `/moderation/bans/${banId}`),
      listBans: (params?: { userId?: string; channelId?: string }) =>
        this.request<unknown>('GET', '/moderation/bans', undefined, params),
      createRule: (input: ModerationRuleInput) => this.request<unknown>('POST', '/moderation/rules', input),
      deleteRule: (ruleId: string) => this.request<void>('DELETE', `/moderation/rules/${ruleId}`),
      listRules: () => this.request<unknown>('GET', '/moderation/rules'),
      listReports: (params?: { status?: string; targetType?: string; limit?: number }) =>
        this.request<unknown>('GET', '/moderation/reports', undefined, params),
      resolveReport: (reportId: string, resolution: string) =>
        this.request<void>('PATCH', `/moderation/reports/${reportId}`, { resolution }),
    };
  }

  get notifications() {
    return {
      send: (input: SendNotificationInput) => this.request<unknown>('POST', '/notifications/send', input),
      sendBulk: (inputs: SendNotificationInput[]) => this.request<unknown>('POST', '/notifications/bulk', { notifications: inputs }),
      getPreferences: (userId: string) => this.request<unknown>('GET', `/notifications/preferences/${userId}`),
      updatePreferences: (userId: string, prefs: { push?: boolean; email?: boolean; inApp?: boolean }) =>
        this.request<void>('PATCH', `/notifications/preferences/${userId}`, prefs),
    };
  }

  private async request<T>(method: string, path: string, body?: unknown, params?: Record<string, string | number | undefined>): Promise<T> {
    let url = `${this.apiUrl}${path}`;
    if (params) {
      const qs = Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&');
      if (qs) url += `?${qs}`;
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiKey,
      'X-API-Secret': this.apiSecret,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(`RajutechieStreamKit API error: ${(error as Record<string, string>).message}`);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
}
