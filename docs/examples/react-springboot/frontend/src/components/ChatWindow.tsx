/**
 * ChatWindow -- message list + input for a single channel.
 *
 * Uses the `useChat` hook from @rajutechie-streamkit/react-sdk to subscribe to
 * real-time messages, send messages, and display typing indicators.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useChat } from '@rajutechie-streamkit/react-sdk';
import type { PresenceStatus, Message } from '@rajutechie-streamkit/react-sdk';
import MessageInput from './MessageInput';
import UserAvatar from './UserAvatar';

interface ChatWindowProps {
  channelId: string;
  currentUserId: string;
  presenceMap: Map<string, PresenceStatus>;
}

export default function ChatWindow({ channelId, currentUserId, presenceMap }: ChatWindowProps) {
  const {
    messages,
    sendMessage,
    typing,
    loading,
    error,
    loadMore,
    hasMore,
  } = useChat(channelId);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  // Handle scroll-to-top to load more
  const handleScroll = useCallback(() => {
    if (!listRef.current || !hasMore) return;
    if (listRef.current.scrollTop < 80) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await sendMessage({ text: text.trim() });
    },
    [sendMessage],
  );

  // Typing indicator label
  const typingLabel = typing.length > 0
    ? typing.length === 1
      ? `${typing[0]} is typing...`
      : `${typing.length} people are typing...`
    : null;

  if (loading) {
    return (
      <div className="chat-window">
        <div className="chat-window-loading">
          <div className="spinner" />
          <p>Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chat-window">
        <div className="chat-window-error">
          <p>Failed to load messages: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* Message list */}
      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        {hasMore && (
          <button className="btn btn-sm btn-ghost load-more-btn" onClick={() => loadMore()}>
            Load older messages
          </button>
        )}

        {messages.length === 0 ? (
          <div className="empty-state small">
            <p>No messages yet. Send the first one!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMine={msg.senderId === currentUserId}
              presenceMap={presenceMap}
            />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Typing indicator */}
      {typingLabel && (
        <div className="typing-indicator">
          <span className="typing-dots">
            <span /><span /><span />
          </span>
          {typingLabel}
        </div>
      )}

      {/* Input */}
      <MessageInput channelId={channelId} onSend={handleSend} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble (private sub-component)
// ---------------------------------------------------------------------------

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  presenceMap: Map<string, PresenceStatus>;
}

function MessageBubble({ message, isMine, presenceMap }: MessageBubbleProps) {
  const senderName = message.sender?.displayName ?? message.senderId;
  const online = presenceMap.get(message.senderId)?.status === 'online';
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`message-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
      {!isMine && (
        <UserAvatar name={senderName} size={32} online={online} />
      )}
      <div className="message-bubble-wrapper">
        {!isMine && <span className="message-sender-name">{senderName}</span>}
        <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
          {message.content.text && <p className="message-text">{message.content.text}</p>}
          {message.content.attachments?.map((att, i) => (
            <div key={i} className="message-attachment">
              {att.type === 'image' ? (
                <img src={att.url} alt={att.filename ?? 'image'} className="message-image" />
              ) : (
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="message-file-link">
                  {att.filename ?? 'File'}
                </a>
              )}
            </div>
          ))}
          <span className="message-time">{time}</span>
        </div>
      </div>
    </div>
  );
}
