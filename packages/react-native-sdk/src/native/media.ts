/**
 * React Native specific WebRTC media utilities.
 *
 * Wraps the `react-native-webrtc` package to provide camera/mic access
 * and camera-switching helpers that work on iOS and Android.
 */

import {
  mediaDevices,
  MediaStream as RNMediaStream,
} from 'react-native-webrtc';

/** Constraints accepted by {@link getNativeMediaStream}. */
export interface NativeMediaConstraints {
  audio?: boolean | MediaTrackConstraints;
  video?:
    | boolean
    | (MediaTrackConstraints & {
        /** `'user'` for front, `'environment'` for back camera. */
        facingMode?: 'user' | 'environment';
        /** Desired width in pixels. */
        width?: number | { min?: number; ideal?: number; max?: number };
        /** Desired height in pixels. */
        height?: number | { min?: number; ideal?: number; max?: number };
        /** Desired frame rate. */
        frameRate?: number | { min?: number; ideal?: number; max?: number };
      });
}

/**
 * Acquire a camera and/or microphone stream through `react-native-webrtc`.
 *
 * @param constraints - Media constraints. Defaults to front camera + audio.
 * @returns A `MediaStream` from `react-native-webrtc`.
 */
export async function getNativeMediaStream(
  constraints: NativeMediaConstraints = { audio: true, video: { facingMode: 'user' } },
): Promise<RNMediaStream> {
  const resolvedConstraints: Record<string, unknown> = {};

  if (constraints.audio !== undefined) {
    resolvedConstraints['audio'] = constraints.audio;
  } else {
    resolvedConstraints['audio'] = true;
  }

  if (constraints.video !== undefined) {
    resolvedConstraints['video'] = constraints.video;
  } else {
    resolvedConstraints['video'] = { facingMode: 'user' };
  }

  const stream = await mediaDevices.getUserMedia(resolvedConstraints);

  if (!stream) {
    throw new Error(
      'Failed to acquire media stream. Ensure camera/microphone permissions are granted.',
    );
  }

  return stream as RNMediaStream;
}

/**
 * Switch between the front and back camera on the given stream.
 *
 * This stops the existing video track, acquires a new stream with the opposite
 * facing mode, and returns the replacement stream. The audio track from the
 * original stream is preserved.
 *
 * @param currentStream - The active `MediaStream` whose video track should be replaced.
 * @returns A new `MediaStream` using the opposite camera.
 */
export async function switchCamera(
  currentStream: RNMediaStream,
): Promise<RNMediaStream> {
  const videoTrack = currentStream.getVideoTracks()[0];

  if (!videoTrack) {
    throw new Error('No video track found on the current stream.');
  }

  // Determine the current facing mode so we can toggle it.
  const settings = videoTrack.getSettings?.() as Record<string, unknown> | undefined;
  const currentFacing = (settings?.['facingMode'] as string) ?? 'user';
  const nextFacing = currentFacing === 'user' ? 'environment' : 'user';

  // Stop the old video track before acquiring a new one.
  videoTrack.stop();

  const newStream = await mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: nextFacing },
  });

  if (!newStream) {
    throw new Error('Failed to acquire replacement camera stream.');
  }

  const rnNewStream = newStream as RNMediaStream;

  // Build a composite stream: new video + existing audio.
  const audioTracks = currentStream.getAudioTracks();
  const compositeStream = new RNMediaStream(undefined as unknown as string);

  for (const audioTrack of audioTracks) {
    compositeStream.addTrack(audioTrack);
  }

  for (const newVideoTrack of rnNewStream.getVideoTracks()) {
    compositeStream.addTrack(newVideoTrack);
  }

  return compositeStream;
}

/**
 * Stop all tracks on a given stream (both audio and video).
 *
 * @param stream - The stream to release.
 */
export function releaseStream(stream: RNMediaStream): void {
  const tracks = stream.getTracks();
  for (const track of tracks) {
    track.stop();
  }
}
