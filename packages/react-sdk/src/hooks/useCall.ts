import { useState, useEffect, useCallback, useRef } from 'react';
import type { Call, CallConfig, CallParticipant } from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

export interface UseCallResult {
  /** Current call object, or null if no active call. */
  call: Call | null;
  /** The local media stream (camera + mic). */
  localStream: MediaStream | null;
  /** Map of participant userId to their remote MediaStream. */
  remoteStreams: Map<string, MediaStream>;
  /** Whether local audio is currently enabled. */
  audioEnabled: boolean;
  /** Whether local video is currently enabled. */
  videoEnabled: boolean;
  /** Whether screen sharing is active. */
  screenSharing: boolean;
  /** Whether the call is being recorded. */
  recording: boolean;
  /** Toggle local audio on/off. */
  toggleAudio: () => void;
  /** Toggle local video on/off. */
  toggleVideo: () => void;
  /** Switch to next available camera. */
  switchCamera: () => void;
  /** Start sharing the screen. */
  startScreenShare: () => Promise<void>;
  /** Stop sharing the screen. */
  stopScreenShare: () => void;
  /** End the current call. */
  endCall: () => Promise<void>;
  /** Start recording the call. */
  startRecording: () => Promise<void>;
  /** Stop recording the call. */
  stopRecording: () => Promise<void>;
  /** Start a new call. */
  startCall: (config: CallConfig) => Promise<Call>;
  /** Accept an incoming call. */
  acceptCall: (callId: string) => Promise<void>;
  /** Reject an incoming call. */
  rejectCall: (callId: string, reason?: string) => Promise<void>;
  /** Error state, if any. */
  error: Error | null;
}

