/**
 * MessageInput -- text input with send button.
 *
 * Sends typing indicators via the RajutechieStreamKit client, supports Enter to
 * send and Shift+Enter for newlines.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRajutechieStreamKitClient } from '@rajutechie-streamkit/react-sdk';

interface MessageInputProps {
  channelId: string;
  onSend: (text: string) => Promise<void>;
}

export default function MessageInput({ channelId, onSend }: MessageInputProps) {
  const client = useRajutechieStreamKitClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 150)}px`;
    }
  }, [text]);

  const sendTypingStart = useCallback(() => {
    client.chat.startTyping(channelId);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      client.chat.stopTyping(channelId);
    }, 3000);
  }, [client, channelId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sendTypingStart();
  };

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    try {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
        typingTimeout.current = null;
      }
      client.chat.stopTyping(channelId);
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [text, sending, onSend, client, channelId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input-container">
      <textarea
        ref={textareaRef}
        className="message-input-textarea"
        placeholder="Type a message..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={sending}
      />
      <button
        className="btn btn-icon btn-send"
        onClick={handleSend}
        disabled={!text.trim() || sending}
        title="Send message"
      >
        <SendIcon />
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
