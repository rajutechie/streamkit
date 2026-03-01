import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config/index.js';
import { prisma } from '../lib/prisma.js';

/* ------------------------------------------------------------------ */
/*  Re-export type for routes compatibility                           */
/* ------------------------------------------------------------------ */

export interface UsageRecord {
  id: string;
  appId: string;
  metric: 'api_calls' | 'video_minutes' | 'storage_bytes' | 'mau';
  value: number;
  createdAt: Date;
  metadata?: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

async function addUsageRecord(
  appId: string,
  metric: UsageRecord['metric'],
  value: number,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.usageRecord.create({ data: { appId, metric, value, metadata: metadata ?? null } });
}

async function trackMau(appId: string, userId: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM

  try {
    await prisma.mauEntry.create({ data: { appId, userId, month } });

    // Count distinct MAU for this month and record it.
    const mau = await prisma.mauEntry.count({ where: { appId, month } });
    await addUsageRecord(appId, 'mau', mau, { userId });
  } catch {
    // Unique constraint violation means user already tracked this month — ignore.
  }
}

/* ------------------------------------------------------------------ */
/*  Kafka consumer                                                    */
/* ------------------------------------------------------------------ */

export class UsageConsumer {
  private consumer: Consumer;
  private connected = false;

  constructor() {
    const kafka = new Kafka({
      clientId: 'analytics-service',
      brokers: config.KAFKA_BROKERS,
      retry: { initialRetryTime: 3000, retries: 5 },
    });
    this.consumer = kafka.consumer({ groupId: 'analytics-service' });
  }

  private async handleChatMessage(payload: Record<string, unknown>): Promise<void> {
    const appId = (payload.appId as string) ?? 'default';
    const userId = payload.senderId as string | undefined;

    await addUsageRecord(appId, 'api_calls', 1, { action: 'send_message' });

    if (userId) await trackMau(appId, userId);

    console.log(`[UsageConsumer] Tracked chat.message for appId=${appId}`);
  }

  private async handleCallEvent(payload: Record<string, unknown>): Promise<void> {
    const appId = (payload.appId as string) ?? 'default';
    const eventType = payload.eventType as string | undefined;
    const durationMinutes = payload.durationMinutes as number | undefined;
    const userId = payload.userId as string | undefined;

    await addUsageRecord(appId, 'api_calls', 1, { action: `call.${eventType}` });

    if (eventType === 'ended' && durationMinutes && durationMinutes > 0) {
      await addUsageRecord(appId, 'video_minutes', durationMinutes, { callId: payload.callId as string });
    }

    if (userId) await trackMau(appId, userId);

    console.log(`[UsageConsumer] Tracked call.event (${eventType}) for appId=${appId}`);
  }

  private async handleStreamEvent(payload: Record<string, unknown>): Promise<void> {
    const appId = (payload.appId as string) ?? 'default';
    const eventType = payload.eventType as string | undefined;
    const durationMinutes = payload.durationMinutes as number | undefined;
    const userId = payload.userId as string | undefined;

    await addUsageRecord(appId, 'api_calls', 1, { action: `stream.${eventType}` });

    if (eventType === 'ended' && durationMinutes && durationMinutes > 0) {
      await addUsageRecord(appId, 'video_minutes', durationMinutes, { streamId: payload.streamId as string });
    }

    if (userId) await trackMau(appId, userId);

    console.log(`[UsageConsumer] Tracked stream.event (${eventType}) for appId=${appId}`);
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      this.connected = true;

      await this.consumer.subscribe({ topics: ['chat.messages', 'call.events', 'stream.events'], fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          if (!message.value) return;
          try {
            const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;
            switch (topic) {
              case 'chat.messages': await this.handleChatMessage(payload); break;
              case 'call.events':   await this.handleCallEvent(payload);   break;
              case 'stream.events': await this.handleStreamEvent(payload); break;
            }
          } catch (err) {
            console.error(`[UsageConsumer] Error processing message from ${topic}:`, err);
          }
        },
      });

      console.log('[UsageConsumer] Started, subscribed to chat.messages, call.events, stream.events');
    } catch (err) {
      console.warn('[UsageConsumer] Failed to connect to Kafka (running without event consumption):', (err as Error).message);
    }
  }

  async stop(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
    }
  }
}

export const usageConsumer = new UsageConsumer();
