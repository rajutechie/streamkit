import type { User } from './user';

export type ChannelType = 'direct' | 'group' | 'community' | 'open';

export interface ChannelSettings {
  maxMembers: number;
  messageRetentionDays: number;
  reactionsEnabled: boolean;
  typingIndicators: boolean;
  readReceipts: boolean;
  pushNotifications: boolean;
}

export interface Channel {
  id: string;
  appId: string;
  type: ChannelType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  createdBy?: string;
  metadata: Record<string, unknown>;
  settings: ChannelSettings;
  isFrozen: boolean;
  memberCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  user?: User;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  isMuted: boolean;
  isBanned: boolean;
  muteExpiresAt?: string;
  banExpiresAt?: string;
  lastReadAt?: string;
  lastReadMsg?: string;
  unreadCount: number;
  joinedAt: string;
}

export interface ChannelConfig {
  type: ChannelType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  members?: string[];
  metadata?: Record<string, unknown>;
  settings?: Partial<ChannelSettings>;
}

export interface UpdateChannelInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  metadata?: Record<string, unknown>;
  settings?: Partial<ChannelSettings>;
  isFrozen?: boolean;
}

export interface AddMemberInput {
  userId: string;
  role?: 'admin' | 'moderator' | 'member';
}

export interface UpdateMemberInput {
  role?: 'admin' | 'moderator' | 'member';
  isMuted?: boolean;
  isBanned?: boolean;
  muteExpiresAt?: string;
  banExpiresAt?: string;
}

export interface ChannelListOptions {
  type?: ChannelType;
  memberId?: string;
  limit?: number;
  after?: string;
}
