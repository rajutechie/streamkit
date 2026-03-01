import { BaseModule } from './base';
import type {
  Channel, ChannelConfig, UpdateChannelInput,
  AddMemberInput, UpdateMemberInput, ChannelMember, ChannelListOptions,
} from '../models/channel';
import type {
  Message, MessageInput, EditMessageInput, MessageSearchOptions,
} from '../models/message';
import type { PaginationOptions, PaginatedResult } from '../utils/pagination';
import { paginationToParams } from '../utils/pagination';

export class ChatModule extends BaseModule {
  // ── Channels ──

  async createChannel(config: ChannelConfig): Promise<Channel> {
    const { data } = await this.http.post<Channel>('/channels', config);
    return data;
  }

  async getChannel(channelId: string): Promise<Channel> {
    const { data } = await this.http.get<Channel>(`/channels/${channelId}`);
    return data;
  }

  async listChannels(options?: ChannelListOptions): Promise<PaginatedResult<Channel>> {
    const params: Record<string, string> = {};
    if (options?.type) params['type'] = options.type;
    if (options?.memberId) params['member_id'] = options.memberId;
    if (options?.limit) params['limit'] = String(options.limit);
    if (options?.after) params['after'] = options.after;
    const { data } = await this.http.get<PaginatedResult<Channel>>('/channels', params);
    return data;
  }

  async updateChannel(channelId: string, input: UpdateChannelInput): Promise<Channel> {
    const { data } = await this.http.patch<Channel>(`/channels/${channelId}`, input);
    return data;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await this.http.delete(`/channels/${channelId}`);
  }

  // ── Members ──

  async addMembers(channelId: string, members: AddMemberInput[]): Promise<ChannelMember[]> {
    const { data } = await this.http.post<ChannelMember[]>(
      `/channels/${channelId}/members`,
      { members },
    );
    return data;
  }

  async removeMember(channelId: string, userId: string): Promise<void> {
    await this.http.delete(`/channels/${channelId}/members/${userId}`);
  }

  async updateMember(
    channelId: string,
    userId: string,
    input: UpdateMemberInput,
  ): Promise<ChannelMember> {
    const { data } = await this.http.patch<ChannelMember>(
      `/channels/${channelId}/members/${userId}`,
      input,
    );
    return data;
  }

  async listMembers(
    channelId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<ChannelMember>> {
    const params = paginationToParams(options);
    const { data } = await this.http.get<PaginatedResult<ChannelMember>>(
      `/channels/${channelId}/members`,
      params,
    );
    return data;
  }

  // ── Messages ──

  async sendMessage(channelId: string, message: MessageInput): Promise<Message> {
    const { data } = await this.http.post<Message>(
      `/channels/${channelId}/messages`,
      message,
    );
    this.ws.send('message.send', { channelId, message: data });
    return data;
  }

  async getMessages(
    channelId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const params = paginationToParams(options);
    const { data } = await this.http.get<PaginatedResult<Message>>(
      `/channels/${channelId}/messages`,
      params,
    );
    return data;
  }

  async getMessage(channelId: string, messageId: string): Promise<Message> {
    const { data } = await this.http.get<Message>(
      `/channels/${channelId}/messages/${messageId}`,
    );
    return data;
  }

  async editMessage(
    channelId: string,
    messageId: string,
    input: EditMessageInput,
  ): Promise<Message> {
    const { data } = await this.http.patch<Message>(
      `/channels/${channelId}/messages/${messageId}`,
      input,
    );
    return data;
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    await this.http.delete(`/channels/${channelId}/messages/${messageId}`);
  }

  // ── Reactions ──

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await this.http.post(`/channels/${channelId}/messages/${messageId}/reactions`, { emoji });
  }

  async removeReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    await this.http.delete(
      `/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    );
  }

  // ── Read Receipts ──

  async markAsRead(channelId: string, messageId: string): Promise<void> {
    await this.http.post(`/channels/${channelId}/messages/${messageId}/read`);
  }

  // ── Typing ──

  startTyping(channelId: string): void {
    this.ws.send('typing.start', { channelId });
  }

  stopTyping(channelId: string): void {
    this.ws.send('typing.stop', { channelId });
  }

  // ── Search ──

  async searchMessages(
    channelId: string,
    options: MessageSearchOptions,
  ): Promise<PaginatedResult<Message>> {
    const params: Record<string, string> = { query: options.query };
    if (options.senderId) params['sender_id'] = options.senderId;
    if (options.before) params['before'] = options.before;
    if (options.after) params['after'] = options.after;
    if (options.limit) params['limit'] = String(options.limit);
    if (options.hasAttachment !== undefined) params['has_attachment'] = String(options.hasAttachment);
    const { data } = await this.http.get<PaginatedResult<Message>>(
      `/channels/${channelId}/messages/search`,
      params,
    );
    return data;
  }

  // ── Subscriptions ──

  subscribe(channelId: string): void {
    this.ws.send('subscribe', { channelId });
  }

  unsubscribe(channelId: string): void {
    this.ws.send('unsubscribe', { channelId });
  }
}
