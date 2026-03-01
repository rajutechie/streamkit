import React, { useCallback } from 'react';

export interface CallControlsProps {
  /** Toggle microphone on/off. */
  onToggleAudio: () => void;
  /** Toggle camera on/off. */
  onToggleVideo: () => void;
  /** End the call. */
  onEndCall: () => void;
  /** Toggle screen sharing. */
  onScreenShare?: () => void;
  /** Toggle recording. */
  onToggleRecording?: () => void;
  /** Whether audio is currently enabled. */
  audioEnabled: boolean;
  /** Whether video is currently enabled. */
  videoEnabled: boolean;
  /** Whether screen sharing is currently active. */
  screenSharing?: boolean;
  /** Whether recording is currently active. */
  recording?: boolean;
  /** Optional CSS class name for the outer container. */
  className?: string;
}

/**
 * A toolbar of call control buttons: mute, camera toggle, screen share,
 * recording, and end call.
 *
 * @example
 * ```tsx
 * <CallControls
 *   onToggleAudio={toggleAudio}
 *   onToggleVideo={toggleVideo}
 *   onEndCall={endCall}
 *   onScreenShare={toggleScreenShare}
 *   audioEnabled={audioEnabled}
 *   videoEnabled={videoEnabled}
 * />
 * ```
 */
export function CallControls({
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onScreenShare,
  onToggleRecording,
  audioEnabled,
  videoEnabled,
  screenSharing = false,
  recording = false,
  className,
}: CallControlsProps) {
  const handleEndCall = useCallback(() => {
    onEndCall();
  }, [onEndCall]);

  return (
    <div
      className={className}
      role="toolbar"
      aria-label="Call controls"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#1f2937',
        borderRadius: '12px',
      }}
    >
      {/* Microphone toggle */}
      <ControlButton
        onClick={onToggleAudio}
        active={audioEnabled}
        label={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
        activeColor="#374151"
        inactiveColor="#ef4444"
      >
        {audioEnabled ? 'Mic On' : 'Mic Off'}
      </ControlButton>

      {/* Camera toggle */}
      <ControlButton
        onClick={onToggleVideo}
        active={videoEnabled}
        label={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
        activeColor="#374151"
        inactiveColor="#ef4444"
      >
        {videoEnabled ? 'Cam On' : 'Cam Off'}
      </ControlButton>

      {/* Screen share */}
      {onScreenShare && (
        <ControlButton
          onClick={onScreenShare}
          active={!screenSharing}
          label={screenSharing ? 'Stop sharing screen' : 'Share screen'}
          activeColor="#374151"
          inactiveColor="#3b82f6"
        >
          {screenSharing ? 'Stop Share' : 'Screen'}
        </ControlButton>
      )}

      {/* Recording */}
      {onToggleRecording && (
        <ControlButton
          onClick={onToggleRecording}
          active={!recording}
          label={recording ? 'Stop recording' : 'Start recording'}
          activeColor="#374151"
          inactiveColor="#ef4444"
        >
          {recording ? 'Stop Rec' : 'Record'}
        </ControlButton>
      )}

      {/* End call */}
      <button
        onClick={handleEndCall}
        aria-label="End call"
        style={{
          padding: '12px 28px',
          borderRadius: '24px',
          border: 'none',
          backgroundColor: '#dc2626',
          color: 'white',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background-color 150ms',
        }}
      >
        End
      </button>
    </div>
  );
}

// ── Internal: ControlButton ────────────────────────────────────

interface ControlButtonProps {
  onClick: () => void;
  active: boolean;
  label: string;
  activeColor: string;
  inactiveColor: string;
  children: React.ReactNode;
}

function ControlButton({
  onClick,
  active,
  label,
  activeColor,
  inactiveColor,
  children,
}: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={!active}
      style={{
        padding: '10px 16px',
        borderRadius: '24px',
        border: 'none',
        backgroundColor: active ? activeColor : inactiveColor,
        color: 'white',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'background-color 150ms',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}
