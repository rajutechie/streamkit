/**
 * React Native push-notification helpers.
 *
 * Provides a thin abstraction over FCM (Firebase Cloud Messaging) and
 * APNs (Apple Push Notification service) for registering device tokens
 * and handling incoming push notifications.
 */

import type { RajutechieStreamKitClient, RegisterDeviceInput } from '@rajutechie-streamkit/core';
import { Platform } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Supported push notification providers. */
export type PushProvider = 'fcm' | 'apns';

/** Shape of an incoming push notification payload. */
export interface PushNotificationPayload {
  /** Notification title. */
  title?: string;
  /** Notification body / message. */
  body?: string;
  /** Arbitrary key-value data attached to the notification. */
  data?: Record<string, unknown>;
  /** The notification type from RajutechieStreamKit (e.g. `'message.new'`, `'call.incoming'`). */
  type?: string;
}

/** Handler invoked when a push notification arrives. */
export type NotificationHandler = (payload: PushNotificationPayload) => void;

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let _registeredToken: string | null = null;
let _notificationHandlers: NotificationHandler[] = [];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register the device for push notifications with the given provider.
 *
 * This function resolves the device push token from the native platform,
 * then registers it with the RajutechieStreamKit backend so the server can deliver
 * push notifications through FCM or APNs.
 *
 * @param provider  - The push provider to use (`'fcm'` or `'apns'`).
 * @param client    - An authenticated `RajutechieStreamKitClient` instance.
 * @param getToken  - A function that resolves the native push token string.
 *                    This is injected so the SDK stays decoupled from any
 *                    specific push library (e.g. `@react-native-firebase/messaging`).
 * @returns The registered push token string.
 */
export async function registerForPushNotifications(
  provider: PushProvider,
  client: RajutechieStreamKitClient,
  getToken: () => Promise<string>,
): Promise<string> {
  const pushToken = await getToken();

  if (!pushToken) {
    throw new Error(
      `Failed to obtain a push token from the ${provider} provider. ` +
      'Ensure the device is configured for push notifications.',
    );
  }

  const platform: RegisterDeviceInput['platform'] =
    Platform.OS === 'ios' ? 'ios' : 'android';

  const deviceId = `${platform}-${pushToken.substring(0, 16)}`;

  // Register the device with the RajutechieStreamKit backend via the HTTP transport
  // exposed through the client. The core SDK's user model includes
  // `RegisterDeviceInput` which maps directly to the backend endpoint.
  const input: RegisterDeviceInput = {
    deviceId,
    platform,
    pushToken,
    pushProvider: provider,
  };

  // Register the device token with the StreamKit backend so the server can
  // deliver push notifications through FCM or APNs.
  await client.registerDevice(input);

  _registeredToken = pushToken;

  return pushToken;
}

/**
 * Register a handler for incoming push notifications.
 *
 * Multiple handlers can be registered; they will all be invoked in order.
 *
 * @param handler - Callback invoked with the notification payload.
 * @returns A cleanup function that removes this handler.
 */
export function handleNotification(handler: NotificationHandler): () => void {
  _notificationHandlers.push(handler);

  return () => {
    _notificationHandlers = _notificationHandlers.filter((h) => h !== handler);
  };
}

/**
 * Dispatch a notification payload to all registered handlers.
 *
 * Call this from your native push-notification listener (e.g. Firebase
 * `onMessage`, or `react-native-push-notification`'s `onNotification`).
 *
 * @param payload - The incoming notification payload.
 */
export function dispatchNotification(payload: PushNotificationPayload): void {
  for (const handler of _notificationHandlers) {
    try {
      handler(payload);
    } catch {
      // Swallow handler errors to avoid breaking the notification chain.
    }
  }
}

/**
 * Returns the most recently registered push token, or `null` if the device
 * has not been registered yet.
 */
export function getRegisteredToken(): string | null {
  return _registeredToken;
}

/**
 * Remove all registered notification handlers.
 * Useful for cleanup during app teardown or logout.
 */
export function clearNotificationHandlers(): void {
  _notificationHandlers = [];
}
