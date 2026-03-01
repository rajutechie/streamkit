import React, { useState, useEffect, useCallback } from 'react';
import type { Channel, ChannelListOptions } from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

export interface ChannelListProps {
  /** Callback invoked when the user selects a channel. */
  onChannelSelect?: (channel: Channel) => void;
  /** Filter options for the channel query. */
  filter?: ChannelListOptions;
  /** Optional CSS class name for the outer container. */
  className?: string;
  /** Optional custom renderer for a single channel item. */
  renderChannel?: (channel: Channel, isSelected: boolean) => React.ReactNode;
}

/**
 * Displays a list of channels the current user belongs to.
 *
 * Listens for real-time `channel.created`, `channel.updated`, and
 * `channel.deleted` events to keep the list up to date.
 *
 * @example
 * ```tsx
 * <ChannelList
 *   onChannelSelect={(ch) => setActiveChannel(ch.id)}
 *   filter={{ type: 'group' }}
 * />
 * ```
 */
export function ChannelList({
  onChannelSelect,
  filter,
  className,
  renderChannel,
}: ChannelListProps) {
  const client = useRajutechieStreamKitClient();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize filter by serializing it
  const filterKey = JSON.stringify(filter ?? {});

  // ── Fetch channels ───────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    client.chat
      .listChannels(filter)
      .then((result) => {
        if (!cancelled) {
          setChannels(result.data);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, filterKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time updates ────────────────────────────────────────

  useEffect(() => {
    const unsubCreated = client.on('channel.created', (channel: Channel) => {
      setChannels((prev) => [channel, ...prev]);
    });

    const unsubUpdated = client.on('channel.updated', (channel: Channel) => {
      setChannels((prev) =>
        prev.map((c) => (c.id === channel.id ? channel : c)),
      );
    });

    const unsubDeleted = client.on(
      'channel.deleted',
      ({ channelId }: { channelId: string }) => {
        setChannels((prev) => prev.filter((c) => c.id !== channelId));
        if (selectedId === channelId) {
          setSelectedId(null);
        }
      },
    );

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubDeleted();
    };
  }, [client, selectedId]);

  // ── Selection handler ────────────────────────────────────────

  const handleSelect = useCallback(
    (channel: Channel) => {
      setSelectedId(channel.id);
      onChannelSelect?.(channel);
    },
    [onChannelSelect],
  );

  // ── Default renderer ─────────────────────────────────────────

  const defaultRenderChannel = (channel: Channel, isSelected: boolean): React.ReactNode => (
    <button
      key={channel.id}
      onClick={() => handleSelect(channel)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '10px 12px',
        border: 'none',
        borderRadius: '8px',
        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 150ms',
      }}
      aria-selected={isSelected}
      role="option"
    >
      {channel.avatarUrl ? (
        <img
          src={channel.avatarUrl}
          alt=""
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: '#3b82f6',
            flexShrink: 0,
          }}
        >
          {(channel.name ?? channel.type)[0]?.toUpperCase() ?? '#'}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: isSelected ? 600 : 400,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {channel.name ?? `${channel.type} channel`}
        </div>
        {channel.lastMessageAt && (
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              marginTop: '2px',
            }}
          >
            {formatRelativeTime(channel.lastMessageAt)}
          </div>
        )}
      </div>
      <div
        style={{
          fontSize: '12px',
          color: '#9ca3af',
          flexShrink: 0,
        }}
      >
        {channel.memberCount}
      </div>
    </button>
  );

  // ── Render ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className={className} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        Loading channels...
      </div>
    );
  }

  if (error) {
    return (
      <div className={className} style={{ padding: '20px', textAlign: 'center', color: '#ef4444' }}>
        Failed to load channels.
      </div>
    );
  }

  if (channels.length === 0) {
    return (
      <div className={className} style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
        No channels found.
      </div>
    );
  }

  return (
    <div
      className={className}
      role="listbox"
      aria-label="Channel list"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        overflowY: 'auto',
        padding: '4px',
      }}
    >
      {channels.map((channel) => {
        const isSelected = channel.id === selectedId;
        return renderChannel
          ? renderChannel(channel, isSelected)
          : defaultRenderChannel(channel, isSelected);
      })}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
