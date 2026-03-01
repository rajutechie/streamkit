import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import {
  RajutechieStreamKitClient,
  type RajutechieStreamKitConfig,
  type ConnectionState,
  LogLevel,
} from '@rajutechie-streamkit/core';

// ── Context ────────────────────────────────────────────────────

interface RajutechieStreamKitContextValue {
  client: RajutechieStreamKitClient;
  connectionState: ConnectionState;
}

const RajutechieStreamKitContext = createContext<RajutechieStreamKitContextValue | null>(null);

// ── Provider Props ─────────────────────────────────────────────

export interface RajutechieStreamKitProviderProps {
  /** Your RajutechieStreamKit project API key. */
  apiKey: string;
  /** JWT token for the current user. When provided the SDK connects automatically. */
  userToken?: string;
  /** Optional overrides for the RajutechieStreamKit client configuration. */
  config?: Partial<Omit<RajutechieStreamKitConfig, 'apiKey'>>;
  /** React children. */
  children: ReactNode;
}

// ── Provider Component ─────────────────────────────────────────

/**
 * `RajutechieStreamKitProvider` initializes a `RajutechieStreamKitClient`, manages its
 * connection lifecycle, and exposes it to descendants via React context.
 *
 * @example
 * ```tsx
 * <RajutechieStreamKitProvider apiKey="sk_live_..." userToken={jwt}>
 *   <App />
 * </RajutechieStreamKitProvider>
 * ```
 */
export function RajutechieStreamKitProvider({
  apiKey,
  userToken,
  config,
  children,
}: RajutechieStreamKitProviderProps) {
  // Build the client once (keyed by apiKey). If apiKey changes at runtime
  // we intentionally get a fresh instance.
  const client = useMemo<RajutechieStreamKitClient>(() => {
    const mergedConfig: RajutechieStreamKitConfig = {
      apiKey,
      apiUrl: config?.apiUrl,
      wsUrl: config?.wsUrl,
      region: config?.region,
      logLevel: config?.logLevel ?? LogLevel.WARN,
      autoReconnect: config?.autoReconnect ?? true,
    };
    return RajutechieStreamKitClient.getInstance(mergedConfig);
  }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    client.connectionState,
  );

  // Track current token so we can detect changes
  const tokenRef = useRef<string | undefined>(userToken);

  // Subscribe to connection state changes
  useEffect(() => {
    const unsub = client.on('connection.changed', ({ state }) => {
      setConnectionState(state);
    });
    return unsub;
  }, [client]);

  // Manage connection lifecycle: connect when token is set, disconnect on unmount or token removal
  useEffect(() => {
    let cancelled = false;

    if (userToken) {
      tokenRef.current = userToken;
      client.connect(userToken).catch(() => {
        // Connection error is surfaced through the connection.error event;
        // the provider does not need to handle it beyond updating state.
        if (!cancelled) {
          setConnectionState('disconnected');
        }
      });
    } else if (tokenRef.current) {
      // Token was removed - disconnect
      tokenRef.current = undefined;
      client.disconnect().catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [client, userToken]);

  // Disconnect on unmount
  useEffect(() => {
    return () => {
      client.disconnect().catch(() => {});
    };
  }, [client]);

  const contextValue = useMemo<RajutechieStreamKitContextValue>(
    () => ({ client, connectionState }),
    [client, connectionState],
  );

  return (
    <RajutechieStreamKitContext.Provider value={contextValue}>
      {children}
    </RajutechieStreamKitContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────

/**
 * Access the `RajutechieStreamKitClient` from the nearest `RajutechieStreamKitProvider`.
 *
 * @throws If called outside of a `<RajutechieStreamKitProvider>`.
 */
export function useRajutechieStreamKitClient(): RajutechieStreamKitClient {
  const ctx = useContext(RajutechieStreamKitContext);
  if (!ctx) {
    throw new Error(
      'useRajutechieStreamKitClient must be used within a <RajutechieStreamKitProvider>. ' +
      'Wrap your component tree with <RajutechieStreamKitProvider apiKey="...">.',
    );
  }
  return ctx.client;
}

/**
 * Access the full context value (client + connectionState).
 * @internal Exported for use by other hooks in this package.
 */
export function useRajutechieStreamKitContext(): RajutechieStreamKitContextValue {
  const ctx = useContext(RajutechieStreamKitContext);
  if (!ctx) {
    throw new Error(
      'useRajutechieStreamKitContext must be used within a <RajutechieStreamKitProvider>. ' +
      'Wrap your component tree with <RajutechieStreamKitProvider apiKey="...">.',
    );
  }
  return ctx;
}
