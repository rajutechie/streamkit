import EventEmitter3 from 'eventemitter3';
import type { RajutechieStreamKitEvents, RajutechieStreamKitEventName } from './types';

export type Unsubscribe = () => void;

export class TypedEventEmitter {
  private emitter = new EventEmitter3();

  on<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
    return () => {
      this.emitter.off(event, handler as (...args: unknown[]) => void);
    };
  }

  once<K extends RajutechieStreamKitEventName>(
    event: K,
    handler: (data: RajutechieStreamKitEvents[K]) => void,
  ): Unsubscribe {
    this.emitter.once(event, handler as (...args: unknown[]) => void);
    return () => {
      this.emitter.off(event, handler as (...args: unknown[]) => void);
    };
  }

  off<K extends RajutechieStreamKitEventName>(
    event: K,
    handler?: (data: RajutechieStreamKitEvents[K]) => void,
  ): void {
    if (handler) {
      this.emitter.off(event, handler as (...args: unknown[]) => void);
    } else {
      this.emitter.removeAllListeners(event);
    }
  }

  emit<K extends RajutechieStreamKitEventName>(event: K, data: RajutechieStreamKitEvents[K]): void {
    this.emitter.emit(event, data);
  }

  removeAllListeners(event?: RajutechieStreamKitEventName): void {
    if (event) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
  }

  listenerCount(event: RajutechieStreamKitEventName): number {
    return this.emitter.listenerCount(event);
  }
}
