import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Message,
  MessageInput,
  EditMessageInput,
  TypingEvent,
  PaginatedResult,
} from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

export interface UseChatResult {
  /** Messages in the channel, ordered oldest-first. */
  messages: Message[];
  /** Send a new message to the channel. */
  sendMessage: (input: MessageInput) => Promise<Message>;
  /** Edit an existing message. */
  editMessage: (messageId: string, input: EditMessageInput) => Promise<Message>;
  /** Delete a message by ID. */
  deleteMessage: (messageId: string) => Promise<void>;
  /** Array of user IDs currently typing in this channel. */
  typing: string[];
  /** Whether the initial message load is in progress. */
  loading: boolean;
  /** The most recent error, or null. */
  error: Error | null;
  /** Load more (older) messages. Returns `false` when there are no more pages. */
  loadMore: () => Promise<boolean>;
  /** Whether there are older messages available to load. */
  hasMore: boolean;
}

const TYPING_TIMEOUT_MS = 3000;

/**
 * Hook for interacting with a RajutechieStreamKit chat channel.
 *
 * Automatically subscribes to the channel on mount, fetches the initial
 * page of messages, and listens for real-time events (new messages,
 * edits, deletions, typing indicators).
 *
 * @param channelId - The channel to connect to.
 *
 * @example
 * ```tsx
 * function Chat({ channelId }: { channelId: string }) {
 *   const { messages, sendMessage, typing, loading, loadMore, hasMore } = useChat(channelId);
 *
 *   if (loading) return <p>Loading...</p>;
 *
 *   return (
 *     <div>
 *       {hasMore && <button onClick={loadMore}>Load older</button>}
 *       {messages.map(m => <p key={m.id}>{m.content.text}</p>)}
 *       {typing.length > 0 && <p>Someone is typing...</p>}
 *       <button onClick={() => sendMessage({ text: 'Hello!' })}>Send</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChat(channelId: string): UseChatResult {
  const client = useRajutechieStreamKitClient();

  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // Cursor for backwards pagination
  const cursorRef = useRef<string | null>(null);
  // Typing indicator timeouts keyed by userId
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Initial fetch + subscription ─────────────────────────────

  useEffect(() => {
    let cancelled = false;

    setMessages([]);
    setTyping([]);
    setError(null);
    setLoading(true);
    setHasMore(false);
    cursorRef.current = null;

    // Subscribe to the channel via WS
    client.chat.subscribe(channelId);

    // Fetch the first page of messages
    client.chat
      .getMessages(channelId, { limit: 25 })
      .then((result: PaginatedResult<Message>) => {
        if (cancelled) return;
        // API returns newest-first, reverse to oldest-first for display
        setMessages(result.data.slice().reverse());
        setHasMore(result.hasNext);
        cursorRef.current = result.cursors.next;
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      client.chat.unsubscribe(channelId);

      // Clear typing timers
      for (const timer of typingTimers.current.values()) {
        clearTimeout(timer);
      }
      typingTimers.current.clear();
    };
  }, [client, channelId]);

  // ── Real-time event listeners ────────────────────────────────

  useEffect(() => {
    const unsubNew = client.on('message.new', (message: Message) => {
      if (message.channelId !== channelId) return;
      setMessages((prev) => [...prev, message]);
    });

    const unsubUpdated = client.on('message.updated', (message: Message) => {
      if (message.channelId !== channelId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? message : m)),
      );
    });

    const unsubDeleted = client.on(
      'message.deleted',
      (payload: { channelId: string; messageId: string }) => {
        if (payload.channelId !== channelId) return;
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      },
    );

    const unsubTypingStart = client.on('typing.start', (evt: TypingEvent) => {
      if (evt.channelId !== channelId) return;
      handleTyping(evt.userId);
    });

    const unsubTypingStop = client.on('typing.stop', (evt: TypingEvent) => {
      if (evt.channelId !== channelId) return;
      clearTyping(evt.userId);
    });

    return () => {
      unsubNew();
      unsubUpdated();
      unsubDeleted();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [client, channelId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Typing indicator helpers ─────────────────────────────────

  function handleTyping(userId: string) {
    setTyping((prev) => (prev.includes(userId) ? prev : [...prev, userId]));

    // Clear any existing timer for this user
    const existing = typingTimers.current.get(userId);
    if (existing) clearTimeout(existing);

    // Auto-clear after timeout
    const timer = setTimeout(() => {
      clearTyping(userId);
    }, TYPING_TIMEOUT_MS);
    typingTimers.current.set(userId, timer);
  }

  function clearTyping(userId: string) {
    const timer = typingTimers.current.get(userId);
    if (timer) {
      clearTimeout(timer);
      typingTimers.current.delete(userId);
    }
    setTyping((prev) => prev.filter((id) => id !== userId));
  }

  // ── Actions ──────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (input: MessageInput): Promise<Message> => {
      try {
        const message = await client.chat.sendMessage(channelId, input);
        return message;
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err));
        setError(wrappedError);
        throw wrappedError;
      }
    },
    [client, channelId],
  );

  const editMessage = useCallback(
    async (messageId: string, input: EditMessageInput): Promise<Message> => {
      try {
        const updated = await client.chat.editMessage(channelId, messageId, input);
        return updated;
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err));
        setError(wrappedError);
        throw wrappedError;
      }
    },
    [client, channelId],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        await client.chat.deleteMessage(channelId, messageId);
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err));
        setError(wrappedError);
        throw wrappedError;
      }
    },
    [client, channelId],
  );

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!hasMore || !cursorRef.current) return false;

    try {
      const result = await client.chat.getMessages(channelId, {
        limit: 25,
        after: cursorRef.current,
      });
      // Prepend older messages (API returns newest-first)
      setMessages((prev) => [...result.data.slice().reverse(), ...prev]);
      setHasMore(result.hasNext);
      cursorRef.current = result.cursors.next;
      return result.hasNext;
    } catch (err) {
      const wrappedError = err instanceof Error ? err : new Error(String(err));
      setError(wrappedError);
      return false;
    }
  }, [client, channelId, hasMore]);

  return {
    messages,
    sendMessage,
    editMessage,
    deleteMessage,
    typing,
    loading,
    error,
    loadMore,
    hasMore,
  };
}
