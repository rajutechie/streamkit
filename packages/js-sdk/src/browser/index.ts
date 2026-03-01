/**
 * Browser-specific utilities barrel export.
 *
 * This entry point is available as `@rajutechie-streamkit/js-sdk/browser` and
 * contains helpers that only make sense in a browser environment.
 */

export {
  getBrowserCapabilities,
  createPeerConnection,
  attachMediaStream,
} from './media';
export type { BrowserCapabilities, PeerConnectionConfig, SupportedCodecs } from './media';

export {
  requestNotificationPermission,
  showNotification,
  getServiceWorkerRegistration,
} from './notifications';
export type { BrowserNotificationOptions } from './notifications';
