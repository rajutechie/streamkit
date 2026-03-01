import type {
  Router,
  WebRtcTransport,
  DtlsParameters,
  IceParameters,
  IceCandidate,
} from 'mediasoup/node/lib/types.js';
import { config } from './config.js';

/* ------------------------------------------------------------------ */
/*  TransportManager                                                  */
/*                                                                    */
/*  Wraps real mediasoup WebRtcTransport objects.  One send transport */
/*  and one receive transport is created per peer.                   */
/* ------------------------------------------------------------------ */

export interface TransportInfo {
  id: string;
  routerId: string;
  peerId: string;
  direction: 'send' | 'recv';
  iceParameters: IceParameters;
  iceCandidates: IceCandidate[];
  dtlsParameters: DtlsParameters;
}

export class TransportManager {
  /** transportId -> real WebRtcTransport */
  private transports = new Map<string, WebRtcTransport>();
  /** transportId -> metadata */
  private metadata = new Map<string, { routerId: string; peerId: string; direction: 'send' | 'recv' }>();

  /**
   * Create a real mediasoup WebRtcTransport on the given router.
   */
  async createWebRtcTransport(
    router: Router,
    peerId: string,
    direction: 'send' | 'recv',
  ): Promise<TransportInfo> {
    const transport = await router.createWebRtcTransport({
      listenIps: config.webRtcTransport.listenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1_000_000,
    });

    this.transports.set(transport.id, transport);
    this.metadata.set(transport.id, { routerId: router.id, peerId, direction });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        console.warn(`[TransportManager] Transport ${transport.id} DTLS ${state}`);
      }
    });

    console.log(`[TransportManager] Created ${direction} transport ${transport.id} for peer ${peerId}`);

    return {
      id: transport.id,
      routerId: router.id,
      peerId,
      direction,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates as unknown as IceCandidate[],
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Connect a transport by applying the client-side DTLS parameters.
   * Must be called once after the client sends its answer.
   */
  async connectTransport(transportId: string, dtlsParameters: DtlsParameters): Promise<boolean> {
    const transport = this.transports.get(transportId);
    if (!transport) {
      console.warn(`[TransportManager] Transport ${transportId} not found`);
      return false;
    }

    await transport.connect({ dtlsParameters });
    console.log(`[TransportManager] Transport ${transportId} connected`);
    return true;
  }

  getTransport(transportId: string): WebRtcTransport | undefined {
    return this.transports.get(transportId);
  }

  getMetadata(transportId: string) {
    return this.metadata.get(transportId);
  }

  /** Close and remove all transports belonging to a peer. */
  async removeTransportsForPeer(peerId: string): Promise<string[]> {
    const removed: string[] = [];
    for (const [id, meta] of this.metadata) {
      if (meta.peerId === peerId) {
        const transport = this.transports.get(id);
        transport?.close();
        this.transports.delete(id);
        this.metadata.delete(id);
        removed.push(id);
      }
    }
    if (removed.length > 0) {
      console.log(`[TransportManager] Removed ${removed.length} transports for peer ${peerId}`);
    }
    return removed;
  }
}

export const transportManager = new TransportManager();
