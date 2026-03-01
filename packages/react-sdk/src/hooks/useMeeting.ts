import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Meeting,
  MeetingParticipant,
  MeetingPoll,
} from '@rajutechie-streamkit/core';
import { useRajutechieStreamKitClient } from '../provider';

export interface UseMeetingResult {
  /** Current meeting object, or null if not yet loaded. */
  meeting: Meeting | null;
  /** List of participants currently in the meeting. */
  participants: MeetingParticipant[];
  /** The local media stream (camera + mic). */
  localStream: MediaStream | null;
  /** Map of participant userId to their remote MediaStream. */
  remoteStreams: Map<string, MediaStream>;
  /** Whether local audio is currently enabled. */
  audioEnabled: boolean;
  /** Whether local video is currently enabled. */
  videoEnabled: boolean;
  /** Whether the current user has their hand raised. */
  handRaised: boolean;
  /** Active polls in this meeting. */
  polls: MeetingPoll[];
  /** Raise hand to request to speak. */
  raiseHand: () => void;
  /** Lower a previously raised hand. */
  lowerHand: () => void;
  /** Toggle local audio on/off. */
  toggleAudio: () => void;
  /** Toggle local video on/off. */
  toggleVideo: () => void;
  /** Leave the meeting gracefully. */
  leave: () => Promise<void>;
  /** Loading state for the initial meeting fetch. */
  loading: boolean;
  /** Error state, if any. */
  error: Error | null;
}

