/**
 * StartCallDialog -- card UI for initiating a new audio or video call.
 *
 * Displays a user list with checkboxes, an audio/video toggle switch,
 * and a "Start Call" button.  The button is disabled until at least one
 * participant is selected.
 */

import React, { useState } from 'react';
import type { AppUser } from '../types';
import UserAvatar from './UserAvatar';

interface StartCallDialogProps {
  users: AppUser[];
  onStartCall: (userIds: string[], type: 'audio' | 'video') => void;
}

export default function StartCallDialog({ users, onStartCall }: StartCallDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [callType, setCallType] = useState<'audio' | 'video'>('video');

  function toggleUser(userId: string) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function handleStart() {
    if (selected.length === 0) return;
    onStartCall(selected, callType);
  }

  if (users.length === 0) {
    return (
      <div className="start-call-dialog">
        <div className="start-call-header">
          <h2>Start a Call</h2>
          <p>Select participants to call</p>
        </div>
        <div className="start-call-empty">
          <p>No other users available to call.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="start-call-dialog">
      <div className="start-call-header">
        <h2>Start a Call</h2>
        <p>Select participants to call</p>
      </div>

      {/* User list */}
      <div className="start-call-users">
        {users.map((user) => {
          const isSelected = selected.includes(user.id);
          return (
            <button
              key={user.id}
              className={`start-call-user-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleUser(user.id)}
            >
              <UserAvatar name={user.display_name} size={36} />
              <span className="start-call-user-name">{user.display_name}</span>
              <span
                className={`start-call-checkbox ${isSelected ? 'checked' : ''}`}
              >
                {isSelected && <CheckIcon />}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer with toggle + start button */}
      <div className="start-call-footer">
        <div className="call-type-toggle">
          <span className={callType === 'audio' ? 'active' : ''}>Audio</span>
          <button
            className={`toggle-switch ${callType === 'video' ? 'active' : ''}`}
            onClick={() => setCallType((t) => (t === 'audio' ? 'video' : 'audio'))}
            type="button"
            aria-label="Toggle call type"
          >
            <span className="toggle-switch-knob" />
          </button>
          <span className={callType === 'video' ? 'active' : ''}>Video</span>
        </div>

        <button
          className="btn btn-primary"
          disabled={selected.length === 0}
          onClick={handleStart}
        >
          <PhoneIcon />
          Start Call
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
