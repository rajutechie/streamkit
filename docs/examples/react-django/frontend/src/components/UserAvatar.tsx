/**
 * UserAvatar -- renders a coloured circle with the user's initials.
 *
 * A deterministic hash of the name selects the hue, so the same user
 * always gets the same colour.
 */

import React from 'react';

interface UserAvatarProps {
  name: string;
  size?: number;
  online?: boolean;
}

function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function UserAvatar({ name, size = 36, online }: UserAvatarProps) {
  const hue = stringToHue(name);
  const initials = getInitials(name);

  return (
    <div
      className="user-avatar"
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        backgroundColor: `hsl(${hue}, 55%, 45%)`,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 600,
        position: 'relative',
        userSelect: 'none',
      }}
      title={name}
    >
      {initials}
      {online !== undefined && (
        <span
          className={`presence-dot ${online ? 'online' : 'offline'}`}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: '50%',
            border: '2px solid var(--bg-primary)',
          }}
        />
      )}
    </div>
  );
}
