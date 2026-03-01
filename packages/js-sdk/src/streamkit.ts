import { RajutechieStreamKitClient, type RajutechieStreamKitConfig, type ConnectionState, LogLevel } from '@rajutechie-streamkit/core';
import type { Unsubscribe, RajutechieStreamKitEventName, RajutechieStreamKitEvents } from '@rajutechie-streamkit/core';

/**
 * Configuration accepted by the convenience `RajutechieStreamKit` wrapper.
 * Extends the core config and provides sensible browser defaults.
 */
export interface RajutechieStreamKitBrowserConfig extends Partial<RajutechieStreamKitConfig> {
  /** Required. Your RajutechieStreamKit project API key. */
  apiKey: string;
}

/**
 * `RajutechieStreamKit` is a convenience wrapper around `RajutechieStreamKitClient` that
 * provides browser-friendly defaults and a simpler API surface for
 * the most common operations.
 *
 * @example
 * ```ts
 * const sk = RajutechieStreamKit.getInstance({ apiKey: 'sk_live_...' });
 * await sk.connect(userToken);
 *
 * const messages = await sk.chat.getMessages('channel-1');
 * ```
 */
export class RajutechieStreamKit {
  private readonly client: RajutechieStreamKitClient;

  private constructor(config: RajutechieStreamKitBrowserConfig) {
    const merged: RajutechieStreamKitConfig = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl,
      wsUrl: config.wsUrl,
      region: config.region,
      logLevel: config.logLevel ?? LogLevel.WARN,
      autoReconnect: config.autoReconnect ?? true,
    };

    this.client = RajutechieStreamKitClient.getInstance(merged);
  }

  // ── Singleton ────────────────────────────────────────────────

  private static instances = new Map<string, RajutechieStreamKit>();

  /**
   * Obtain a singleton `RajutechieStreamKit` instance keyed by `apiKey`.
   * Repeated calls with the same key return the same instance.
   */
  static getInstance(config: RajutechieStreamKitBrowserConfig): RajutechieStreamKit {
    const key = config.apiKey;
    if (!this.instances.has(key)) {
      this.instances.set(key, new RajutechieStreamKit(config));
    }
    return this.instances.get(key)!;
  }

  /**
   * Tear down all singleton instances. Primarily useful in tests.
   */
  static clearInstances(): void {
    for (const [, instance] of this.instances) {
      instance.disconnect().catch(() => {});
    }
    this.instances.clear();
    RajutechieStreamKitClient.clearInstances();
  }

  // ── Connection ───────────────────────────────────────────────

  /**
   * Connect to RajutechieStreamKit with the given user token (JWT).
   * Sets up the WebSocket connection and authenticates the HTTP client.
   */
  async connect(userToken: string): Promise<void> {
    await this.client.connect(userToken);
  }

  /**
   * Gracefully disconnect from RajutechieStreamKit, closing all connections.
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /** Current connection state. */
  get connectionState(): ConnectionState {
    return this.client.connectionState;
  }

  /** Whether the WebSocket is currently connected. */
  get isConnected(): boolean {
    return this.client.isConnected;
  }

  // ── Module Accessors ─────────────────────────────────────────

  /** Access the Chat module (channels, messages, typing indicators). */
  get chat() {
    return this.client.chat;
  }

  /** Access the Call module (voice / video calls). */
  get call() {
    return this.client.call;
  }

  /** Access the Meeting module (scheduled meetings, breakout rooms). */
  get meeting() {
    return this.client.meeting;
  }

  /** Access the Live Stream module (broadcasting, HLS). */
  get stream() {
    return this.client.stream;
  }

  /** Access the Signaling client for low-level WebRTC negotiation. */
  get signaling() {
    return this.client.signaling;
  }

  /** Access the Device Manager (camera, mic enumeration). */
  get devices() {
    return this.client.devices;
  }

  // ── Events ───────────────────────────────────────────────────

  /**
   * Subscribe to a RajutechieStreamKit event.
   * Returns an `Unsubscribe` function that removes the listener.
   */
  on<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    return this.client.on(event, handler);
  }

  /**
   * Subscribe to a RajutechieStreamKit event for a single invocation.
   */
  once<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    return this.client.once(event, handler);
  }

  /**
   * Remove a previously registered event handler.
   */
  off<K extends RajutechieStreamKitEventName>(
    event: K,
    handler?: (data: RajutechieStreamKitEvents[K]) => void,
  ): void {
    return this.client.off(event, handler);
  }

  // ── Raw Client Access ────────────────────────────────────────

  /**
   * Escape hatch: returns the underlying `RajutechieStreamKitClient` for
   * use-cases that require the full API surface.
   */
  getClient(): RajutechieStreamKitClient {
    return this.client;
  }
}
