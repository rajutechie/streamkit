import type { Producer, RtpParameters } from 'mediasoup/node/lib/types.js';
export type { RtpParameters } from 'mediasoup/node/lib/types.js';
import { transportManager } from './transport-manager.js';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export interface ProducerInfo {
  id: string;
  transportId: string;
  peerId: string;
  kind: 'audio' | 'video';
  rtpParameters: RtpParameters;
  appData: Record<string, unknown>;
  paused: boolean;
}

/* ------------------------------------------------------------------ */
/*  ProducerManager                                                   */
/* ------------------------------------------------------------------ */

export class ProducerManager {
  /** producerId -> real mediasoup Producer */
  private producers = new Map<string, Producer>();
  /** producerId -> metadata */
  private metadata = new Map<string, { transportId: string; peerId: string }>();

  /**
   * Create a real mediasoup Producer by calling transport.produce().
   */
  async produce(
    transportId: string,
    peerId: string,
    kind: 'audio' | 'video',
    rtpParameters: RtpParameters,
    appData: Record<string, unknown> = {},
  ): Promise<ProducerInfo> {
    const transport = transportManager.getTransport(transportId);
    if (!transport) throw new Error(`Transport ${transportId} not found`);

    const producer = await transport.produce({ kind, rtpParameters, appData });

    this.producers.set(producer.id, producer);
    this.metadata.set(producer.id, { transportId, peerId });

    producer.on('transportclose', () => {
      console.log(`[ProducerManager] Producer ${producer.id} closed (transport closed)`);
      this.producers.delete(producer.id);
      this.metadata.delete(producer.id);
    });

    console.log(`[ProducerManager] Created ${kind} producer ${producer.id} on transport ${transportId} (peer=${peerId})`);

    return this._toInfo(producer, transportId, peerId);
  }

  /**
   * Get producer info by ID.
   */
  getProducer(producerId: string): ProducerInfo | undefined {
    const producer = this.producers.get(producerId);
    const meta = this.metadata.get(producerId);
    if (!producer || !meta) return undefined;
    return this._toInfo(producer, meta.transportId, meta.peerId);
  }

  /**
   * Get the underlying mediasoup Producer (needed by ConsumerManager canConsume check).
   */
  getMediasoupProducer(producerId: string): Producer | undefined {
    return this.producers.get(producerId);
  }

  /**
   * Get all producers for a specific peer.
   */
  getProducersForPeer(peerId: string): ProducerInfo[] {
    const result: ProducerInfo[] = [];
    for (const [id, meta] of this.metadata) {
      if (meta.peerId === peerId) {
        const p = this.producers.get(id);
        if (p) result.push(this._toInfo(p, meta.transportId, peerId));
      }
    }
    return result;
  }

  /**
   * Pause or resume a producer via the real mediasoup API.
   */
  async setPaused(producerId: string, paused: boolean): Promise<boolean> {
    const producer = this.producers.get(producerId);
    if (!producer) return false;

    if (paused) {
      await producer.pause();
    } else {
      await producer.resume();
    }

    console.log(`[ProducerManager] Producer ${producerId} ${paused ? 'paused' : 'resumed'}`);
    return true;
  }

  /**
   * Close and remove a single producer.
   */
  removeProducer(producerId: string): boolean {
    const producer = this.producers.get(producerId);
    if (!producer) return false;
    producer.close();
    this.producers.delete(producerId);
    this.metadata.delete(producerId);
    console.log(`[ProducerManager] Removed producer ${producerId}`);
    return true;
  }

  /**
   * Close and remove all producers belonging to a peer.
   */
  removeProducersForPeer(peerId: string): string[] {
    const removed: string[] = [];
    for (const [id, meta] of this.metadata) {
      if (meta.peerId === peerId) {
        const producer = this.producers.get(id);
        producer?.close();
        this.producers.delete(id);
        this.metadata.delete(id);
        removed.push(id);
      }
    }
    if (removed.length > 0) {
      console.log(`[ProducerManager] Removed ${removed.length} producers for peer ${peerId}`);
    }
    return removed;
  }

  private _toInfo(producer: Producer, transportId: string, peerId: string): ProducerInfo {
    return {
      id: producer.id,
      transportId,
      peerId,
      kind: producer.kind,
      rtpParameters: producer.rtpParameters,
      appData: producer.appData as Record<string, unknown>,
      paused: producer.paused,
    };
  }
}

export const producerManager = new ProducerManager();
