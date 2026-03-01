import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import type { MessageInput as MessageInputData } from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

export interface MessageInputProps {
  /** The channel to send messages to. */
  channelId: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Callback invoked after a message is successfully sent. */
  onSend?: (message: MessageInputData) => void;
  /** Optional CSS class name for the outer container. */
  className?: string;
  /** Whether the input should be disabled. */
  disabled?: boolean;
  /** If true, pressing Enter submits (Shift+Enter for newline). Default: true. */
  submitOnEnter?: boolean;
}

/** Minimum interval between typing indicator signals (ms). */
const TYPING_THROTTLE_MS = 2000;
/** How long after the last keystroke to send typing.stop (ms). */
const TYPING_STOP_DELAY_MS = 3000;

/**
 * A chat message input component with typing indicators and
 * Enter-to-send support.
 *
 * @example
 * ```tsx
 * <MessageInput
 *   channelId="ch_abc123"
 *   placeholder="Type a message..."
 *   onSend={(msg) => console.log('Sent:', msg)}
 * />
 * ```
 */
export function MessageInput({
  channelId,
  placeholder = 'Type a message...',
  onSend,
  className,
  disabled = false,
  submitOnEnter = true,
}: MessageInputProps) {
  const client = useRajutechieStreamKitClient();

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingRef = useRef(0);
  const typingStopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Cleanup typing timer on unmount ──────────────────────────

  useEffect(() => {
    return () => {
      if (typingStopTimerRef.current) {
        clearTimeout(typingStopTimerRef.current);
      }
      // Best-effort typing stop on unmount
      try {
        client.chat.stopTyping(channelId);
      } catch {
        // Ignore - may already be disconnected
      }
    };
  }, [client, channelId]);

  // ── Typing indicator logic ───────────────────────────────────

  const emitTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current >= TYPING_THROTTLE_MS) {
      lastTypingRef.current = now;
      try {
        client.chat.startTyping(channelId);
      } catch {
        // Ignore - WS may not be connected
      }
    }

    // Reset the stop timer
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
    }
    typingStopTimerRef.current = setTimeout(() => {
      lastTypingRef.current = 0;
      try {
        client.chat.stopTyping(channelId);
      } catch {
        // Ignore
      }
    }, TYPING_STOP_DELAY_MS);
  }, [client, channelId]);

  // ── Send message ─────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const messageInput: MessageInputData = { text: trimmed };

    setSending(true);

    // Stop typing indicator
    if (typingStopTimerRef.current) {
      clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = null;
    }
    lastTypingRef.current = 0;
    try {
      client.chat.stopTyping(channelId);
    } catch {
      // Ignore
    }

    try {
      await client.chat.sendMessage(channelId, messageInput);
      setText('');
      onSend?.(messageInput);

      // Auto-resize textarea back
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch {
      // Error handling is delegated to the useChat hook or parent
    } finally {
      setSending(false);
      // Re-focus the textarea after sending
      textareaRef.current?.focus();
    }
  }, [client, channelId, text, sending, onSend]);

  // ── Event handlers ───────────────────────────────────────────

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value);
      emitTyping();

      // Auto-resize the textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    },
    [emitTyping],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [submitOnEnter, handleSend],
  );

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <form
      className={className}
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        padding: '8px',
        borderTop: '1px solid #e5e7eb',
      }}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || sending}
        rows={1}
        style={{
          flex: 1,
          resize: 'none',
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid #d1d5db',
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: 'inherit',
          outline: 'none',
          maxHeight: '200px',
          overflowY: 'auto',
        }}
        aria-label={placeholder}
      />
      <button
        type="submit"
        disabled={disabled || sending || text.trim().length === 0}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: 'none',
          backgroundColor:
            disabled || sending || text.trim().length === 0
              ? '#d1d5db'
              : '#3b82f6',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          cursor:
            disabled || sending || text.trim().length === 0
              ? 'not-allowed'
              : 'pointer',
          whiteSpace: 'nowrap',
        }}
        aria-label="Send message"
      >
        {sending ? 'Sending...' : 'Send'}
      </button>
    </form>
  );
}
