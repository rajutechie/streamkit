/**
 * ChannelList -- renders the sidebar list of conversations, grouped
 * into "Direct Messages" and "Groups".
 *
 * Each item shows the channel name (or the other member's name for DMs),
 * the last message timestamp, an online presence dot for DMs, and an
 * unread count badge.
 */

import React from 'react';
import type { PresenceStatus } from '@rajutechie-streamkit/react-sdk';
import type { ChannelInfo } from '../types';
import UserAvatar from './UserAvatar';

interface ChannelListProps {
  channels: ChannelInfo[];
  activeChannelId?: string;
  presenceMap: Map<string, PresenceStatus>;
  currentUserId: string;
  onSelect: (channelId: string) => void;
}

export default function ChannelList({
  channels,
  activeChannelId,
  presenceMap,
  currentUserId,
  onSelect,
}: ChannelListProps) {
  const directs = channels.filter((c) => c.type === 'direct');
  const groups = channels.filter((c) => c.type === 'group');

  function channelDisplayName(ch: ChannelInfo): string {
    if (ch.type === 'group') return ch.name || 'Unnamed Group';
    const other = ch.members?.find((m) => m !== currentUserId);
    return other ?? 'Direct Message';
  }

  function isOnline(ch: ChannelInfo): boolean {
    if (ch.type !== 'direct') return false;
    const other = ch.members?.find((m) => m !== currentUserId);
    if (!other) return false;
    return presenceMap.get(other)?.status === 'online';
  }

  function formatTime(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const renderSection = (title: string, items: ChannelInfo[]) => {
    if (items.length === 0) return null;
    return (
      <div className="channel-section">
        <h3 className="channel-section-title">{title}</h3>
        <ul className="channel-list">
          {items.map((ch) => {
            const name = channelDisplayName(ch);
            const active = ch.id === activeChannelId;
            const online = isOnline(ch);
            return (
              <li key={ch.id}>
                <button
                  className={`channel-item ${active ? 'active' : ''}`}
                  onClick={() => onSelect(ch.id)}
                >
                  <UserAvatar
                    name={name}
                    size={36}
                    online={ch.type === 'direct' ? online : undefined}
                  />
                  <div className="channel-item-info">
                    <div className="channel-item-top">
                      <span className="channel-item-name">{name}</span>
                      <span className="channel-item-time">{formatTime(ch.lastMessageAt)}</span>
                    </div>
                    {ch.lastMessagePreview && (
                      <span className="channel-item-preview">{ch.lastMessagePreview}</span>
                    )}
                  </div>
                  {ch.unreadCount !== undefined && ch.unreadCount > 0 && (
                    <span className="unread-badge">{ch.unreadCount}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="channel-list-container">
      {renderSection('Direct Messages', directs)}
      {renderSection('Groups', groups)}
    </div>
  );
}
