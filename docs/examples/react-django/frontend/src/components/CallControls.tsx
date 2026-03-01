/**
 * CallControls -- a row of circular control buttons shown at the bottom
 * of an active call.
 *
 * Buttons: Mute (mic), Camera, Screen Share, End Call.
 * Toggle states change both the icon and the button background colour.
 * All icons are inline SVGs to keep the example self-contained.
 */

import React from 'react';

interface CallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
}

export default function CallControls({
  audioEnabled,
  videoEnabled,
  screenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
}: CallControlsProps) {
  return (
    <div className="call-controls">
      {/* Mute / Unmute */}
      <button
        className={`call-control-btn ${audioEnabled ? 'toggle-on' : 'toggle-off'}`}
        onClick={onToggleAudio}
        title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
      >
        {audioEnabled ? <MicIcon /> : <MicOffIcon />}
      </button>

      {/* Camera on / off */}
      <button
        className={`call-control-btn ${videoEnabled ? 'toggle-on' : 'toggle-off'}`}
        onClick={onToggleVideo}
        title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
      >
        {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
      </button>

      {/* Screen share */}
      <button
        className={`call-control-btn ${screenSharing ? 'screen-share-on' : 'screen-share-off'}`}
        onClick={onToggleScreenShare}
        title={screenSharing ? 'Stop sharing screen' : 'Share screen'}
      >
        <ScreenShareIcon />
      </button>

      {/* End call */}
      <button
        className="call-control-btn end-call"
        onClick={onEndCall}
        title="End call"
      >
        <PhoneOffIcon />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path d="M19 10v2a7 7 0 01-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function VideocamIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function VideocamOffIcon() {
  return (
    <svg
      width="22"
      height="22"
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

function ScreenShareIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <polyline points="8 10 12 6 16 10" />
      <line x1="12" y1="6" x2="12" y2="14" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg
      width="22"
      height="22"
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
