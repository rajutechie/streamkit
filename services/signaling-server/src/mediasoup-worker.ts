import * as mediasoup from 'mediasoup';
import type { Worker, Router, RtpCodecCapability } from 'mediasoup/node/lib/types.js';
export type { Router } from 'mediasoup/node/lib/types.js';
import os from 'node:os';
import { config } from './config.js';

/* ------------------------------------------------------------------ */
/*  Media codecs                                                      */
/* ------------------------------------------------------------------ */

const MEDIA_CODECS: RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    parameters: { minptime: 10, useinbandfec: 1 },
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000,
    parameters: { 'x-google-start-bitrate': 1000 },
  },
  {
    kind: 'video',
    mimeType: 'video/VP9',
    clockRate: 90000,
    parameters: { 'profile-id': 2, 'x-google-start-bitrate': 1000 },
  },
  {
    kind: 'video',
    mimeType: 'video/h264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '4d0032',
      'level-asymmetry-allowed': 1,
      'x-google-start-bitrate': 1000,
    },
  },
];

/* ------------------------------------------------------------------ */
/*  WorkerManager                                                     */
/* ------------------------------------------------------------------ */

interface WorkerEntry {
  worker: Worker;
  routerCount: number;
}

export class WorkerManager {
  private entries: WorkerEntry[] = [];
  private routers = new Map<string, Router>();
  private currentIndex = 0;
  private initialized = false;

  /**
   * Create one mediasoup Worker per CPU core (up to 4).
   * Must be called before any other methods.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    const numCores = Math.min(os.cpus().length, 4);

    for (let i = 0; i < numCores; i++) {
      const worker = await mediasoup.createWorker({
        logLevel: config.mediasoup.logLevel as mediasoup.types.WorkerLogLevel,
        rtcMinPort: config.mediasoup.rtcMinPort,
        rtcMaxPort: config.mediasoup.rtcMaxPort,
      });

      worker.on('died', (err) => {
        console.error(`[WorkerManager] Worker ${worker.pid} died:`, err);
        // Remove dead worker and recreate asynchronously.
        this.entries = this.entries.filter((e) => e.worker !== worker);
        this._spawnWorker().catch(console.error);
      });

      this.entries.push({ worker, routerCount: 0 });
      console.log(`[WorkerManager] Worker ${worker.pid} created (${i + 1}/${numCores})`);
    }

    this.initialized = true;
    console.log(`[WorkerManager] ${this.entries.length} workers ready`);
  }

  private async _spawnWorker(): Promise<void> {
    const worker = await mediasoup.createWorker({
      logLevel: config.mediasoup.logLevel as mediasoup.types.WorkerLogLevel,
      rtcMinPort: config.mediasoup.rtcMinPort,
      rtcMaxPort: config.mediasoup.rtcMaxPort,
    });
    worker.on('died', (err) => {
      console.error(`[WorkerManager] Replacement worker ${worker.pid} died:`, err);
      this.entries = this.entries.filter((e) => e.worker !== worker);
      this._spawnWorker().catch(console.error);
    });
    this.entries.push({ worker, routerCount: 0 });
    console.log(`[WorkerManager] Replacement worker ${worker.pid} spawned`);
  }

  /** Round-robin worker selection. */
  private nextEntry(): WorkerEntry {
    const entry = this.entries[this.currentIndex % this.entries.length];
    this.currentIndex++;
    return entry;
  }

  /**
   * Create a real mediasoup Router on the least-loaded worker.
   */
  async createRouter(): Promise<Router> {
    const entry = this.nextEntry();
    const router = await entry.worker.createRouter({ mediaCodecs: MEDIA_CODECS });
    entry.routerCount++;

    this.routers.set(router.id, router);
    router.on('workerclose', () => {
      this.routers.delete(router.id);
      console.warn(`[WorkerManager] Router ${router.id} closed (worker died)`);
    });

    console.log(`[WorkerManager] Router ${router.id} created on worker ${entry.worker.pid}`);
    return router;
  }

  getRouter(routerId: string): Router | undefined {
    return this.routers.get(routerId);
  }

  get mediaCodecs(): RtpCodecCapability[] {
    return MEDIA_CODECS;
  }

  async close(): Promise<void> {
    for (const { worker } of this.entries) {
      worker.close();
    }
    this.entries = [];
    this.routers.clear();
    this.initialized = false;
  }
}

export const workerManager = new WorkerManager();