/**
 * Hook for managing participation in a RajutechieStreamKit meeting.
 *
 * Automatically joins the meeting on mount, acquires local media,
 * subscribes to real-time events (participants joining/leaving, hand
 * raises, polls), and leaves on unmount.
 *
 * @param meetingId - The meeting to join.
 *
 * @example
 * ```tsx
 * function MeetingRoom({ meetingId }: { meetingId: string }) {
 *   const {
 *     meeting, participants, localStream, remoteStreams,
 *     toggleAudio, toggleVideo, raiseHand, leave, polls,
 *     audioEnabled, videoEnabled,
 *   } = useMeeting(meetingId);
 *
 *   if (!meeting) return <p>Joining meeting...</p>;
 *
 *   return (
 *     <div>
 *       <h2>{meeting.title}</h2>
 *       <p>{participants.length} participants</p>
 *       <button onClick={toggleAudio}>{audioEnabled ? 'Mute' : 'Unmute'}</button>
 *       <button onClick={toggleVideo}>{videoEnabled ? 'Cam Off' : 'Cam On'}</button>
 *       <button onClick={raiseHand}>Raise Hand</button>
 *       <button onClick={leave}>Leave</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMeeting(meetingId: string): UseMeetingResult {
  const client = useRajutechieStreamKitClient();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [polls, setPolls] = useState<MeetingPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  // ── Join meeting + acquire media ─────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        // Fetch meeting details
        const meetingData = await client.meeting.get(meetingId);
        if (cancelled) return;
        setMeeting(meetingData);

        // Join the meeting
        await client.meeting.join(meetingId);
        if (cancelled) return;

        // Acquire local media
        const muteOnJoin = meetingData.settings?.muteOnJoin ?? false;
        const stream = await client.devices.getUserMedia({
          audio: true,
          video: true,
        });
        if (cancelled) {
          client.devices.stopTracks(stream);
          return;
        }

        // Apply muteOnJoin setting
        if (muteOnJoin) {
          stream.getAudioTracks().forEach((t) => { t.enabled = false; });
          setAudioEnabled(false);
        } else {
          setAudioEnabled(true);
        }
        setVideoEnabled(true);

        localStreamRef.current = stream;
        setLocalStream(stream);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      cancelled = true;

      // Clean up local media
      if (localStreamRef.current) {
        client.devices.stopTracks(localStreamRef.current);
        localStreamRef.current = null;
      }

      // Leave the meeting
      client.meeting.leave(meetingId).catch(() => {});
    };
  }, [client, meetingId]);

  // ── Real-time event subscriptions ────────────────────────────

  useEffect(() => {
    const unsubParticipantJoined = client.on(
      'meeting.participant.joined',
      (participant: MeetingParticipant) => {
        if (participant.meetingId !== meetingId) return;
        setParticipants((prev) => {
          // Avoid duplicates
          if (prev.some((p) => p.userId === participant.userId)) {
            return prev.map((p) => (p.userId === participant.userId ? participant : p));
          }
          return [...prev, participant];
        });

        // Add placeholder remote stream
        setRemoteStreams((prev) => {
          if (prev.has(participant.userId)) return prev;
          const next = new Map(prev);
          next.set(participant.userId, new MediaStream());
          return next;
        });
      },
    );

    const unsubParticipantLeft = client.on(
      'meeting.participant.left',
      ({ meetingId: id, userId }) => {
        if (id !== meetingId) return;
        setParticipants((prev) => prev.filter((p) => p.userId !== userId));
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      },
    );

    const unsubParticipantMuted = client.on(
      'meeting.participant.muted',
      ({ meetingId: id, userId }) => {
        if (id !== meetingId) return;
        setParticipants((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, isMuted: true } : p)),
        );
      },
    );

    const unsubHandRaised = client.on(
      'meeting.hand.raised',
      ({ meetingId: id, userId }) => {
        if (id !== meetingId) return;
        setParticipants((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, handRaised: true } : p)),
        );
      },
    );

    const unsubHandLowered = client.on(
      'meeting.hand.lowered',
      ({ meetingId: id, userId }) => {
        if (id !== meetingId) return;
        setParticipants((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, handRaised: false } : p)),
        );
      },
    );

    const unsubPollCreated = client.on(
      'meeting.poll.created',
      (poll: MeetingPoll) => {
        if (poll.meetingId !== meetingId) return;
        setPolls((prev) => [...prev, poll]);
      },
    );

    const unsubPollResult = client.on(
      'meeting.poll.result',
      (poll: MeetingPoll) => {
        if (poll.meetingId !== meetingId) return;
        setPolls((prev) =>
          prev.map((p) => (p.id === poll.id ? poll : p)),
        );
      },
    );

    const unsubMeetingEnded = client.on(
      'meeting.ended',
      ({ meetingId: id }) => {
        if (id !== meetingId) return;
        setMeeting((prev) => (prev ? { ...prev, status: 'ended' } : prev));

        // Clean up local media
        if (localStreamRef.current) {
          client.devices.stopTracks(localStreamRef.current);
          localStreamRef.current = null;
          setLocalStream(null);
        }
      },
    );

    return () => {
      unsubParticipantJoined();
      unsubParticipantLeft();
      unsubParticipantMuted();
      unsubHandRaised();
      unsubHandLowered();
      unsubPollCreated();
      unsubPollResult();
      unsubMeetingEnded();
    };
  }, [client, meetingId]);

  // ── Actions ──────────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const newEnabled = !audioEnabled;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = newEnabled;
    });
    setAudioEnabled(newEnabled);
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;

    const newEnabled = !videoEnabled;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = newEnabled;
    });
    setVideoEnabled(newEnabled);
  }, [videoEnabled]);

  const raiseHand = useCallback(() => {
    client.meeting.raiseHand(meetingId);
    setHandRaised(true);
  }, [client, meetingId]);

  const lowerHand = useCallback(() => {
    client.meeting.lowerHand(meetingId);
    setHandRaised(false);
  }, [client, meetingId]);

  const leave = useCallback(async () => {
    try {
      // Stop local media
      if (localStreamRef.current) {
        client.devices.stopTracks(localStreamRef.current);
        localStreamRef.current = null;
        setLocalStream(null);
      }

      await client.meeting.leave(meetingId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client, meetingId]);

  return {
    meeting,
    participants,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    handRaised,
    polls,
    raiseHand,
    lowerHand,
    toggleAudio,
    toggleVideo,
    leave,
    loading,
    error,
  };
}
