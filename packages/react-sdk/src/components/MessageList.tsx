import React, { useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { Message } from '@rajutechie-streamkit/core';
import { useChat } from '../hooks/useChat';

export interface MessageListProps {
  /** The channel whose messages to display. */
  channelId: string;
  /** Optional CSS class name for the outer container. */
  className?: string;
  /** Optional custom renderer for individual messages. */
  renderMessage?: (message: Message, index: number) => ReactNode;
  /** Optional custom renderer for the typing indicator. */
  renderTypingIndicator?: (typingUserIds: string[]) => ReactNode;
  /** Optional custom renderer for the loading state. */
  renderLoading?: () => ReactNode;
  /** Optional custom renderer for the "load more" trigger. */
  renderLoadMore?: (loadMore: () => Promise<boolean>) => ReactNode;
}

/**
 * Renders a scrollable list of messages for a given channel.
 *
 * Features:
 * - Automatic scroll-to-bottom when new messages arrive (if already at bottom).
 * - Scroll-up detection to load older messages.
 * - Typing indicator display.
 * - Custom renderers for messages, loading, and typing indicators.
 *
 * @example
 * ```tsx
 * <MessageList channelId="ch_abc123" />
 * ```
 */
export function MessageList({
  channelId,
  className,
  renderMessage,
  renderTypingIndicator,
  renderLoading,
  renderLoadMore,
}: MessageListProps) {
  const { messages, typing, loading, hasMore, loadMore } = useChat(channelId);

  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // ── Auto-scroll to bottom on new messages ────────────────────

  useEffect(() => {
    if (isNearBottomRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // ── Detect scroll position ───────────────────────────────────

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if user is near the bottom (within 100px)
    const { scrollTop, scrollHeight, clientHeight } = container;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 100;

    // Load more when scrolled to the top
    if (scrollTop < 50 && hasMore && !loadingMoreRef.current) {
      loadingMoreRef.current = true;
      const previousScrollHeight = scrollHeight;

      loadMore().finally(() => {
        loadingMoreRef.current = false;

        // Maintain scroll position after prepending older messages
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - previousScrollHeight;
          }
        });
      });
    }
  }, [hasMore, loadMore]);

  // ── Scroll to bottom on initial load ─────────────────────────

  useEffect(() => {
    if (!loading && bottomRef.current) {
      bottomRef.current.scrollIntoView();
    }
  }, [loading]);

  // ── Default renderers ────────────────────────────────────────

  const defaultRenderMessage = (message: Message, _index: number): ReactNode => (
    <div
      key={message.id}
      style={{
        padding: '8px 12px',
        marginBottom: '4px',
        borderRadius: '8px',
        backgroundColor: message.isDeleted ? '#f3f4f6' : 'transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <strong style={{ fontSize: '14px' }}>
          {message.sender?.displayName ?? message.senderId}
        </strong>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {formatTime(message.createdAt)}
        </span>
        {message.isEdited && (
          <span style={{ fontSize: '11px', color: '#9ca3af' }}>(edited)</span>
        )}
      </div>
      <div style={{ marginTop: '2px', fontSize: '14px', color: message.isDeleted ? '#9ca3af' : '#1f2937' }}>
        {message.isDeleted ? 'This message was deleted.' : message.content.text}
      </div>
      {message.content.attachments && message.content.attachments.length > 0 && (
        <div style={{ marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {message.content.attachments.map((att, i) => (
            <span
              key={i}
              style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#e5e7eb',
                color: '#4b5563',
              }}
            >
              {att.filename ?? att.type}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  const defaultRenderTyping = (typingUserIds: string[]): ReactNode => {
    if (typingUserIds.length === 0) return null;
    const label =
      typingUserIds.length === 1
        ? `${typingUserIds[0]} is typing...`
        : typingUserIds.length === 2
          ? `${typingUserIds[0]} and ${typingUserIds[1]} are typing...`
          : `${typingUserIds[0]} and ${typingUserIds.length - 1} others are typing...`;

    return (
      <div
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        {label}
      </div>
    );
  };

  const defaultRenderLoading = (): ReactNode => (
    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
      Loading messages...
    </div>
  );

  const defaultRenderLoadMore = (loadMoreFn: () => Promise<boolean>): ReactNode => (
    <div style={{ padding: '8px', textAlign: 'center' }}>
      <button
        onClick={() => loadMoreFn()}
        style={{
          padding: '6px 16px',
          fontSize: '13px',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          backgroundColor: 'white',
          cursor: 'pointer',
          color: '#374151',
        }}
      >
        Load older messages
      </button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (renderLoading ?? defaultRenderLoading)();
  }

  return (
    <div
      ref={containerRef}
      className={className}
      onScroll={handleScroll}
      style={{
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {hasMore && (renderLoadMore ?? defaultRenderLoadMore)(loadMore)}

      {messages.map((message, index) =>
        (renderMessage ?? defaultRenderMessage)(message, index),
      )}

      {(renderTypingIndicator ?? defaultRenderTyping)(typing)}

      {/* Sentinel for auto-scroll */}
      <div ref={bottomRef} />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}
