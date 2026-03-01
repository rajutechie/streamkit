import admin from 'firebase-admin';
import { config } from '../config/index.js';

export interface FcmPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Firebase Cloud Messaging provider.
 *
 * Uses the Firebase Admin SDK to deliver push notifications to Android
 * and web clients via FCM.  The SDK is initialised once on first use;
 * subsequent calls reuse the same app instance.
 */
export class FcmProvider {
  private readonly messaging: admin.messaging.Messaging;

  constructor() {
    // Initialise only once even if the constructor is called multiple times.
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.FCM_PROJECT_ID,
          clientEmail: config.FCM_CLIENT_EMAIL,
          // Environment variables store newlines as the literal string "\n".
          privateKey: config.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    }

    this.messaging = admin.messaging();
  }

  /**
   * Send a push notification to a single FCM registration token.
   *
   * @param token - The FCM registration token of the target device.
   * @param title - Notification title.
   * @param body  - Notification body.
   * @param data  - Optional key/value string pairs delivered alongside the notification.
   * @returns The FCM message ID assigned by the server.
   * @throws When FCM returns a non-retriable error.
   */
  async send(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      const messageId = await this.messaging.send({
        token,
        notification: { title, body },
        ...(data && { data }),
      });

      return { success: true, messageId };
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;

      if (code === 'messaging/registration-token-not-registered') {
        // The token is stale – the caller should remove it from the device store.
        console.warn('[FCM] Stale token detected, caller should remove it:', token.slice(0, 12) + '...');
      }

      throw err;
    }
  }
}

export const fcmProvider = new FcmProvider();
