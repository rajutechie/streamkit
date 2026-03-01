import { useState, useEffect, useRef } from 'react';
import type { PresenceStatus } from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

/**
 * Hook that subscribes to presence updates for the given set of user IDs.
 *
 * Returns a `Map<string, PresenceStatus>` that is kept up to date as
 * `presence.changed` events arrive through the WebSocket connection.
 *
 * @param userIds - Array of user IDs to track. The hook re-subscribes
 *   whenever the identity of this array changes (by value, not reference).
 *
 * @example
 * ```tsx
 * function OnlineIndicator({ userId }: { userId: string }) {
 *   const presenceMap = usePresence([userId]);
 *   const status = presenceMap.get(userId);
 *   return <span>{status?.status ?? 'offline'}</span>;
 * }
 * ```
 */
export function usePresence(userIds: string[]): Map<string, PresenceStatus> {
  const client = useRajutechieStreamKitClient();

  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceStatus>>(
    () => new Map(),
  );

  // Stabilize userIds to avoid unnecessary re-renders: only re-subscribe when
  // the sorted, joined string representation changes.
  const userIdsKey = userIds.slice().sort().join(',');
  const userIdsRef = useRef<string[]>(userIds);
  useEffect(() => {
    userIdsRef.current = userIds;
  }, [userIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const trackedIds = new Set(userIdsRef.current);

    // Reset the map for the new set of users
    setPresenceMap(new Map());

    if (trackedIds.size === 0) return;

    let cancelled = false;

    // Bulk-fetch current presence state for all tracked users on mount /
    // when the user set changes. The presence module exposes a `getMany`
    // (or `getBulk`) method that hits the presence service's MGET endpoint.
    const fetchInitial = async () => {
      try {
        const statuses: PresenceStatus[] = await client.presence.getMany([...trackedIds]);
        if (cancelled) return;
        setPresenceMap((prev) => {
          const next = new Map(prev);
          for (const s of statuses) {
            next.set(s.userId, s);
          }
          return next;
        });
      } catch {
        // Presence fetch failure is non-fatal; real-time updates will still arrive.
      }
    };

    fetchInitial();

    const unsub = client.on('presence.changed', (status: PresenceStatus) => {
      if (!trackedIds.has(status.userId)) return;

      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(status.userId, status);
        return next;
      });
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [client, userIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return presenceMap;
}
