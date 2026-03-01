import apn from 'node-apn';
import { config } from '../config/index.js';

export interface ApnsPayload {
  deviceToken: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Apple Push Notification Service provider.
 *
 * Uses `node-apn` with JWT-based authentication (an .p8 Auth Key) to
 * deliver notifications to iOS/macOS devices over the APNs HTTP/2 API.
 */
export class ApnsProvider {
  private readonly provider: apn.Provider;
  private readonly bundleId: string;

  constructor() {
    this.bundleId = config.APNS_BUNDLE_ID;

    this.provider = new apn.Provider({
      token: {
        key: config.APNS_KEY_PATH,   // path to the .p8 Auth Key file
        keyId: config.APNS_KEY_ID,   // 10-character Key ID from Apple Developer portal
        teamId: config.APNS_TEAM_ID, // 10-character Team ID
      },
      production: process.env.NODE_ENV === 'production',
    });
  }

  /**
   * Send a push notification to a single APNs device token.
   *
   * @param deviceToken - Hex-encoded APNs device token.
   * @param title       - Notification title.
   * @param body        - Notification body.
   * @param data        - Optional custom payload key/value pairs.
   * @returns The APNs unique notification ID.
   * @throws When APNs rejects the notification.
   */
  async send(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ success: boolean; apnsId: string }> {
    const notification = new apn.Notification();

    notification.alert = { title, body };
    notification.topic = this.bundleId;
    notification.expiry = Math.floor(Date.now() / 1000) + 3600; // 1 hour TTL

    if (data) {
      notification.payload = data;
    }

    const result = await this.provider.send(notification, deviceToken);

    if (result.failed.length > 0) {
      const failure = result.failed[0];
      const reason = failure.response?.reason ?? 'Unknown';

      if (reason === 'BadDeviceToken' || reason === 'Unregistered') {
        console.warn('[APNs] Invalid device token, caller should remove it:', deviceToken.slice(0, 12) + '...');
      }

      throw new Error(`[APNs] Send failed: ${reason}`);
    }

    const apnsId = result.sent[0]?.device ?? `apns_${Date.now()}`;
    return { success: true, apnsId };
  }

  /** Cleanly shut down the APNs HTTP/2 connection pool. */
  shutdown(): void {
    this.provider.shutdown();
  }
}

export const apnsProvider = new ApnsProvider();
