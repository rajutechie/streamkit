/**
 * ChatPage -- the main messaging interface.
 *
 * Left sidebar: ChannelList (with "new channel" button).
 * Right panel:  ChatWindow for the selected channel, or an empty state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePresence } from '@rajutechie-streamkit/react-sdk';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import type { AppUser, ChannelData } from '../types';
import ChannelList from '../components/ChannelList';
import ChatWindow from '../components/ChatWindow';
import CreateChannelModal from '../components/CreateChannelModal';

export default function ChatPage() {
  const { channelId } = useParams<{ channelId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [channels, setChannels] = useState<ChannelData[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Track presence for all known users
  const allUserIds = users.map((u) => u.id);
  const presenceMap = usePresence(allUserIds);

  // Fetch channels & users on mount
  const loadChannels = useCallback(async () => {
    try {
      const data = await api.getChannels();
      setChannels(data);
    } catch {
      // Silent -- the list will be empty
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
    api.getUsers().then(setUsers).catch(() => {});
  }, [loadChannels]);

  const handleSelectChannel = (id: string) => {
    navigate(`/chat/${id}`);
  };

  const handleChannelCreated = (channel: ChannelData) => {
    setChannels((prev) => [channel, ...prev]);
    setShowCreateModal(false);
    navigate(`/chat/${channel.id}`);
  };

  return (
    <div className="chat-page">
      {/* ---- Left sidebar ---- */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h2>Messages</h2>
          <button
            className="btn btn-icon"
            title="New conversation"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon />
          </button>
        </div>

        {loadingChannels ? (
          <div className="sidebar-loading">
            <div className="spinner" />
          </div>
        ) : channels.length === 0 ? (
          <div className="sidebar-empty">
            <p>No conversations yet.</p>
            <button className="btn btn-sm btn-primary" onClick={() => setShowCreateModal(true)}>
              Start a chat
            </button>
          </div>
        ) : (
          <ChannelList
            channels={channels}
            activeChannelId={channelId}
            presenceMap={presenceMap}
            currentUserId={user?.id ?? ''}
            onSelect={handleSelectChannel}
          />
        )}
      </aside>

      {/* ---- Main content ---- */}
      <main className="chat-main">
        {channelId ? (
          <ChatWindow
            channelId={channelId}
            currentUserId={user?.id ?? ''}
            presenceMap={presenceMap}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <ChatBubbleIcon />
            </div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the sidebar or start a new one.</p>
          </div>
        )}
      </main>

      {/* ---- Create channel modal ---- */}
      {showCreateModal && (
        <CreateChannelModal
          users={users.filter((u) => u.id !== user?.id)}
          onCreated={handleChannelCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons (keeps the example self-contained)
// ---------------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="10" y1="4" x2="10" y2="16" />
      <line x1="4" y1="10" x2="16" y2="10" />
    </svg>
  );
}

function ChatBubbleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 36V12a4 4 0 014-4h24a4 4 0 014 4v16a4 4 0 01-4 4H16l-8 8z" />
    </svg>
  );
}
