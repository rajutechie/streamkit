/**
 * Browser push notification helpers.
 *
 * Provides a thin wrapper around the Notification API and Service Worker
 * registration for web push support.
 */

// ── Types ──────────────────────────────────────────────────────

export interface BrowserNotificationOptions {
  /** Body text of the notification. */
  body?: string;
  /** URL to an icon image. */
  icon?: string;
  /** URL to a badge image (small monochrome icon on Android). */
  badge?: string;
  /** URL to a larger image displayed in the notification. */
  image?: string;
  /** The notification's language tag (e.g. "en-US"). */
  lang?: string;
  /** Text direction: "auto", "ltr", or "rtl". */
  dir?: NotificationDirection;
  /** A tag to group related notifications (replaces previous with same tag). */
  tag?: string;
  /** Whether to re-notify even if a notification with the same tag exists. */
  renotify?: boolean;
  /** Whether the notification should remain active until the user clicks / dismisses it. */
  requireInteraction?: boolean;
  /** Vibration pattern (array of milliseconds: vibrate, pause, vibrate, ...). */
  vibrate?: number[];
  /** Silent notification flag. */
  silent?: boolean;
  /** Arbitrary data to attach to the notification. */
  data?: unknown;
  /** Actions the user can take from the notification. */
  actions?: NotificationAction[];
  /** Callback invoked when the user clicks the notification. */
  onClick?: (event: Event) => void;
  /** Callback invoked when the notification is closed. */
  onClose?: (event: Event) => void;
  /** Callback invoked when there is an error showing the notification. */
  onError?: (event: Event) => void;
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// ── requestNotificationPermission ──────────────────────────────

/**
 * Request permission to display browser notifications.
 *
 * @returns The resulting `NotificationPermission`:
 *   - `"granted"` - the user allowed notifications.
 *   - `"denied"` - the user blocked notifications.
 *   - `"default"` - the user dismissed the prompt.
 * @throws If the Notification API is not available.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') {
    throw new Error(
      'Notification API is not available in this environment.',
    );
  }

  // If permission was already decided, return the existing value.
  if (Notification.permission !== 'default') {
    return Notification.permission;
  }

  return Notification.requestPermission();
}

// ── showNotification ───────────────────────────────────────────

/**
 * Display a browser notification.
 *
 * If a service worker is registered and active, the notification is
 * dispatched through `ServiceWorkerRegistration.showNotification` so
 * that it works even when the tab is in the background. Otherwise it
 * falls back to the basic `new Notification()` constructor.
 *
 * @param title   - The notification title.
 * @param options - Optional notification configuration.
 * @returns The `Notification` instance (when using the fallback path) or
 *          `undefined` (when dispatched via service worker).
 * @throws If the Notification API is unavailable or permission is not granted.
 */
export async function showNotification(
  title: string,
  options: BrowserNotificationOptions = {},
): Promise<Notification | undefined> {
  if (typeof Notification === 'undefined') {
    throw new Error(
      'Notification API is not available in this environment.',
    );
  }

  if (Notification.permission !== 'granted') {
    throw new Error(
      `Cannot show notification: permission is "${Notification.permission}". ` +
      'Call requestNotificationPermission() first.',
    );
  }

  // Destructure callbacks (not valid for the native constructor)
  const { onClick, onClose, onError, ...nativeOptions } = options;

  // Prefer the service worker path for background-compatible notifications
  const registration = await getServiceWorkerRegistration();
  if (registration) {
    await registration.showNotification(title, nativeOptions as NotificationOptions);
    return undefined;
  }

  // Fallback: basic Notification constructor
  const notification = new Notification(title, nativeOptions as NotificationOptions);

  if (onClick) {
    notification.onclick = onClick;
  }
  if (onClose) {
    notification.onclose = onClose;
  }
  if (onError) {
    notification.onerror = onError;
  }

  return notification;
}

// ── getServiceWorkerRegistration ───────────────────────────────

/**
 * Retrieve the active service worker registration, if one exists.
 *
 * This is useful for subscribing to Web Push and for dispatching
 * notifications through the service worker (which allows them to
 * appear even when the tab is backgrounded).
 *
 * @returns The `ServiceWorkerRegistration` or `null` if none is available.
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  ) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration ?? null;
  } catch {
    // Service Worker not supported or no registration found
    return null;
  }
}
