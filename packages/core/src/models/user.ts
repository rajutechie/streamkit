export interface User {
  id: string;
  appId: string;
  externalId: string;
  displayName?: string;
  avatarUrl?: string;
  metadata: Record<string, unknown>;
  role: 'user' | 'moderator' | 'admin';
  isActive: boolean;
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  pushToken?: string;
  pushProvider?: 'fcm' | 'apns' | 'web_push';
  isActive: boolean;
  lastActiveAt: string;
  createdAt: string;
}

export interface CreateUserInput {
  externalId: string;
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
  role?: 'user' | 'moderator' | 'admin';
}

export interface UpdateUserInput {
  displayName?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
  role?: 'user' | 'moderator' | 'admin';
}

export interface RegisterDeviceInput {
  deviceId: string;
  platform: 'ios' | 'android' | 'web' | 'desktop';
  pushToken?: string;
  pushProvider?: 'fcm' | 'apns' | 'web_push';
}

export interface PresenceStatus {
  userId: string;
  status: 'online' | 'away' | 'dnd' | 'offline';
  lastSeenAt?: string;
  device?: string;
}
