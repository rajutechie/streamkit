import { useRajutechieStreamKitContext } from '../provider';
import type { RajutechieStreamKitClient, ConnectionState } from '@rajutechie-streamkit/core';

export interface UseRajutechieStreamKitResult {
  /** The underlying RajutechieStreamKitClient instance. */
  client: RajutechieStreamKitClient;
  /** Current WebSocket connection state. */
  connectionState: ConnectionState;
  /** Convenience boolean: true when `connectionState` is `'connected'`. */
  isConnected: boolean;
}

/**
 * Primary hook for accessing the RajutechieStreamKit client and connection state.
 *
 * @example
 * ```tsx
 * function StatusBadge() {
 *   const { isConnected, connectionState } = useRajutechieStreamKit();
 *   return <span>{isConnected ? 'Online' : connectionState}</span>;
 * }
 * ```
 */
export function useRajutechieStreamKit(): UseRajutechieStreamKitResult {
  const { client, connectionState } = useRajutechieStreamKitContext();

  return {
    client,
    connectionState,
    isConnected: connectionState === 'connected',
  };
}
