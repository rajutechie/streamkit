import { TypedEventEmitter } from './events/emitter';
import type { ConnectionState } from './events/types';
import { HttpClient } from './transport/http';
import { WebSocketManager } from './transport/websocket';
import { TokenManager } from './auth/token-manager';
import { ChatModule } from './modules/chat';
import { CallModule } from './modules/call';
import { MeetingModule } from './modules/meeting';
import { LiveStreamModule } from './modules/stream';
import { SignalingClient } from './media/signaling';
import { DeviceManager } from './media/webrtc';
import { Logger, LogLevel } from './utils/logger';

export interface RajutechieStreamKitConfig {
  apiKey: string;
  apiUrl?: string;
  wsUrl?: string;
  region?: string;
  logLevel?: LogLevel;
  autoReconnect?: boolean;
}

const DEFAULT_API_URL = 'https://api.rajutechie-streamkit.io/v1';
const DEFAULT_WS_URL = 'wss://ws.rajutechie-streamkit.io';

export class RajutechieStreamKitClient {
  private static instances = new Map<string, RajutechieStreamKitClient>();

  private readonly config: Required<RajutechieStreamKitConfig> & { apiUrl: string; wsUrl: string };
  private readonly eventBus: TypedEventEmitter;
  private readonly httpClient: HttpClient;
  private readonly wsManager: WebSocketManager;
  private readonly tokenManager: TokenManager;
  private readonly logger: Logger;

  private _chat: ChatModule | null = null;
  private _call: CallModule | null = null;
  private _meeting: MeetingModule | null = null;
  private _stream: LiveStreamModule | null = null;
  private _signaling: SignalingClient | null = null;
  private _deviceManager: DeviceManager | null = null;

  private constructor(config: RajutechieStreamKitConfig) {
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl ?? DEFAULT_API_URL,
      wsUrl: config.wsUrl ?? DEFAULT_WS_URL,
      region: config.region ?? 'us-east-1',
      logLevel: config.logLevel ?? LogLevel.WARN,
      autoReconnect: config.autoReconnect ?? true,
    };

    this.logger = new Logger({ level: this.config.logLevel }).child('RajutechieStreamKit');
    this.eventBus = new TypedEventEmitter();

    this.httpClient = new HttpClient({
      baseUrl: this.config.apiUrl,
      headers: { 'X-API-Key': this.config.apiKey },
    });

    this.wsManager = new WebSocketManager(
      {
        url: this.config.wsUrl,
        autoReconnect: this.config.autoReconnect,
      },
      this.eventBus,
    );

    this.tokenManager = new TokenManager((token) => {
      this.httpClient.setToken(token);
    });
  }

  static getInstance(config: RajutechieStreamKitConfig): RajutechieStreamKitClient {
    const key = config.apiKey;
    if (!this.instances.has(key)) {
      this.instances.set(key, new RajutechieStreamKitClient(config));
    }
    return this.instances.get(key)!;
  }

  static clearInstances(): void {
    for (const [, instance] of this.instances) {
      instance.disconnect().catch(() => {});
    }
    this.instances.clear();
  }

  // ── Module Accessors ──

  get chat(): ChatModule {
    if (!this._chat) {
      this._chat = new ChatModule(this.httpClient, this.wsManager, this.eventBus, 'ChatModule');
    }
    return this._chat;
  }

  get call(): CallModule {
    if (!this._call) {
      this._call = new CallModule(this.httpClient, this.wsManager, this.eventBus, 'CallModule');
    }
    return this._call;
  }

  get meeting(): MeetingModule {
    if (!this._meeting) {
      this._meeting = new MeetingModule(this.httpClient, this.wsManager, this.eventBus, 'MeetingModule');
    }
    return this._meeting;
  }

  get stream(): LiveStreamModule {
    if (!this._stream) {
      this._stream = new LiveStreamModule(this.httpClient, this.wsManager, this.eventBus, 'StreamModule');
    }
    return this._stream;
  }

  get signaling(): SignalingClient {
    if (!this._signaling) {
      this._signaling = new SignalingClient(this.wsManager);
    }
    return this._signaling;
  }

  get devices(): DeviceManager {
    if (!this._deviceManager) {
      this._deviceManager = new DeviceManager();
    }
    return this._deviceManager;
  }

  get connectionState(): ConnectionState {
    return this.wsManager.state;
  }

  get isConnected(): boolean {
    return this.wsManager.connected;
  }

  // ── Connection ──

  async connect(userToken: string): Promise<void> {
    this.logger.info('Connecting...');
    this.tokenManager.setToken(userToken);
    this.httpClient.setToken(userToken);
    await this.wsManager.connect(userToken);
    this.logger.info('Connected');
  }

  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting...');
    this.tokenManager.clear();
    this.httpClient.setToken(null);
    await this.wsManager.disconnect();
    this.eventBus.removeAllListeners();
    this.logger.info('Disconnected');
  }

  // ── Events ──

  on = this.eventBus.on.bind(this.eventBus);
  once = this.eventBus.once.bind(this.eventBus);
  off = this.eventBus.off.bind(this.eventBus);
}
