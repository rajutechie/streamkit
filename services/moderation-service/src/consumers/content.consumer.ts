import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config/index.js';
import { profanityFilter } from '../services/filter.js';
import { prisma } from '../lib/prisma.js';

/* ------------------------------------------------------------------ */
/*  Kafka consumer                                                    */
/* ------------------------------------------------------------------ */

export class ContentConsumer {
  private consumer: Consumer;
  private connected = false;

  constructor() {
    const kafka = new Kafka({
      clientId: 'moderation-service',
      brokers: config.KAFKA_BROKERS,
      retry: { initialRetryTime: 3000, retries: 5 },
    });
    this.consumer = kafka.consumer({ groupId: 'moderation-service' });
  }

  private async handleChatMessage(payload: Record<string, unknown>): Promise<void> {
    const messageId = (payload.messageId as string) ?? (payload.id as string) ?? 'unknown';
    const channelId = (payload.channelId as string) ?? '';
    const senderId = (payload.senderId as string) ?? '';
    const text = (payload.text as string) ?? '';

    if (!text) return;

    const result = profanityFilter.check(text);

    if (result.flagged) {
      await prisma.report.create({
        data: {
          reporterId: senderId,
          targetType: 'message',
          targetId: messageId,
          reason: `Auto-flagged: matched words [${result.matches.join(', ')}]`,
          status: 'pending',
          source: 'auto',
        },
      });

      console.log(`[ContentConsumer] Auto-flagged message ${messageId} in channel ${channelId}: ${result.matches.join(', ')}`);
    }
  }

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      this.connected = true;

      await this.consumer.subscribe({ topics: ['chat.messages'], fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          if (!message.value) return;

          try {
            const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;

            if (topic === 'chat.messages') {
              await this.handleChatMessage(payload);
            }
          } catch (err) {
            console.error(`[ContentConsumer] Error processing message from ${topic}:`, err);
          }
        },
      });

      console.log('[ContentConsumer] Kafka consumer started, subscribed to chat.messages');
    } catch (err) {
      console.warn('[ContentConsumer] Failed to connect to Kafka (running without content scanning):', (err as Error).message);
    }
  }

  async stop(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
    }
  }
}

export const contentConsumer = new ContentConsumer();
