/**
 * `RajutechieStreamKitService` - root Angular service that manages the `RajutechieStreamKitClient`
 * lifecycle and exposes connection state as an RxJS Observable.
 *
 * Injected as a singleton via `RajutechieStreamKitModule.forRoot()`.
 */

import { Injectable, Inject, OnDestroy } from '@angular/core';
import {
  RajutechieStreamKitClient,
  type RajutechieStreamKitConfig,
  type ConnectionState,
  type Unsubscribe,
} from '@rajutechie-streamkit/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';
import { RAJUTECHIE_STREAMKIT_CONFIG } from '../rajutechie-streamkit.module';

@Injectable({ providedIn: 'root' })
export class RajutechieStreamKitService implements OnDestroy {
  /** The underlying `RajutechieStreamKitClient` instance. */
  readonly client: RajutechieStreamKitClient;

  // ── Connection state ──

  private readonly _connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');

  /**
   * Observable that emits whenever the WebSocket connection state changes.
   * Values: `'connecting'` | `'connected'` | `'disconnected'` | `'reconnecting'`.
   */
  readonly connectionState$: Observable<ConnectionState> =
    this._connectionState$.asObservable().pipe(distinctUntilChanged());

  /** Cleanup handle for the core event listener. */
  private _unsubConnectionChanged: Unsubscribe | null = null;

  // ── Constructor ──

  constructor(@Inject(RAJUTECHIE_STREAMKIT_CONFIG) config: RajutechieStreamKitConfig) {
    this.client = RajutechieStreamKitClient.getInstance(config);

    // Forward core connection events into the BehaviorSubject.
    this._unsubConnectionChanged = this.client.on(
      'connection.changed',
      ({ state }) => {
        this._connectionState$.next(state);
      },
    );
  }

  // ── Public API ──

  /**
   * Connect to the RajutechieStreamKit backend with the given user token.
   *
   * This authenticates the WebSocket connection and sets the bearer token
   * on the HTTP client for subsequent REST calls.
   *
   * @param token - A valid RajutechieStreamKit user JWT.
   */
  async connect(token: string): Promise<void> {
    this._connectionState$.next('connecting');
    try {
      await this.client.connect(token);
    } catch (error) {
      this._connectionState$.next('disconnected');
      throw error;
    }
  }

  /**
   * Disconnect from the RajutechieStreamKit backend.
   *
   * Closes the WebSocket, clears tokens, and resets state.
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
    this._connectionState$.next('disconnected');
  }

  /**
   * Snapshot of the current connection state.
   */
  get connectionState(): ConnectionState {
    return this._connectionState$.value;
  }

  /**
   * Whether the client is currently connected.
   */
  get isConnected(): boolean {
    return this._connectionState$.value === 'connected';
  }

  // ── Lifecycle ──

  ngOnDestroy(): void {
    this._unsubConnectionChanged?.();
    this._connectionState$.complete();

    // Best-effort disconnect; ignore errors during teardown.
    this.client.disconnect().catch(() => {});
  }
}
