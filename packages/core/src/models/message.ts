import type { User } from './user';

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';

export interface Attachment {
  type: 'image' | 'video' | 'file' | 'voice';
  url: string;
  thumbnailUrl?: string;
  filename?: string;
  size?: number;
  mimeType?: string;
  duration?: number;
  dimensions?: { w: number; h: number };
}

export interface Reaction {
  emoji: string;
  userIds: string[];
  count: number;
}

export interface ReadReceipt {
  userId: string;
  readAt: string;
}

export interface Message {
  id: string;
  channelId: string;
  senderId: string;
  sender?: User;
  type: MessageType;
  content: {
    text?: string;
    attachments?: Attachment[];
  };
  replyTo?: string;
  threadId?: string;
  reactions: Record<string, string[]>;
  mentions: string[];
  readBy: ReadReceipt[];
  metadata: Record<string, unknown>;
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageInput {
  text?: string;
  attachments?: Omit<Attachment, 'thumbnailUrl'>[];
  replyTo?: string;
  threadId?: string;
  mentions?: string[];
  metadata?: Record<string, unknown>;
}

export interface EditMessageInput {
  text?: string;
  attachments?: Omit<Attachment, 'thumbnailUrl'>[];
  mentions?: string[];
}

export interface MessageSearchOptions {
  query: string;
  senderId?: string;
  before?: string;
  after?: string;
  limit?: number;
  hasAttachment?: boolean;
}

export interface TypingEvent {
  channelId: string;
  userId: string;
  user?: User;
  isTyping: boolean;
}

export interface ReactionEvent {
  channelId: string;
  messageId: string;
  userId: string;
  emoji: string;
  action: 'added' | 'removed';
}
