/**
 * StartCallDialog -- lets the user pick a participant and choose between
 * an audio or video call.
 */

import React, { useState } from 'react';
import type { AppUser } from '../types';
import UserAvatar from './UserAvatar';

interface StartCallDialogProps {
  users: AppUser[];
  onStartCall: (participantIds: string[], type: 'audio' | 'video') => Promise<void>;
}

export default function StartCallDialog({ users, onStartCall }: StartCallDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [starting, setStarting] = useState(false);

  const filteredUsers = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()),
  );

  function toggleUser(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  async function handleStart(type: 'audio' | 'video') {
    if (selected.length === 0 || starting) return;
    setStarting(true);
    try {
      await onStartCall(selected, type);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="start-call-dialog">
      <div className="start-call-header">
        <h2>Start a Call</h2>
        <p className="text-secondary">Select one or more participants</p>
      </div>

      <div className="start-call-search">
        <SearchIcon />
        <input
          className="field-input"
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

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
                <UserAvatar name={u.displayName} size={36} />
                <div className="user-picker-info">
                  <span className="user-picker-name">{u.displayName}</span>
                  <span className="user-picker-username">@{u.username}</span>
                </div>
                <span className={`user-picker-check ${isSelected ? 'checked' : ''}`}>
                  {isSelected && <CheckIcon />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <div className="start-call-selected">
          <span className="text-secondary">
            {selected.length} participant{selected.length > 1 ? 's' : ''} selected
          </span>
        </div>
      )}

      <div className="start-call-actions">
        <button
          className="btn btn-primary"
          disabled={selected.length === 0 || starting}
          onClick={() => handleStart('audio')}
        >
          <PhoneIcon />
          {starting ? 'Starting...' : 'Audio Call'}
        </button>
        <button
          className="btn btn-primary"
          disabled={selected.length === 0 || starting}
          onClick={() => handleStart('video')}
        >
          <VideoIcon />
          {starting ? 'Starting...' : 'Video Call'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
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

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}
