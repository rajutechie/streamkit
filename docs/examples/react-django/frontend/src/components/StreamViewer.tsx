import React from 'react';
import type { StreamData } from '../types';

interface StreamViewerProps {
  stream: StreamData;
  onLeave: () => void;
}

export default function StreamViewer({ stream, onLeave }: StreamViewerProps) {
  return (
    <div className="stream-viewer">
      <div className="stream-viewer-header">
        <button className="btn btn-ghost" onClick={onLeave}>← Back</button>
        <div className="stream-viewer-info">
          <h3>{stream.title}</h3>
          <span className="stream-host-label">Host: {stream.hostId}</span>
        </div>
        <div className="stream-viewer-stats">
          {stream.status === 'live' && <span className="live-badge">LIVE</span>}
          <span className="viewer-count"><EyeIcon /> {stream.viewerCount}</span>
        </div>
      </div>

      <div className="stream-video-area">
        <div className="stream-video-placeholder">
          {stream.hlsUrl ? (
            <p>Playing: {stream.hlsUrl}</p>
          ) : (
            <>
              <PlayIcon />
              <p>{stream.status === 'live' ? 'Loading stream...' : 'Stream is offline'}</p>
            </>
          )}
        </div>
      </div>

      <div className="stream-viewer-chat">
        <div className="stream-chat-messages">
          <p className="text-muted">Stream chat coming soon...</p>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function PlayIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
}
