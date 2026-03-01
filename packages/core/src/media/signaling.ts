import type { WebSocketManager } from '../transport/websocket';
import { Logger } from '../utils/logger';

export interface SignalingConfig {
  roomId: string;
  roomType: 'call' | 'meeting' | 'stream';
}

export interface TransportParams {
  transportId: string;
  iceParameters: Record<string, unknown>;
  iceCandidates: Record<string, unknown>[];
  dtlsParameters: Record<string, unknown>;
}

export interface ProducerParams {
  producerId: string;
}

export interface ConsumerParams {
  consumerId: string;
  producerId: string;
  kind: 'audio' | 'video';
  rtpParameters: Record<string, unknown>;
  producerUserId: string;
  producerPaused: boolean;
}

export class SignalingClient {
  private ws: WebSocketManager;
  private logger = new Logger().child('Signaling');
  private responseHandlers = new Map<string, (data: unknown) => void>();

  constructor(ws: WebSocketManager) {
    this.ws = ws;
    this.setupListeners();
  }

  async joinRoom(config: SignalingConfig): Promise<{ rtpCapabilities: Record<string, unknown> }> {
    return this.request('join_room', {
      room_id: config.roomId,
      room_type: config.roomType,
      media_config: { audio: true, video: true, screen: false },
    });
  }

  async createTransport(direction: 'send' | 'recv'): Promise<TransportParams> {
    return this.request('create_transport', { direction, force_tcp: false });
  }

  async connectTransport(
    transportId: string,
    dtlsParameters: Record<string, unknown>,
  ): Promise<void> {
    await this.request('connect_transport', {
      transport_id: transportId,
      dtls_parameters: dtlsParameters,
    });
  }

  async produce(
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: Record<string, unknown>,
    appData?: Record<string, unknown>,
  ): Promise<ProducerParams> {
    return this.request('produce', {
      transport_id: transportId,
      kind,
      rtp_parameters: rtpParameters,
      app_data: appData ?? {},
    });
  }

  async consume(
    producerId: string,
    rtpCapabilities: Record<string, unknown>,
  ): Promise<ConsumerParams> {
    return this.request('consume', {
      producer_id: producerId,
      rtp_capabilities: rtpCapabilities,
    });
  }

  async leaveRoom(): Promise<void> {
    this.ws.send('leave_room', {});
  }

  private async request<T>(type: string, data: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.responseHandlers.delete(type);
        reject(new Error(`Signaling request '${type}' timed out`));
      }, 10000);

      this.responseHandlers.set(type, (response) => {
        clearTimeout(timeout);
        this.responseHandlers.delete(type);
        resolve(response as T);
      });

      this.ws.send(type, data);
    });
  }

  private setupListeners(): void {
    const responseEvents = [
      'router_capabilities', 'transport_created', 'transport_connected',
      'producer_created', 'consumer_created',
    ];

    for (const event of responseEvents) {
      this.ws.onRaw(event, (data) => {
        const requestType = this.mapResponseToRequest(event);
        const handler = this.responseHandlers.get(requestType);
        if (handler) {
          handler(data);
        }
      });
    }
  }

  private mapResponseToRequest(responseEvent: string): string {
    const map: Record<string, string> = {
      router_capabilities: 'join_room',
      transport_created: 'create_transport',
      transport_connected: 'connect_transport',
      producer_created: 'produce',
      consumer_created: 'consume',
    };
    return map[responseEvent] ?? responseEvent;
  }
}
