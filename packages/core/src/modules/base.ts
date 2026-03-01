import type { TypedEventEmitter, Unsubscribe } from '../events/emitter';
import type { RajutechieStreamKitEvents, RajutechieStreamKitEventName } from '../events/types';
import type { HttpClient } from '../transport/http';
import type { WebSocketManager } from '../transport/websocket';
import { Logger } from '../utils/logger';

export abstract class BaseModule {
  protected readonly http: HttpClient;
  protected readonly ws: WebSocketManager;
  protected readonly eventBus: TypedEventEmitter;
  protected readonly logger: Logger;

  constructor(
    http: HttpClient,
    ws: WebSocketManager,
    eventBus: TypedEventEmitter,
    moduleName: string,
  ) {
    this.http = http;
    this.ws = ws;
    this.eventBus = eventBus;
    this.logger = new Logger().child(moduleName);
  }

  on<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    return this.eventBus.on(event, handler);
  }

  once<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    return this.eventBus.once(event, handler);
  }

  off<K extends RajutechieStreamKitEventName>(
    event: K,
    handler?: (data: RajutechieStreamKitEvents[K]) => void,
  ): void {
    this.eventBus.off(event, handler);
  }
}
