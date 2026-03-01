/**
 * VideoGrid -- renders a responsive grid of video tiles for a call.
 *
 * Shows the local user's video plus all remote participants. When video
 * is disabled for a tile, a placeholder with the user's initial is shown.
 */

import React, { useRef, useEffect } from 'react';
import UserAvatar from './UserAvatar';

interface VideoGridProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  callType: string;
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  audioEnabled,
  videoEnabled,
  callType,
}: VideoGridProps) {
  const totalTiles = 1 + remoteStreams.size;

  // Determine grid column count
  let columns = 1;
  if (totalTiles === 2) columns = 2;
  else if (totalTiles <= 4) columns = 2;
  else if (totalTiles <= 9) columns = 3;
  else columns = 4;

  return (
    <div
      className="video-grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
      }}
    >
      {/* Local tile */}
      <VideoTile
        stream={localStream}
        label="You"
        muted
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled && callType === 'video'}
        isLocal
      />

      {/* Remote tiles */}
      {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
        <VideoTile
          key={userId}
          stream={stream}
          label={userId}
          audioEnabled={true}
          videoEnabled={callType === 'video'}
          isLocal={false}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VideoTile (private sub-component)
// ---------------------------------------------------------------------------

interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isLocal: boolean;
}

function VideoTile({ stream, label, muted, audioEnabled, videoEnabled, isLocal }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = videoEnabled && stream && stream.getVideoTracks().length > 0;

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="video-element"
        />
      ) : (
        <div className="video-placeholder">
          <UserAvatar name={label} size={64} />
        </div>
      )}

      <div className="video-tile-overlay">
        <span className="video-tile-name">{label}</span>
        <div className="video-tile-indicators">
          {!audioEnabled && (
            <span className="indicator-icon muted" title="Muted">
              <MicOffIcon />
            </span>
          )}
          {!videoEnabled && (
            <span className="indicator-icon cam-off" title="Camera off">
              <CamOffIcon />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function MicOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
      <path d="M17 16.95A7 7 0 015 12" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      <path d="M19 12a7 7 0 01-.11 1.23" />
    </svg>
  );
}

function CamOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6a2 2 0 012 2v1" />
      <path d="M15 12a3 3 0 11-6 0" />
    </svg>
  );
}
