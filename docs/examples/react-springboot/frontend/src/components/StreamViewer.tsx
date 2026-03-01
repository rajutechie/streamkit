/**
 * StreamViewer -- viewer-side UI for watching a live stream.
 *
 * Displays the video area (or placeholder), stream info header with
 * back navigation, live badge, viewer count, and a chat sidebar placeholder.
 */

import React from 'react';
import type { StreamInfo } from '../types';

interface StreamViewerProps {
  stream: StreamInfo;
  onLeave: () => void;
}

export default function StreamViewer({ stream, onLeave }: StreamViewerProps) {
  return (
    <div className="stream-viewer">
      {/* Main video area */}
      <div className="stream-viewer-main">
        <div className="stream-viewer-video">
          <div className="stream-viewer-video-placeholder">
            {stream.status === 'live' ? (
              <>
                <BroadcastIcon />
                <p>Stream is live. Video playback will appear here.</p>
              </>
            ) : (
              <>
                <PlayIcon />
                <p>Stream is offline</p>
              </>
            )}
          </div>
          <div className="stream-viewer-overlay">
            {stream.status === 'live' && <span className="live-badge">LIVE</span>}
            <span className="viewer-badge">
              <EyeIcon /> {stream.viewerCount}
            </span>
          </div>
        </div>

        <div className="stream-viewer-info">
          <div className="stream-viewer-info-left">
            <button className="btn btn-ghost btn-sm" onClick={onLeave}>
              <BackIcon /> Back
            </button>
            <div>
              <div className="stream-viewer-host-name">{stream.title}</div>
              <div className="stream-viewer-title">Host: {stream.hostId}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="stream-viewer-chat">
        <div className="stream-viewer-chat-header">Stream Chat</div>
        <div className="stream-viewer-chat-messages">
          <div className="stream-viewer-chat-empty">
            <p>Chat messages will appear here...</p>
          </div>
        </div>
        <div className="stream-viewer-chat-input">
          <input
            className="field-input"
            type="text"
            placeholder="Send a message..."
            disabled
          />
          <button className="btn btn-primary btn-sm" disabled>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function BroadcastIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}
