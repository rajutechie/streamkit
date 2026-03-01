import React, { useState, useEffect, useRef } from 'react';
import type { StreamData } from '../types';

interface StreamHostProps {
  stream: StreamData;
  onGoLive: () => void;
  onStop: () => void;
}

export default function StreamHost({ stream, onGoLive, onStop }: StreamHostProps) {
  const [duration, setDuration] = useState(0);
  const [showKey, setShowKey] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLive = stream.status === 'live';

  useEffect(() => {
    if (isLive) {
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isLive]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div className="stream-host">
      <div className="stream-host-header">
        <h2>{stream.title}</h2>
        {isLive && (
          <div className="stream-host-stats">
            <span className="live-badge">LIVE</span>
            <span className="viewer-count"><EyeIcon /> {stream.viewerCount}</span>
            <span className="stream-timer">{fmt(duration)}</span>
          </div>
        )}
      </div>

      <div className="stream-preview">
        <div className="stream-preview-placeholder">
          <CameraIcon />
          <p>{isLive ? 'You are live!' : 'Camera preview'}</p>
        </div>
      </div>

      <div className="stream-host-controls">
        {!isLive ? (
          <button className="btn btn-success btn-lg" onClick={onGoLive}>
            <RadioIcon /> Go Live
          </button>
        ) : (
          <button className="btn btn-danger btn-lg" onClick={onStop}>
            Stop Stream
          </button>
        )}
      </div>

      {stream.streamKey && (
        <div className="stream-key-section">
          <button className="link-btn" onClick={() => setShowKey(!showKey)}>
            {showKey ? 'Hide' : 'Show'} Stream Key
          </button>
          {showKey && (
            <div className="stream-key-value">
              <code>{stream.streamKey}</code>
              <button className="btn btn-ghost btn-sm" onClick={() => navigator.clipboard.writeText(stream.streamKey!)}>
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CameraIcon() {
  return <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
}
function EyeIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function RadioIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 010 8.49m-8.48-.01a6 6 0 010-8.49m11.31-2.82a10 10 0 010 14.14m-14.14 0a10 10 0 010-14.14"/></svg>;
}
