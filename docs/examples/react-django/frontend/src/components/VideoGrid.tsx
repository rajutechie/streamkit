/**
 * VideoGrid -- renders a responsive grid of video tiles for call participants.
 *
 * - 1 participant = full screen
 * - 2 participants = side by side
 * - 3-4 participants = 2x2 grid
 *
 * Each tile shows the video element or an avatar fallback with initials.
 * The local camera is shown as a small picture-in-picture overlay in the
 * bottom-right corner.
 */

import React, { useRef, useEffect } from 'react';

interface RemoteStream {
  peerId: string;
  displayName?: string;
  stream: MediaStream;
  audioEnabled?: boolean;
  speaking?: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: RemoteStream[];
  audioEnabled: boolean;
  videoEnabled: boolean;
  callType: 'audio' | 'video';
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  audioEnabled,
  videoEnabled,
  callType,
}: VideoGridProps) {
  const count = remoteStreams.length;
  const gridClass =
    count <= 1 ? 'grid-1' : count === 2 ? 'grid-2' : 'grid-3';

  return (
    <div className={`video-grid ${gridClass}`}>
      {/* Remote participants */}
      {remoteStreams.length === 0 ? (
        <div className="video-tile">
          <div className="video-tile-avatar">
            <div className="avatar-circle">
              <WaitingIcon />
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              Waiting for others to join...
            </span>
          </div>
        </div>
      ) : (
        remoteStreams.map((remote) => (
          <RemoteTile key={remote.peerId} remote={remote} callType={callType} />
        ))
      )}

      {/* Local PIP */}
      <div className="video-pip">
        {localStream && callType === 'video' && videoEnabled ? (
          <LocalVideo stream={localStream} />
        ) : (
          <div className="video-pip-placeholder">
            {!videoEnabled ? <CameraOffSmallIcon /> : <CameraSmallIcon />}
          </div>
        )}
        <span className="video-pip-label">You</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RemoteTile -- renders a single remote participant
// ---------------------------------------------------------------------------

function RemoteTile({
  remote,
  callType,
}: {
  remote: RemoteStream;
  callType: 'audio' | 'video';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && remote.stream) {
      videoRef.current.srcObject = remote.stream;
    }
  }, [remote.stream]);

  const name = remote.displayName ?? remote.peerId;
  const initials = getInitials(name);
  const isSpeaking = remote.speaking ?? false;
  const hasVideo =
    callType === 'video' &&
    remote.stream?.getVideoTracks().some((t) => t.enabled);

  return (
    <div className={`video-tile ${isSpeaking ? 'speaking' : ''}`}>
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline />
      ) : (
        <div className="video-tile-avatar">
          <div className="avatar-circle">{initials}</div>
        </div>
      )}

      <div className="video-tile-overlay">
        <span className="video-tile-name">{name}</span>
        {remote.audioEnabled === false && (
          <span className="video-tile-muted" title="Muted">
            <MicOffIcon />
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocalVideo -- renders the local camera stream (mirrored)
// ---------------------------------------------------------------------------

function LocalVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return <video ref={ref} autoPlay playsInline muted />;
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

function MicOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12" />
      <path d="M19 12a7 7 0 01-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function WaitingIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function CameraOffSmallIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34" />
    </svg>
  );
}

function CameraSmallIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  );
}