/**
 * Hook for managing a voice/video call.
 *
 * If a `callId` is provided, the hook fetches the call and subscribes to its
 * events. Otherwise it provides `startCall` to initiate a new call.
 *
 * @param callId - Optional ID of an existing call to connect to.
 *
 * @example
 * ```tsx
 * function CallScreen({ callId }: { callId: string }) {
 *   const {
 *     call, localStream, remoteStreams,
 *     toggleAudio, toggleVideo, endCall,
 *     audioEnabled, videoEnabled,
 *   } = useCall(callId);
 *
 *   return (
 *     <div>
 *       <video ref={el => { if (el && localStream) el.srcObject = localStream; }} muted autoPlay />
 *       <button onClick={toggleAudio}>{audioEnabled ? 'Mute' : 'Unmute'}</button>
 *       <button onClick={toggleVideo}>{videoEnabled ? 'Cam Off' : 'Cam On'}</button>
 *       <button onClick={endCall}>End</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCall(callId?: string): UseCallResult {
  const client = useRajutechieStreamKitClient();

  const [call, setCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const activeCallIdRef = useRef<string | undefined>(callId);

  // Keep the ref in sync
  activeCallIdRef.current = callId ?? call?.id;

  // ── Fetch existing call ──────────────────────────────────────

  useEffect(() => {
    if (!callId) return;

    let cancelled = false;

    client.call
      .get(callId)
      .then((fetchedCall) => {
        if (!cancelled) setCall(fetchedCall);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      });

    return () => {
      cancelled = true;
    };
  }, [client, callId]);

  // ── Acquire local media when call becomes active ─────────────

  useEffect(() => {
    const currentCallId = activeCallIdRef.current;
    if (!currentCallId || !call || call.status !== 'active') return;

    let cancelled = false;

    const acquireMedia = async () => {
      try {
        const stream = await client.devices.getUserMedia({
          audio: true,
          video: call.type === 'video',
        });
        if (!cancelled) {
          setLocalStream(stream);
          setAudioEnabled(true);
          setVideoEnabled(call.type === 'video');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    };

    acquireMedia();

    return () => {
      cancelled = true;
    };
  }, [client, call?.id, call?.status, call?.type]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Clean up streams on unmount ──────────────────────────────

  useEffect(() => {
    return () => {
      if (localStream) {
        client.devices.stopTracks(localStream);
      }
      if (screenStreamRef.current) {
        client.devices.stopTracks(screenStreamRef.current);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event subscriptions ──────────────────────────────────────

  useEffect(() => {
    const unsubAccepted = client.on('call.accepted', ({ callId: id }) => {
      if (id !== activeCallIdRef.current) return;
      setCall((prev) => (prev ? { ...prev, status: 'active' } : prev));
    });

    const unsubEnded = client.on('call.ended', ({ callId: id }) => {
      if (id !== activeCallIdRef.current) return;
      setCall((prev) => (prev ? { ...prev, status: 'ended' } : prev));

      // Clean up local media
      if (localStream) {
        client.devices.stopTracks(localStream);
        setLocalStream(null);
      }
      if (screenStreamRef.current) {
        client.devices.stopTracks(screenStreamRef.current);
        screenStreamRef.current = null;
        setScreenSharing(false);
      }
    });

    const unsubParticipantJoined = client.on(
      'call.participant.joined',
      (_participant: CallParticipant) => {
        if (_participant.callId !== activeCallIdRef.current) return;
        // In a real implementation this would coordinate with the
        // signaling layer to set up the RTCPeerConnection and obtain
        // the remote stream. Here we track the placeholder.
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          // Stream would be set once the WebRTC offer/answer completes.
          // For now we insert a placeholder entry that signals a new
          // participant has connected.
          if (!next.has(_participant.userId)) {
            next.set(_participant.userId, new MediaStream());
          }
          return next;
        });
      },
    );

    const unsubParticipantLeft = client.on(
      'call.participant.left',
      ({ callId: id, userId }) => {
        if (id !== activeCallIdRef.current) return;
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      },
    );

    const unsubRecordingStarted = client.on('call.recording.started', ({ callId: id }) => {
      if (id !== activeCallIdRef.current) return;
      setRecording(true);
    });

    const unsubRecordingStopped = client.on('call.recording.stopped', ({ callId: id }) => {
      if (id !== activeCallIdRef.current) return;
      setRecording(false);
    });

    return () => {
      unsubAccepted();
      unsubEnded();
      unsubParticipantJoined();
      unsubParticipantLeft();
      unsubRecordingStarted();
      unsubRecordingStopped();
    };
  }, [client, localStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    const newEnabled = !audioEnabled;
    audioTracks.forEach((track) => {
      track.enabled = newEnabled;
    });
    setAudioEnabled(newEnabled);

    const currentCallId = activeCallIdRef.current;
    if (currentCallId) {
      client.call.toggleAudio(currentCallId, newEnabled);
    }
  }, [client, localStream, audioEnabled]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    const newEnabled = !videoEnabled;
    videoTracks.forEach((track) => {
      track.enabled = newEnabled;
    });
    setVideoEnabled(newEnabled);

    const currentCallId = activeCallIdRef.current;
    if (currentCallId) {
      client.call.toggleVideo(currentCallId, newEnabled);
    }
  }, [client, localStream, videoEnabled]);

  const switchCamera = useCallback(() => {
    const currentCallId = activeCallIdRef.current;
    if (currentCallId) {
      client.call.switchCamera(currentCallId);
    }
  }, [client]);

  const startScreenShare = useCallback(async () => {
    const currentCallId = activeCallIdRef.current;
    if (!currentCallId) return;

    try {
      const stream = await client.devices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      setScreenSharing(true);
      client.call.startScreenShare(currentCallId);

      // Listen for the user stopping the share via the browser UI
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          screenStreamRef.current = null;
          setScreenSharing(false);
          client.call.stopScreenShare(currentCallId);
        };
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      client.devices.stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
    }
    setScreenSharing(false);

    const currentCallId = activeCallIdRef.current;
    if (currentCallId) {
      client.call.stopScreenShare(currentCallId);
    }
  }, [client]);

  const endCall = useCallback(async () => {
    const currentCallId = activeCallIdRef.current;
    if (!currentCallId) return;

    try {
      await client.call.end(currentCallId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }

    // Clean up local media
    if (localStream) {
      client.devices.stopTracks(localStream);
      setLocalStream(null);
    }
    if (screenStreamRef.current) {
      client.devices.stopTracks(screenStreamRef.current);
      screenStreamRef.current = null;
      setScreenSharing(false);
    }
  }, [client, localStream]);

  const startRecording = useCallback(async () => {
    const currentCallId = activeCallIdRef.current;
    if (!currentCallId) return;

    try {
      await client.call.startRecording(currentCallId);
      setRecording(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client]);

  const stopRecording = useCallback(async () => {
    const currentCallId = activeCallIdRef.current;
    if (!currentCallId) return;

    try {
      await client.call.stopRecording(currentCallId);
      setRecording(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client]);

  const startCall = useCallback(
    async (config: CallConfig): Promise<Call> => {
      try {
        const newCall = await client.call.start(config);
        setCall(newCall);
        activeCallIdRef.current = newCall.id;
        return newCall;
      } catch (err) {
        const wrappedError = err instanceof Error ? err : new Error(String(err));
        setError(wrappedError);
        throw wrappedError;
      }
    },
    [client],
  );

  const acceptCall = useCallback(
    async (id: string): Promise<void> => {
      try {
        await client.call.accept(id);
        activeCallIdRef.current = id;
        const fetchedCall = await client.call.get(id);
        setCall(fetchedCall);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client],
  );

  const rejectCall = useCallback(
    async (id: string, reason?: string): Promise<void> => {
      try {
        await client.call.reject(id, reason);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client],
  );

  return {
    call,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    screenSharing,
    recording,
    toggleAudio,
    toggleVideo,
    switchCamera,
    startScreenShare,
    stopScreenShare,
    endCall,
    startRecording,
    stopRecording,
    startCall,
    acceptCall,
    rejectCall,
    error,
  };
}
