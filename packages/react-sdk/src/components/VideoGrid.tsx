import React, { useRef, useEffect, useCallback } from 'react';

export interface VideoStreamEntry {
  /** Unique identifier for this stream (e.g. "local" or a user ID). */
  id: string;
  /** The MediaStream to render. */
  stream: MediaStream;
  /** Whether this is the local user's stream. */
  isLocal?: boolean;
  /** Display label (e.g. user name). */
  label?: string;
  /** Whether audio is enabled for this stream. */
  audioEnabled?: boolean;
  /** Whether video is enabled for this stream. */
  videoEnabled?: boolean;
}

export interface VideoGridProps {
  /** Array of streams to render (local + remote). */
  streams: VideoStreamEntry[];
  /** Layout mode: "grid" distributes evenly, "spotlight" enlarges the first stream. */
  layout?: 'grid' | 'spotlight';
  /** Optional CSS class name for the outer container. */
  className?: string;
}

/**
 * Renders video streams in a responsive grid or spotlight layout.
 *
 * @example
 * ```tsx
 * <VideoGrid
 *   streams={[
 *     { id: 'local', stream: localStream, isLocal: true, label: 'You' },
 *     { id: 'user-1', stream: remoteStream1, label: 'Alice' },
 *     { id: 'user-2', stream: remoteStream2, label: 'Bob' },
 *   ]}
 *   layout="grid"
 * />
 * ```
 */
export function VideoGrid({
  streams,
  layout = 'grid',
  className,
}: VideoGridProps) {
  if (streams.length === 0) {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        No video streams
      </div>
    );
  }

  const gridColumns = getGridColumns(streams.length);

  if (layout === 'spotlight' && streams.length > 1) {
    const [spotlight, ...others] = streams;
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          gap: '4px',
          backgroundColor: '#111827',
        }}
      >
        {/* Spotlight (large) */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <VideoTile entry={spotlight} />
        </div>

        {/* Filmstrip (small) */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            overflowX: 'auto',
            flexShrink: 0,
            height: '120px',
          }}
        >
          {others.map((entry) => (
            <div key={entry.id} style={{ width: '160px', flexShrink: 0, height: '100%' }}>
              <VideoTile entry={entry} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '4px',
        height: '100%',
        backgroundColor: '#111827',
      }}
    >
      {streams.map((entry) => (
        <VideoTile key={entry.id} entry={entry} />
      ))}
    </div>
  );
}

// ── VideoTile (internal) ───────────────────────────────────────

function VideoTile({ entry }: { entry: VideoStreamEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const attachStream = useCallback(
    (el: HTMLVideoElement | null) => {
      if (!el) return;
      if (el.srcObject !== entry.stream) {
        el.srcObject = entry.stream;
      }
    },
    [entry.stream],
  );

  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== entry.stream) {
      videoRef.current.srcObject = entry.stream;
    }
  }, [entry.stream]);

  const showVideoOff = entry.videoEnabled === false;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#1f2937',
      }}
    >
      <video
        ref={(el) => {
          (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
          attachStream(el);
        }}
        autoPlay
        playsInline
        muted={entry.isLocal ?? false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: entry.isLocal ? 'scaleX(-1)' : undefined,
          display: showVideoOff ? 'none' : 'block',
        }}
      />

      {/* Video-off placeholder */}
      {showVideoOff && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#374151',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#4b5563',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 600,
              color: 'white',
            }}
          >
            {(entry.label ?? entry.id)[0]?.toUpperCase() ?? '?'}
          </div>
        </div>
      )}

      {/* Label overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          fontSize: '12px',
        }}
      >
        {entry.audioEnabled === false && (
          <span
            style={{ color: '#ef4444', fontSize: '10px' }}
            title="Muted"
            aria-label="Muted"
          >
            MIC OFF
          </span>
        )}
        <span>{entry.label ?? entry.id}</span>
        {entry.isLocal && <span style={{ color: '#9ca3af' }}>(You)</span>}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function getGridColumns(count: number): number {
  if (count <= 1) return 1;
  if (count <= 4) return 2;
  if (count <= 9) return 3;
  return 4;
}
