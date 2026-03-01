/**
 * StreamHost -- host controls for a live stream.
 *
 * Shows the stream key, RTMP URL, status, viewer count, and provides
 * buttons to go live and stop the stream.
 */

import React, { useState } from 'react';
import type { StreamInfo } from '../types';

interface StreamHostProps {
  stream: StreamInfo;
  onGoLive: () => Promise<void>;
  onStop: () => Promise<void>;
}

export default function StreamHost({ stream, onGoLive, onStop }: StreamHostProps) {
  const [showKey, setShowKey] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const isLive = stream.status === 'live';
  const isIdle = stream.status === 'idle';

  async function handleAction() {
    setActionLoading(true);
    try {
      if (isLive) {
        await onStop();
      } else {
        await onGoLive();
      }
    } finally {
      setActionLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback: some browsers block clipboard in non-secure contexts
    });
  }

  return (
    <div className="stream-host">
      <div className="stream-host-header">
        <h2>{stream.title}</h2>
        {isLive && <span className="live-badge">LIVE</span>}
        {stream.status === 'ended' && <span className="ended-badge">ENDED</span>}
      </div>

      <div className="stream-host-stats">
        <div className="stat-card">
          <span className="stat-label">Status</span>
          <span className={`stat-value status-${stream.status}`}>
            {stream.status.charAt(0).toUpperCase() + stream.status.slice(1)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Viewers</span>
          <span className="stat-value">{stream.viewerCount}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Peak Viewers</span>
          <span className="stat-value">{stream.peakViewers}</span>
        </div>
      </div>

      {/* Stream key section */}
      <div className="stream-key-section">
        <h3>Stream Configuration</h3>

        <div className="stream-key-field">
          <label className="field-label">Stream Key</label>
          <div className="stream-key-input-row">
            <input
              className="field-input"
              type={showKey ? 'text' : 'password'}
              value={stream.streamKey}
              readOnly
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowKey(!showKey)}
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copyToClipboard(stream.streamKey)}
              title="Copy to clipboard"
            >
              <CopyIcon />
            </button>
          </div>
        </div>

        <div className="stream-key-field">
          <label className="field-label">Stream ID</label>
          <div className="stream-key-input-row">
            <input
              className="field-input"
              type="text"
              value={stream.id}
              readOnly
            />
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => copyToClipboard(stream.id)}
              title="Copy to clipboard"
            >
              <CopyIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Preview area */}
      <div className="stream-preview">
        <div className="stream-preview-placeholder">
          {isLive ? (
            <>
              <BroadcastIcon />
              <p>Stream is live. Use your streaming software (e.g. OBS) to broadcast.</p>
            </>
          ) : isIdle ? (
            <>
              <CameraIcon />
              <p>Configure your streaming software, then click "Go Live" to start.</p>
            </>
          ) : (
            <>
              <CameraOffIcon />
              <p>This stream has ended.</p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="stream-host-actions">
        {isIdle && (
          <button
            className="btn btn-primary btn-lg"
            onClick={handleAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Starting...' : 'Go Live'}
          </button>
        )}
        {isLive && (
          <button
            className="btn btn-danger btn-lg"
            onClick={handleAction}
            disabled={actionLoading}
          >
            {actionLoading ? 'Stopping...' : 'End Stream'}
          </button>
        )}
        {stream.status === 'ended' && (
          <button className="btn btn-ghost btn-lg" onClick={onStop}>
            Back to Browse
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
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

function CameraIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M15.28 15.28A2 2 0 013 14V6a2 2 0 012-2h7.28" />
      <polygon points="23 7 16 12 23 17 23 7" />
    </svg>
  );
}
