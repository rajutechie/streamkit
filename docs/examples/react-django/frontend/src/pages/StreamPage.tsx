/**
 * StreamPage -- Live-streaming interface with host and viewer modes.
 *
 * - Hosts can create a new stream, go live, and stop streaming.
 * - Viewers can browse active streams and watch.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRajutechieStreamKit } from '@rajutechie-streamkit/react-sdk';
import { useAuth } from '../contexts/AuthContext';
import * as apiClient from '../api';
import type { StreamData } from '../types';
import StreamHost from '../components/StreamHost';
import StreamViewer from '../components/StreamViewer';

type Mode = 'browse' | 'host' | 'view';

export default function StreamPage() {
  const { user } = useAuth();
  const { client } = useRajutechieStreamKit();

  const [mode, setMode] = useState<Mode>('browse');
  const [streams, setStreams] = useState<StreamData[]>([]);
  const [activeStream, setActiveStream] = useState<StreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch active streams
  const loadStreams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getStreams();
      setStreams(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStreams();
  }, [loadStreams]);

  // Listen for stream lifecycle events
  useEffect(() => {
    const unsubStarted = client.on('stream.started', () => loadStreams());
    const unsubEnded = client.on('stream.ended', () => loadStreams());
    return () => {
      unsubStarted();
      unsubEnded();
    };
  }, [client, loadStreams]);

  const handleCreateStream = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const stream = await apiClient.createStream(newTitle.trim());
      setActiveStream(stream);
      setMode('host');
      setNewTitle('');
    } catch {
      /* show error in real app */
    } finally {
      setCreating(false);
    }
  };

  const handleGoLive = async () => {
    if (!activeStream) return;
    try {
      const updated = await apiClient.startStream(activeStream.id);
      setActiveStream(updated);
    } catch {
      /* handle error */
    }
  };

  const handleStopStream = async () => {
    if (!activeStream) return;
    try {
      await apiClient.stopStream(activeStream.id);
      setActiveStream(null);
      setMode('browse');
      loadStreams();
    } catch {
      /* handle error */
    }
  };

  const handleWatchStream = (stream: StreamData) => {
    setActiveStream(stream);
    setMode('view');
  };

  const handleLeaveStream = () => {
    setActiveStream(null);
    setMode('browse');
  };

  // ---- Host mode ----
  if (mode === 'host' && activeStream) {
    return (
      <div className="stream-page">
        <StreamHost
          stream={activeStream}
          onGoLive={handleGoLive}
          onStop={handleStopStream}
        />
      </div>
    );
  }

  // ---- Viewer mode ----
  if (mode === 'view' && activeStream) {
    return (
      <div className="stream-page">
        <StreamViewer stream={activeStream} onLeave={handleLeaveStream} />
      </div>
    );
  }

  // ---- Browse mode ----
  return (
    <div className="stream-page browse-mode">
      <header className="stream-browse-header">
        <h2>Live Streams</h2>
      </header>

      {/* Create stream section */}
      <section className="stream-create-section">
        <h3>Start Streaming</h3>
        <div className="stream-create-form">
          <input
            className="field-input"
            type="text"
            placeholder="Enter stream title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateStream()}
          />
          <button
            className="btn btn-primary"
            disabled={creating || !newTitle.trim()}
            onClick={handleCreateStream}
          >
            {creating ? 'Creating...' : 'Create Stream'}
          </button>
        </div>
      </section>

      {/* Stream list */}
      <section className="stream-list-section">
        <h3>Active Streams</h3>

        {loading ? (
          <div className="sidebar-loading">
            <div className="spinner" />
          </div>
        ) : streams.length === 0 ? (
          <div className="empty-state small">
            <p>No live streams right now. Be the first to go live!</p>
          </div>
        ) : (
          <div className="stream-grid">
            {streams.map((s) => (
              <div
                key={s.id}
                className="stream-card"
                onClick={() => handleWatchStream(s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && handleWatchStream(s)}
              >
                <div className="stream-card-preview">
                  <div className="stream-card-placeholder">
                    <CameraIcon />
                  </div>
                  {s.status === 'live' && <span className="live-badge">LIVE</span>}
                  <span className="viewer-badge">
                    <EyeIcon /> {s.viewerCount}
                  </span>
                </div>
                <div className="stream-card-info">
                  <h4>{s.title}</h4>
                  <p className="stream-card-host">Host: {s.hostId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function CameraIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
