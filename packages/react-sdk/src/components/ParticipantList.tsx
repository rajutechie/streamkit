import React from 'react';
import type { MeetingParticipant } from '@rajutechie-streamkit/core';

export interface ParticipantListProps {
  /** Array of participants to display. */
  participants: MeetingParticipant[];
  /** Optional CSS class name for the outer container. */
  className?: string;
  /** Optional custom renderer for a single participant item. */
  renderParticipant?: (participant: MeetingParticipant) => React.ReactNode;
}

/**
 * Displays a list of meeting participants with status indicators for
 * mute state, video state, and hand-raised state.
 *
 * @example
 * ```tsx
 * <ParticipantList participants={participants} />
 * ```
 */
export function ParticipantList({
  participants,
  className,
  renderParticipant,
}: ParticipantListProps) {
  if (participants.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '14px',
        }}
      >
        No participants
      </div>
    );
  }

  return (
    <div
      className={className}
      role="list"
      aria-label="Participants"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        overflowY: 'auto',
        padding: '4px',
      }}
    >
      {participants.map((participant) =>
        renderParticipant
          ? renderParticipant(participant)
          : (
              <DefaultParticipantItem
                key={participant.id}
                participant={participant}
              />
            ),
      )}
    </div>
  );
}

// ── Default Participant Item ───────────────────────────────────

function DefaultParticipantItem({
  participant,
}: {
  participant: MeetingParticipant;
}) {
  const displayName =
    participant.user?.displayName ?? participant.userId;
  const avatarUrl = participant.user?.avatarUrl;
  const roleLabel = getRoleLabel(participant.role);

  return (
    <div
      role="listitem"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
      }}
    >
      {/* Avatar */}
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#dbeafe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 600,
            color: '#3b82f6',
            flexShrink: 0,
          }}
        >
          {displayName[0]?.toUpperCase() ?? '?'}
        </div>
      )}

      {/* Name + role */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </div>
        {roleLabel && (
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>
            {roleLabel}
          </div>
        )}
      </div>

      {/* Status indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {/* Hand raised */}
        {participant.handRaised && (
          <StatusBadge
            label="Hand raised"
            color="#f59e0b"
            text="HAND"
          />
        )}

        {/* Audio indicator */}
        <StatusBadge
          label={participant.isMuted ? 'Muted' : 'Audio on'}
          color={participant.isMuted ? '#ef4444' : '#22c55e'}
          text={participant.isMuted ? 'MUTED' : 'MIC'}
        />

        {/* Video indicator */}
        <StatusBadge
          label={participant.hasVideo ? 'Camera on' : 'Camera off'}
          color={participant.hasVideo ? '#22c55e' : '#6b7280'}
          text={participant.hasVideo ? 'CAM' : 'NO CAM'}
        />
      </div>
    </div>
  );
}

// ── Status Badge (internal) ────────────────────────────────────

function StatusBadge({
  label,
  color,
  text,
}: {
  label: string;
  color: string;
  text: string;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        padding: '2px 5px',
        borderRadius: '3px',
        backgroundColor: `${color}20`,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function getRoleLabel(role: MeetingParticipant['role']): string | null {
  switch (role) {
    case 'host':
      return 'Host';
    case 'co_host':
      return 'Co-host';
    default:
      return null;
  }
}
