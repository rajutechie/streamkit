/**
 * IncomingCallDialog -- centered overlay shown when a call is ringing.
 *
 * Displays the caller's name with a pulsing animation and accept/reject
 * buttons.
 */

import React from 'react';
import UserAvatar from './UserAvatar';

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
  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-dialog">
        <div className="incoming-call-pulse" />
        <div className="incoming-call-avatar">
          <UserAvatar name={callerName} size={72} />
        </div>

        <h3 className="incoming-call-title">Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</h3>
        <p className="incoming-call-caller">{callerName}</p>

        <div className="incoming-call-actions">
          <button className="call-action-btn reject" onClick={onReject} title="Decline">
            <PhoneOffIcon />
            <span>Decline</span>
          </button>
          <button className="call-action-btn accept" onClick={onAccept} title="Accept">
            <PhoneOnIcon />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function PhoneOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function PhoneOnIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.86 19.86 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.86 19.86 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}
