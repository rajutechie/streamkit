import { io, Socket } from 'socket.io-client';
import { TypedEventEmitter } from '../events/emitter';
import type { ConnectionState, WebSocketMessage } from '../events/types';
import { NetworkError, RajutechieStreamKitErrorCode } from '../utils/errors';
import { Logger } from '../utils/logger';
import { RetryPolicy } from './retry';

export interface WebSocketConfig {
  url: string;
  path?: string;
  autoReconnect?: boolean;
  heartbeatInterval?: number;
}

export class WebSocketManager {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private eventBus: TypedEventEmitter;
  private logger: Logger;
  private retry: RetryPolicy;
  private _state: ConnectionState = 'disconnected';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: WebSocketConfig, eventBus: TypedEventEmitter) {
    this.config = {
      autoReconnect: true,
      heartbeatInterval: 30000,
      path: '/ws',
      ...config,
    };
    this.eventBus = eventBus;
    this.logger = new Logger().child('WebSocket');
    this.retry = new RetryPolicy({ maxRetries: 10, baseDelay: 1000, maxDelay: 30000 });
  }

  get state(): ConnectionState {
    return this._state;
  }

  get connected(): boolean {
    return this._state === 'connected';
  }

  async connect(token: string): Promise<void> {
    if (this.socket?.connected) {
      this.logger.warn('Already connected');
      return;
    }

    this.setState('connecting');

    return new Promise((resolve, reject) => {
      this.socket = io(this.config.url, {
        path: this.config.path,
        auth: { token },
        transports: ['websocket'],
        reconnection: this.config.autoReconnect,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        this.logger.info('Connected');
        this.setState('connected');
        this.startHeartbeat();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.logger.error('Connection error', error.message);
        if (this._state === 'connecting') {
          this.setState('disconnected');
          reject(
            new NetworkError(
              `WebSocket connection failed: ${error.message}`,
              RajutechieStreamKitErrorCode.NETWORK_WEBSOCKET_ERROR,
            ),
          );
        }
      });

      this.socket.on('disconnect', (reason) => {
        this.logger.info('Disconnected', reason);
        this.stopHeartbeat();
        if (reason === 'io server disconnect') {
          this.setState('disconnected');
        } else {
          this.setState('reconnecting');
        }
      });

      this.socket.on('reconnect', () => {
        this.logger.info('Reconnected');
        this.setState('connected');
        this.startHeartbeat();
      });

      this.socket.on('reconnect_failed', () => {
        this.logger.error('Reconnection failed');
        this.setState('disconnected');
        this.eventBus.emit('connection.error', {
          error: new NetworkError(
            'WebSocket reconnection failed',
            RajutechieStreamKitErrorCode.NETWORK_WEBSOCKET_CLOSED,
          ),
        });
      });

      this.socket.on('pong', () => {
        this.logger.debug('Pong received');
      });

      this.setupEventForwarding();
    });
  }

  async disconnect(): Promise<void> {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.setState('disconnected');
  }

  send(type: string, data: unknown): void {
    if (!this.socket?.connected) {
      throw new NetworkError(
        'WebSocket not connected',
        RajutechieStreamKitErrorCode.NETWORK_WEBSOCKET_CLOSED,
      );
    }

    const message: WebSocketMessage = {
      type,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      data,
    };

    this.socket.emit(type, message);
  }

  onRaw(event: string, handler: (data: unknown) => void): () => void {
    this.socket?.on(event, handler);
    return () => {
      this.socket?.off(event, handler);
    };
  }

  private setupEventForwarding(): void {
    if (!this.socket) return;

    const forwardEvents = [
      'message.new', 'message.updated', 'message.deleted', 'message.reaction', 'message.read',
      'typing.start', 'typing.stop',
      'channel.created', 'channel.updated', 'channel.deleted',
      'channel.member.added', 'channel.member.removed', 'channel.member.updated',
      'presence.changed',
      'call.incoming', 'call.accepted', 'call.rejected', 'call.ended',
      'call.participant.joined', 'call.participant.left',
      'call.recording.started', 'call.recording.stopped',
      'meeting.started', 'meeting.ended',
      'meeting.participant.joined', 'meeting.participant.left', 'meeting.participant.muted',
      'meeting.hand.raised', 'meeting.hand.lowered',
      'meeting.poll.created', 'meeting.poll.result',
      'stream.started', 'stream.ended', 'stream.viewer.count',
      'notification', 'error',
    ] as const;

    for (const event of forwardEvents) {
      this.socket.on(event, (data: unknown) => {
        this.eventBus.emit(event as keyof typeof this.eventBus extends never ? never : any, data as any);
      });
    }
  }

  private setState(state: ConnectionState): void {
    if (this._state !== state) {
      this._state = state;
      this.eventBus.emit('connection.changed', { state });
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
