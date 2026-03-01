/**
 * Browser-specific WebRTC and media helpers.
 *
 * These utilities detect capabilities, simplify RTCPeerConnection creation,
 * and provide helpers for attaching streams to <video> elements.
 */

// ── Types ──────────────────────────────────────────────────────

export interface BrowserCapabilities {
  /** Whether the browser supports the WebRTC APIs. */
  webrtc: boolean;
  /** Whether getUserMedia (camera / mic) is available. */
  getUserMedia: boolean;
  /** Whether getDisplayMedia (screen sharing) is available. */
  getDisplayMedia: boolean;
  /** Whether the Web Audio API is available. */
  webAudio: boolean;
  /** Whether MediaRecorder (local recording) is available. */
  mediaRecorder: boolean;
  /** Whether the Insertable Streams API (e.g. for E2EE) is available. */
  insertableStreams: boolean;
  /** Codecs supported by the browser for sending. */
  supportedCodecs: SupportedCodecs;
}

export interface SupportedCodecs {
  audio: string[];
  video: string[];
}

export interface PeerConnectionConfig {
  /** ICE servers to use (STUN / TURN). Falls back to Google STUN if omitted. */
  iceServers?: RTCIceServer[];
  /** ICE transport policy. Defaults to `'all'`. */
  iceTransportPolicy?: RTCIceTransportPolicy;
  /** Bundle policy. Defaults to `'max-bundle'`. */
  bundlePolicy?: RTCBundlePolicy;
  /** RTCP mux policy. Defaults to `'require'`. */
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
  /** If `true`, use Unified Plan SDP semantics (default). */
  sdpSemantics?: 'unified-plan' | 'plan-b';
}

// ── Default ICE Servers ────────────────────────────────────────

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// ── getBrowserCapabilities ─────────────────────────────────────

/**
 * Detect the current browser's WebRTC-related capabilities.
 *
 * @returns A `BrowserCapabilities` object describing what the browser supports.
 */
export function getBrowserCapabilities(): BrowserCapabilities {
  const hasNavigator = typeof navigator !== 'undefined';
  const hasWindow = typeof window !== 'undefined';

  const webrtc =
    hasWindow &&
    typeof RTCPeerConnection !== 'undefined';

  const getUserMedia =
    hasNavigator &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function';

  const getDisplayMedia =
    hasNavigator &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function';

  const webAudio =
    hasWindow &&
    (typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined');

  const mediaRecorder =
    hasWindow &&
    typeof MediaRecorder !== 'undefined';

  const insertableStreams =
    hasWindow &&
    typeof (RTCRtpSender as any).prototype?.createEncodedStreams === 'function';

  const supportedCodecs = detectSupportedCodecs();

  return {
    webrtc,
    getUserMedia,
    getDisplayMedia,
    webAudio,
    mediaRecorder,
    insertableStreams,
    supportedCodecs,
  };
}

/**
 * Detect supported audio/video codecs using the static
 * `RTCRtpSender.getCapabilities` method if available.
 */
function detectSupportedCodecs(): SupportedCodecs {
  const result: SupportedCodecs = { audio: [], video: [] };

  if (typeof RTCRtpSender === 'undefined' || typeof RTCRtpSender.getCapabilities !== 'function') {
    return result;
  }

  try {
    const audioCapabilities = RTCRtpSender.getCapabilities('audio');
    if (audioCapabilities?.codecs) {
      const seen = new Set<string>();
      for (const codec of audioCapabilities.codecs) {
        const name = codec.mimeType.split('/')[1];
        if (name && !seen.has(name)) {
          seen.add(name);
          result.audio.push(name);
        }
      }
    }
  } catch {
    // Capabilities not available - leave empty
  }

  try {
    const videoCapabilities = RTCRtpSender.getCapabilities('video');
    if (videoCapabilities?.codecs) {
      const seen = new Set<string>();
      for (const codec of videoCapabilities.codecs) {
        const name = codec.mimeType.split('/')[1];
        if (name && !seen.has(name)) {
          seen.add(name);
          result.video.push(name);
        }
      }
    }
  } catch {
    // Capabilities not available - leave empty
  }

  return result;
}

// ── createPeerConnection ───────────────────────────────────────

/**
 * Create an `RTCPeerConnection` with sensible defaults.
 *
 * @param config - Optional configuration overrides.
 * @returns A configured `RTCPeerConnection` instance.
 * @throws If `RTCPeerConnection` is not available in the current environment.
 */
export function createPeerConnection(config: PeerConnectionConfig = {}): RTCPeerConnection {
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error(
      'RTCPeerConnection is not available. Ensure you are running in a browser environment that supports WebRTC.',
    );
  }

  const rtcConfig: RTCConfiguration = {
    iceServers: config.iceServers ?? DEFAULT_ICE_SERVERS,
    iceTransportPolicy: config.iceTransportPolicy ?? 'all',
    bundlePolicy: config.bundlePolicy ?? 'max-bundle',
    rtcpMuxPolicy: config.rtcpMuxPolicy ?? 'require',
  };

  return new RTCPeerConnection(rtcConfig);
}

// ── attachMediaStream ──────────────────────────────────────────

/**
 * Attach a `MediaStream` to an `HTMLVideoElement`, handling autoplay
 * policies and muted-for-local-preview automatically.
 *
 * @param element  - The `<video>` element to render the stream into.
 * @param stream   - The `MediaStream` to attach.
 * @param options  - Optional settings (mirror for selfie view, muted).
 */
export function attachMediaStream(
  element: HTMLVideoElement,
  stream: MediaStream,
  options: { mirror?: boolean; muted?: boolean } = {},
): void {
  // Set srcObject
  element.srcObject = stream;

  // Mute by default for local preview to avoid echo
  if (options.muted !== undefined) {
    element.muted = options.muted;
  }

  // Mirror (flip horizontally) for local camera preview
  if (options.mirror) {
    element.style.transform = 'scaleX(-1)';
  } else {
    element.style.transform = '';
  }

  // Attempt autoplay. Browsers may block unmuted autoplay, so we set
  // playsInline and catch + suppress the play() rejection.
  element.playsInline = true;
  element.autoplay = true;

  const playPromise = element.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {
      // Autoplay was prevented. The video will remain paused until
      // the user interacts with the page or the element is muted.
    });
  }
}
