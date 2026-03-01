/**
 * IncomingCallDialog -- full-screen overlay displayed when a call is
 * ringing from another user.
 *
 * Shows the caller's avatar (initials) with pulsing ring animations,
 * the caller's name, call type label, and Accept / Reject buttons.
 */

import React from 'react';

interface IncomingCallDialogProps {
  callerName: string;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallDialog({
  callerName,
  callType,
  onAccept,
  onReject,
}: IncomingCallDialogProps) {
  const initials = getInitials(callerName);
  const callTypeLabel = callType === 'video' ? 'Video Call' : 'Audio Call';

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-content">
        {/* Avatar with pulsing rings */}
        <div className="incoming-call-avatar">
          <div className="incoming-call-ring" />
          <div className="incoming-call-ring" />
          <div className="incoming-call-ring" />
          <div className="avatar-circle">{initials}</div>
        </div>

        {/* Caller info */}
        <div className="incoming-call-info">
          <h2>{callerName}</h2>
          <p>{callTypeLabel}</p>
        </div>

        {/* Accept / Reject */}
        <div className="incoming-call-actions">
          <button
            className="incoming-call-btn reject"
            onClick={onReject}
            title="Decline"
          >
            <PhoneOffIcon />
          </button>
          <button
            className="incoming-call-btn accept"
            onClick={onAccept}
            title="Accept"
          >
            <PhoneIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function PhoneIcon() {
  return (
    <svg
      width="28"
      height="28"
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

function PhoneOffIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.73.89 2 2 0 012 2v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 2.18 2 2 0 015 0h3a2 2 0 012 1.72 12.84 12.84 0 00.89 4.73 2 2 0 01-.45 2.11L9.17 10.11" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
