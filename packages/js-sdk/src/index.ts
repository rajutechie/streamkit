/**
 * @rajutechie-streamkit/js-sdk
 *
 * Browser-optimized SDK for RajutechieStreamKit real-time communication.
 * Re-exports everything from @rajutechie-streamkit/core and adds browser-specific
 * utilities and a convenience wrapper class.
 */

// Re-export the entire core surface so consumers only need @rajutechie-streamkit/js-sdk
export * from '@rajutechie-streamkit/core';

// Override / augment with browser-specific convenience wrapper
export { RajutechieStreamKit } from './rajutechie-streamkit';

// Browser helpers
export {
  getBrowserCapabilities,
  createPeerConnection,
  attachMediaStream,
} from './browser/media';

export type { BrowserCapabilities, PeerConnectionConfig } from './browser/media';

export {
  requestNotificationPermission,
  showNotification,
  getServiceWorkerRegistration,
} from './browser/notifications';

export type { BrowserNotificationOptions } from './browser/notifications';
