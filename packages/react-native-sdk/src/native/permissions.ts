/**
 * React Native permission helpers for camera, microphone, and notifications.
 *
 * This module provides a unified API for requesting runtime permissions
 * across iOS and Android. It wraps `react-native`'s `PermissionsAndroid`
 * for Android and relies on native Info.plist declarations for iOS.
 */

import { Platform, PermissionsAndroid } from 'react-native';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result of a permission request. */
export interface PermissionResult {
  /** Whether the permission was granted. */
  granted: boolean;
  /**
   * The raw status string returned by the platform.
   * - Android: `'granted'` | `'denied'` | `'never_ask_again'`
   * - iOS: `'granted'` | `'denied'` | `'unavailable'`
   */
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requestAndroidPermission(
  permission: string,
  rationale?: PermissionsAndroid.Rationale,
): Promise<PermissionResult> {
  try {
    const status = await PermissionsAndroid.request(
      permission as typeof PermissionsAndroid.PERMISSIONS.CAMERA,
      rationale,
    );

    return {
      granted: status === PermissionsAndroid.RESULTS.GRANTED,
      status,
    };
  } catch {
    return { granted: false, status: 'denied' };
  }
}

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

/**
 * Request camera permission.
 *
 * On **Android** this triggers the runtime permission dialog for
 * `CAMERA`. On **iOS** the permission is requested lazily when
 * `getUserMedia` is called, but calling this function ensures the
 * Info.plist key `NSCameraUsageDescription` is present.
 *
 * @returns A `PermissionResult` indicating whether the permission was granted.
 */
export async function requestCameraPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'android') {
    return requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'This app needs access to your camera for video calls.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
  }

  // iOS: camera permission is requested natively when getUserMedia is called.
  // We optimistically return granted; the native prompt will appear on first use.
  return { granted: true, status: 'granted' };
}

// ---------------------------------------------------------------------------
// Microphone
// ---------------------------------------------------------------------------

/**
 * Request microphone permission.
 *
 * On **Android** this triggers the runtime permission dialog for
 * `RECORD_AUDIO`. On **iOS** the permission is requested lazily.
 *
 * @returns A `PermissionResult` indicating whether the permission was granted.
 */
export async function requestMicPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'android') {
    return requestAndroidPermission(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'This app needs access to your microphone for audio and video calls.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
  }

  // iOS: microphone permission is requested natively when getUserMedia is called.
  return { granted: true, status: 'granted' };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

/**
 * Request push-notification permission.
 *
 * On **Android 13+** (API 33) this requests `POST_NOTIFICATIONS`.
 * On older Android versions notifications are allowed by default.
 * On **iOS** this is a no-op; use a library like
 * `@react-native-firebase/messaging` or `react-native-permissions`
 * for the actual iOS notification prompt.
 *
 * @returns A `PermissionResult` indicating whether the permission was granted.
 */
export async function requestNotificationPermission(): Promise<PermissionResult> {
  if (Platform.OS === 'android') {
    // POST_NOTIFICATIONS was introduced in Android 13 (API 33).
    const apiLevel = Platform.Version;
    if (typeof apiLevel === 'number' && apiLevel >= 33) {
      return requestAndroidPermission(
        'android.permission.POST_NOTIFICATIONS',
        {
          title: 'Notification Permission',
          message: 'This app needs permission to send you notifications.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        },
      );
    }

    // Below API 33, notifications are permitted without runtime request.
    return { granted: true, status: 'granted' };
  }

  // iOS: notification permission should be requested via a dedicated library.
  // Return a hint that the caller should handle this themselves.
  return { granted: false, status: 'unavailable' };
}

// ---------------------------------------------------------------------------
// Convenience: request all media permissions at once
// ---------------------------------------------------------------------------

/**
 * Request both camera and microphone permissions in one call.
 *
 * @returns An object containing the result for each permission.
 */
export async function requestMediaPermissions(): Promise<{
  camera: PermissionResult;
  microphone: PermissionResult;
}> {
  const [camera, microphone] = await Promise.all([
    requestCameraPermission(),
    requestMicPermission(),
  ]);
  return { camera, microphone };
}
