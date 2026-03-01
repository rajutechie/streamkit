/**
 * React Native `VideoView` component.
 *
 * Renders a WebRTC video stream via the `RTCView` component from
 * `react-native-webrtc`. Supports mirroring (front camera), object-fit
 * modes, and custom styles.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { RTCView, MediaStream as RNMediaStream } from 'react-native-webrtc';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Object-fit modes supported by `VideoView`. */
export type VideoObjectFit = 'contain' | 'cover';

/** Props for the {@link VideoView} component. */
export interface VideoViewProps {
  /** The `MediaStream` to render (from `react-native-webrtc`). */
  stream: RNMediaStream | null;
  /**
   * Mirror the video horizontally. Typically `true` for the local
   * front-camera preview.
   *
   * @default false
   */
  mirror?: boolean;
  /**
   * How the video should be fitted within its container.
   *
   * - `'cover'` - fills the container, possibly cropping edges.
   * - `'contain'` - fits entirely within the container with letterboxing.
   *
   * @default 'cover'
   */
  objectFit?: VideoObjectFit;
  /**
   * Additional styles applied to the outer `View` container.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * If `true`, the video layer does not receive touch events, allowing
   * touches to pass through to components underneath.
   *
   * @default false
   */
  pointerEvents?: 'auto' | 'none' | 'box-none' | 'box-only';
  /**
   * Z-order for the video surface on Android.
   * Use `zOrder={1}` to render above other views.
   *
   * @default 0
   */
  zOrder?: number;
  /**
   * Test ID for snapshot / integration testing.
   */
  testID?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders a React Native WebRTC video stream.
 *
 * @example
 * ```tsx
 * <VideoView
 *   stream={localStream}
 *   mirror
 *   objectFit="cover"
 *   style={{ width: 200, height: 200, borderRadius: 12 }}
 * />
 * ```
 */
export function VideoView({
  stream,
  mirror = false,
  objectFit = 'cover',
  style,
  pointerEvents = 'auto',
  zOrder = 0,
  testID,
}: VideoViewProps): React.JSX.Element {
  const streamURL = useMemo(() => {
    if (!stream) return '';
    // react-native-webrtc streams expose a `toURL()` method.
    return (stream as RNMediaStream & { toURL: () => string }).toURL();
  }, [stream]);

  const containerStyle = useMemo<StyleProp<ViewStyle>>(
    () => [styles.container, style],
    [style],
  );

  const videoTransform = useMemo(
    () => (mirror ? [{ scaleX: -1 }] : undefined),
    [mirror],
  );

  if (!stream || !streamURL) {
    return (
      <View style={containerStyle} testID={testID}>
        <View style={styles.placeholder} />
      </View>
    );
  }

  return (
    <View style={containerStyle} pointerEvents={pointerEvents} testID={testID}>
      <RTCView
        streamURL={streamURL}
        style={[styles.video, videoTransform ? { transform: videoTransform } : undefined]}
        objectFit={objectFit}
        zOrder={zOrder}
        mirror={mirror}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
});

export default VideoView;
