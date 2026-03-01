import type { Consumer, RtpCapabilities, RtpParameters } from 'mediasoup/node/lib/types.js';
export type { RtpCapabilities } from 'mediasoup/node/lib/types.js';
import { transportManager } from './transport-manager.js';
import { workerManager } from './mediasoup-worker.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ConsumerInfo {
  id: string;
  transportId: string;
  producerId: string;
  peerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  paused: boolean;
}

/* ------------------------------------------------------------------ */
/*  ConsumerManager                                                   */
/* ------------------------------------------------------------------ */

export class ConsumerManager {
  /** consumerId -> real mediasoup Consumer */
  private consumers = new Map<string, Consumer>();
  /** consumerId -> metadata */
  private metadata = new Map<string, { transportId: string; producerId: string; peerId: string }>();

  /**
   * Create a real mediasoup Consumer on the given recv transport.
   * Checks router.canConsume() before attempting to consume.
   */
  async consume(
    transportId: string,
    producerId: string,
    peerId: string,
    rtpCapabilities: RtpCapabilities,
    routerId: string,
  ): Promise<ConsumerInfo | null> {
    const transport = transportManager.getTransport(transportId);
    if (!transport) {
      console.warn(`[ConsumerManager] Transport ${transportId} not found`);
      return null;
    }

    const router = workerManager.getRouter(routerId);
    if (!router) {
      console.warn(`[ConsumerManager] Router ${routerId} not found`);
      return null;
    }

    if (!router.canConsume({ producerId, rtpCapabilities })) {
      console.warn(`[ConsumerManager] Router cannot consume producer ${producerId} with given rtpCapabilities`);
      return null;
    }

    const consumer = await transport.consume({ producerId, rtpCapabilities, paused: false });

    this.consumers.set(consumer.id, consumer);
    this.metadata.set(consumer.id, { transportId, producerId, peerId });

    consumer.on('transportclose', () => {
      console.log(`[ConsumerManager] Consumer ${consumer.id} closed (transport closed)`);
      this.consumers.delete(consumer.id);
      this.metadata.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      console.log(`[ConsumerManager] Consumer ${consumer.id} closed (producer closed)`);
      this.consumers.delete(consumer.id);
      this.metadata.delete(consumer.id);
    });

    console.log(`[ConsumerManager] Created ${consumer.kind} consumer ${consumer.id} for producer ${producerId} (peer=${peerId})`);

    return this._toInfo(consumer, transportId, producerId, peerId);
  }

  /**
   * Get consumer info by ID.
   */
  getConsumer(consumerId: string): ConsumerInfo | undefined {
    const consumer = this.consumers.get(consumerId);
    const meta = this.metadata.get(consumerId);
    if (!consumer || !meta) return undefined;
    return this._toInfo(consumer, meta.transportId, meta.producerId, meta.peerId);
  }

  /**
   * Get all consumers for a specific peer.
   */
  getConsumersForPeer(peerId: string): ConsumerInfo[] {
    const result: ConsumerInfo[] = [];
    for (const [id, meta] of this.metadata) {
      if (meta.peerId === peerId) {
        const c = this.consumers.get(id);
        if (c) result.push(this._toInfo(c, meta.transportId, meta.producerId, peerId));
      }
    }
    return result;
  }

  /**
   * Pause or resume a consumer via the real mediasoup API.
   */
  async setPaused(consumerId: string, paused: boolean): Promise<boolean> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return false;

    if (paused) {
      await consumer.pause();
    } else {
      await consumer.resume();
    }

    console.log(`[ConsumerManager] Consumer ${consumerId} ${paused ? 'paused' : 'resumed'}`);
    return true;
  }

  /**
   * Close and remove a single consumer.
   */
  removeConsumer(consumerId: string): boolean {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return false;
    consumer.close();
    this.consumers.delete(consumerId);
    this.metadata.delete(consumerId);
    console.log(`[ConsumerManager] Removed consumer ${consumerId}`);
    return true;
  }

  /**
   * Close and remove all consumers belonging to a peer.
   */
  removeConsumersForPeer(peerId: string): string[] {
    const removed: string[] = [];
    for (const [id, meta] of this.metadata) {
      if (meta.peerId === peerId) {
        const consumer = this.consumers.get(id);
        consumer?.close();
        this.consumers.delete(id);
        this.metadata.delete(id);
        removed.push(id);
      }
    }
    if (removed.length > 0) {
      console.log(`[ConsumerManager] Removed ${removed.length} consumers for peer ${peerId}`);
    }
    return removed;
  }

  private _toInfo(
    consumer: Consumer,
    transportId: string,
    producerId: string,
    peerId: string,
  ): ConsumerInfo {
    return {
      id: consumer.id,
      transportId,
      producerId,
      peerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      paused: consumer.paused,
    };
  }
}

export const consumerManager = new ConsumerManager();
