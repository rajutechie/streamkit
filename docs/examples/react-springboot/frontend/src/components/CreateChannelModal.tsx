/**
 * CreateChannelModal -- modal to create a direct (1-on-1) or group channel.
 *
 * Tabs at the top switch between "Direct Message" and "Group Chat" modes.
 * The user-picker is a simple searchable list with checkboxes.
 */

import React, { useState } from 'react';
import * as api from '../api';
import type { AppUser, ChannelInfo } from '../types';
import UserAvatar from './UserAvatar';

interface CreateChannelModalProps {
  users: AppUser[];
  onCreated: (channel: ChannelInfo) => void;
  onClose: () => void;
}

type Tab = 'direct' | 'group';

export default function CreateChannelModal({ users, onCreated, onClose }: CreateChannelModalProps) {
  const [tab, setTab] = useState<Tab>('direct');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleUser(userId: string) {
    if (tab === 'direct') {
      setSelected((prev) => (prev.includes(userId) ? [] : [userId]));
    } else {
      setSelected((prev) =>
        prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
      );
    }
  }

  async function handleCreate() {
    if (selected.length === 0) return;
    if (tab === 'group' && !groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const channel = await api.createChannel(
        tab,
        selected,
        tab === 'group' ? groupName.trim() : undefined,
      );
      onCreated(channel);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to create channel';
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Conversation</h2>
          <button className="btn btn-icon modal-close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={`modal-tab ${tab === 'direct' ? 'active' : ''}`}
            onClick={() => { setTab('direct'); setSelected([]); }}
          >
            Direct Message
          </button>
          <button
            className={`modal-tab ${tab === 'group' ? 'active' : ''}`}
            onClick={() => { setTab('group'); setSelected([]); }}
          >
            Group Chat
          </button>
        </div>

        {/* Group name input */}
        {tab === 'group' && (
          <div className="modal-field">
            <label className="field-label" htmlFor="groupName">Group Name</label>
            <input
              id="groupName"
              className="field-input"
              placeholder="Enter group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Search */}
        <div className="modal-field">
          <input
            className="field-input"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* User list */}
        <ul className="user-picker-list">
          {filteredUsers.length === 0 && (
            <li className="user-picker-empty">No users found</li>
          )}
          {filteredUsers.map((u) => {
            const isSelected = selected.includes(u.id);
            return (
              <li key={u.id}>
                <button
                  className={`user-picker-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => toggleUser(u.id)}
                >
                  <UserAvatar name={u.displayName} size={32} />
                  <span className="user-picker-name">{u.displayName}</span>
                  <span className="user-picker-username">@{u.username}</span>
                  <span className={`user-picker-check ${isSelected ? 'checked' : ''}`}>
                    {isSelected && <CheckIcon />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {error && <div className="modal-error">{error}</div>}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            disabled={selected.length === 0 || creating}
            onClick={handleCreate}
          >
            {creating ? 'Creating...' : tab === 'direct' ? 'Start Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
