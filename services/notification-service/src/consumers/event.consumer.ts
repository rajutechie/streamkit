import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { config } from '../config/index.js';
import { fcmProvider } from '../providers/fcm.js';
import { apnsProvider } from '../providers/apns.js';
import { emailProvider } from '../providers/email.js';

/* ------------------------------------------------------------------ */
/*  In-memory stores (would be Redis / DB in production)              */
/* ------------------------------------------------------------------ */

/** userId -> list of device tokens with platform info */
interface DeviceRegistration {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
}

const deviceRegistrations = new Map<string, DeviceRegistration[]>();

/** channelId -> list of member userIds */
const channelMembers = new Map<string, string[]>();

/* ------------------------------------------------------------------ */
/*  Kafka consumer                                                    */
/* ------------------------------------------------------------------ */

export class EventConsumer {
  private consumer: Consumer;
  private connected = false;

  constructor() {
    const kafka = new Kafka({
      clientId: 'notification-service',
      brokers: config.KAFKA_BROKERS,
      retry: { initialRetryTime: 3000, retries: 5 },
    });
    this.consumer = kafka.consumer({ groupId: 'notification-service' });
  }

  /** Register a device token for push notifications */
  registerDevice(userId: string, token: string, platform: 'ios' | 'android' | 'web'): void {
    const existing = deviceRegistrations.get(userId) ?? [];
    if (!existing.some((d) => d.token === token)) {
      existing.push({ userId, token, platform });
      deviceRegistrations.set(userId, existing);
    }
  }

  /** Register a user as a member of a channel */
  registerChannelMember(channelId: string, userId: string): void {
    const members = channelMembers.get(channelId) ?? [];
    if (!members.includes(userId)) {
      members.push(userId);
      channelMembers.set(channelId, members);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Message routing                                                 */
  /* ---------------------------------------------------------------- */

  private async handleChatMessage(payload: Record<string, unknown>): Promise<void> {
    const channelId = payload.channelId as string | undefined;
    const senderId = payload.senderId as string | undefined;
    const text = (payload.text as string) ?? '';

    if (!channelId) return;

    const members = channelMembers.get(channelId) ?? [];

    for (const memberId of members) {
      // Don't notify the sender
      if (memberId === senderId) continue;

      await this.sendPushToUser(memberId, 'New message', text.slice(0, 100), {
        type: 'chat.message',
        channelId,
      });
    }

    console.log(`[EventConsumer] Processed chat.message for channel ${channelId}, notified ${members.length - 1} members`);
  }

  private async handleCallEvent(payload: Record<string, unknown>): Promise<void> {
    const eventType = payload.eventType as string | undefined;
    const calleeId = payload.calleeId as string | undefined;
    const callerName = (payload.callerName as string) ?? 'Someone';
    const callId = payload.callId as string | undefined;

    if (eventType === 'incoming' && calleeId) {
      await this.sendPushToUser(calleeId, 'Incoming call', `${callerName} is calling you`, {
        type: 'call.incoming',
        callId: callId ?? '',
      });
      console.log(`[EventConsumer] Sent incoming call push to ${calleeId}`);
    }
  }

  private async handleMeetingEvent(payload: Record<string, unknown>): Promise<void> {
    const eventType = payload.eventType as string | undefined;
    const meetingId = payload.meetingId as string | undefined;
    const participants = (payload.participantIds as string[]) ?? [];
    const title = (payload.title as string) ?? 'Meeting';

    if (eventType === 'starting_soon' && meetingId) {
      for (const participantId of participants) {
        await this.sendPushToUser(participantId, 'Meeting starting soon', `"${title}" is about to begin`, {
          type: 'meeting.starting_soon',
          meetingId,
        });
      }
      console.log(`[EventConsumer] Sent meeting reminder to ${participants.length} participants`);
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Push delivery helper                                            */
  /* ---------------------------------------------------------------- */

  private async sendPushToUser(userId: string, title: string, body: string, data: Record<string, string>): Promise<void> {
    const devices = deviceRegistrations.get(userId) ?? [];

    if (devices.length === 0) {
      console.log(`[EventConsumer] No registered devices for user ${userId}, skipping push`);
      return;
    }

    for (const device of devices) {
      try {
        switch (device.platform) {
          case 'ios':
            await apnsProvider.send(device.token, title, body, data);
            break;
          case 'android':
          case 'web':
            await fcmProvider.send(device.token, title, body, data);
            break;
        }
      } catch (err) {
        console.error(`[EventConsumer] Failed to send push to ${device.platform} device for user ${userId}:`, err);
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                       */
  /* ---------------------------------------------------------------- */

  async start(): Promise<void> {
    try {
      await this.consumer.connect();
      this.connected = true;

      await this.consumer.subscribe({ topics: ['chat.messages', 'call.events', 'meeting.events'], fromBeginning: false });

      await this.consumer.run({
        eachMessage: async ({ topic, message }: EachMessagePayload) => {
          if (!message.value) return;

          try {
            const payload = JSON.parse(message.value.toString()) as Record<string, unknown>;

            switch (topic) {
              case 'chat.messages':
                await this.handleChatMessage(payload);
                break;
              case 'call.events':
                await this.handleCallEvent(payload);
                break;
              case 'meeting.events':
                await this.handleMeetingEvent(payload);
                break;
              default:
                console.log(`[EventConsumer] Unhandled topic: ${topic}`);
            }
          } catch (err) {
            console.error(`[EventConsumer] Error processing message from ${topic}:`, err);
          }
        },
      });

      console.log('[EventConsumer] Kafka consumer started, subscribed to chat.messages, call.events, meeting.events');
    } catch (err) {
      console.warn('[EventConsumer] Failed to connect to Kafka (running without event consumption):', (err as Error).message);
    }
  }

  async stop(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
      this.connected = false;
    }
  }
}

export const eventConsumer = new EventConsumer();
