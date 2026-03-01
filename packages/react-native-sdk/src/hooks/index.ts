/**
 * React Native hooks for RajutechieStreamKit.
 *
 * This module provides hooks that are specifically tailored for
 * React Native, using `react-native-webrtc` for media handling.
 *
 * For presence and other non-media hooks, consumers should use
 * the hooks from `@rajutechie-streamkit/react-sdk` which are fully
 * compatible with React Native's JS runtime.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  RajutechieStreamKitClient,
  Call,
  CallConfig,
  CallParticipant,
  ConnectionState,
  Message,
  MessageInput,
  TypingEvent,
  Meeting,
  MeetingParticipant,
  MeetingPoll,
} from '@rajutechie-streamkit/core';
import { MediaStream as RNMediaStream } from 'react-native-webrtc';
import { getNativeMediaStream, switchCamera, releaseStream } from '../native/media';

// ---------------------------------------------------------------------------
// useRajutechieStreamKitConnection
// ---------------------------------------------------------------------------

/**
 * Hook that tracks the connection state of a `RajutechieStreamKitClient`.
 *
 * @param client - An initialised `RajutechieStreamKitClient` instance.
 * @returns The current `ConnectionState`.
 */
export function useRajutechieStreamKitConnection(client: RajutechieStreamKitClient): ConnectionState {
  const [state, setState] = useState<ConnectionState>(client.connectionState);

  useEffect(() => {
    const unsubscribe = client.on('connection.changed', ({ state: newState }) => {
      setState(newState);
    });
    return unsubscribe;
  }, [client]);

  return state;
}

// ---------------------------------------------------------------------------
// useNativeCall
// ---------------------------------------------------------------------------

/** State exposed by the {@link useNativeCall} hook. */
export interface NativeCallState {
  /** The current call object, or `null` if no call is active. */
  call: Call | null;
  /** Local media stream from the device camera/mic. */
  localStream: RNMediaStream | null;
  /** Remote media streams keyed by participant user ID. */
  remoteStreams: Map<string, RNMediaStream>;
  /** List of call participants. */
  participants: CallParticipant[];
  /** Whether the local audio track is enabled. */
  isAudioEnabled: boolean;
  /** Whether the local video track is enabled. */
  isVideoEnabled: boolean;
  /** Whether a call is currently in progress. */
  isActive: boolean;
  /** Any error that occurred during the call lifecycle. */
  error: Error | null;
}

/** Actions exposed by the {@link useNativeCall} hook. */
export interface NativeCallActions {
  /** Start a new call. */
  startCall: (config: CallConfig) => Promise<void>;
  /** Accept an incoming call by ID. */
  acceptCall: (callId: string) => Promise<void>;
  /** Reject an incoming call by ID. */
  rejectCall: (callId: string) => Promise<void>;
  /** End the current call. */
  endCall: () => Promise<void>;
  /** Toggle the local audio track on/off. */
  toggleAudio: () => void;
  /** Toggle the local video track on/off. */
  toggleVideo: () => void;
  /** Switch between the front and back camera. */
  flipCamera: () => Promise<void>;
}

/**
 * React Native specific call hook that manages a call lifecycle using
 * `react-native-webrtc` for media streams.
 *
 * @param client - An authenticated `RajutechieStreamKitClient` instance.
 * @param callId - Optional call ID to observe. If provided the hook will
 *                 fetch the existing call on mount.
 * @returns A tuple of `[state, actions]`.
 */
export function useNativeCall(
  client: RajutechieStreamKitClient,
  callId?: string,
): [NativeCallState, NativeCallActions] {
  const [call, setCall] = useState<Call | null>(null);
  const [localStream, setLocalStream] = useState<RNMediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RNMediaStream>>(
    new Map(),
  );
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const activeCallId = useRef<string | null>(callId ?? null);

  // ── Fetch existing call on mount ──
  useEffect(() => {
    if (!callId) return;

    let cancelled = false;

    client.call
      .get(callId)
      .then((existingCall) => {
        if (!cancelled) {
          setCall(existingCall);
          activeCallId.current = existingCall.id;
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [client, callId]);

  // ── Subscribe to call events ──
  useEffect(() => {
    const unsubIncoming = client.on('call.incoming', (data) => {
      if (!activeCallId.current) {
        setCall(data);
        activeCallId.current = data.id;
        setParticipants(data.participants ?? []);
      }
    });

    const unsubAccepted = client.on('call.accepted', ({ callId: cid }) => {
      if (cid === activeCallId.current && call) {
        setCall({ ...call, status: 'active' });
      }
    });

    const unsubEnded = client.on('call.ended', ({ callId: cid }) => {
      if (cid === activeCallId.current) {
        cleanup();
      }
    });

    const unsubParticipantJoined = client.on(
      'call.participant.joined',
      (participant) => {
        if (participant.callId === activeCallId.current) {
          setParticipants((prev) => [...prev, participant]);
        }
      },
    );

    const unsubParticipantLeft = client.on(
      'call.participant.left',
      ({ callId: cid, userId }) => {
        if (cid === activeCallId.current) {
          setParticipants((prev) => prev.filter((p) => p.userId !== userId));
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            const stream = next.get(userId);
            if (stream) {
              releaseStream(stream);
              next.delete(userId);
            }
            return next;
          });
        }
      },
    );

    return () => {
      unsubIncoming();
      unsubAccepted();
      unsubEnded();
      unsubParticipantJoined();
      unsubParticipantLeft();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, call]);

  // ── Cleanup helper ──
  const cleanup = useCallback(() => {
    if (localStream) {
      releaseStream(localStream);
      setLocalStream(null);
    }
    for (const [, stream] of remoteStreams) {
      releaseStream(stream);
    }
    setRemoteStreams(new Map());
    setCall(null);
    setParticipants([]);
    activeCallId.current = null;
    setIsAudioEnabled(true);
    setIsVideoEnabled(true);
  }, [localStream, remoteStreams]);

  // ── Actions ──

  const startCall = useCallback(
    async (config: CallConfig) => {
      try {
        setError(null);

        // Acquire local media before starting the call.
        const stream = await getNativeMediaStream({
          audio: true,
          video: config.type === 'video' ? { facingMode: 'user' } : false,
        });
        setLocalStream(stream);

        const newCall = await client.call.start(config);
        setCall(newCall);
        activeCallId.current = newCall.id;
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client],
  );

  const acceptCall = useCallback(
    async (cid: string) => {
      try {
        setError(null);

        const stream = await getNativeMediaStream({
          audio: true,
          video: call?.type === 'video' ? { facingMode: 'user' } : false,
        });
        setLocalStream(stream);

        await client.call.accept(cid);
        activeCallId.current = cid;

        if (call) {
          setCall({ ...call, status: 'active' });
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client, call],
  );

  const rejectCall = useCallback(
    async (cid: string) => {
      try {
        setError(null);
        await client.call.reject(cid);
        cleanup();
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [client, cleanup],
  );

  const endCall = useCallback(async () => {
    try {
      setError(null);
      if (activeCallId.current) {
        await client.call.end(activeCallId.current);
      }
      cleanup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client, cleanup]);

  const toggleAudio = useCallback(() => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    const nextEnabled = !isAudioEnabled;
    for (const track of audioTracks) {
      track.enabled = nextEnabled;
    }
    setIsAudioEnabled(nextEnabled);

    if (activeCallId.current) {
      client.call.toggleAudio(activeCallId.current, nextEnabled);
    }
  }, [client, localStream, isAudioEnabled]);

  const toggleVideo = useCallback(() => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    const nextEnabled = !isVideoEnabled;
    for (const track of videoTracks) {
      track.enabled = nextEnabled;
    }
    setIsVideoEnabled(nextEnabled);

    if (activeCallId.current) {
      client.call.toggleVideo(activeCallId.current, nextEnabled);
    }
  }, [client, localStream, isVideoEnabled]);

  const flipCamera = useCallback(async () => {
    if (!localStream) return;

    try {
      const newStream = await switchCamera(localStream);
      setLocalStream(newStream);

      if (activeCallId.current) {
        client.call.switchCamera(activeCallId.current);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client, localStream]);

  // ── State / Actions tuple ──

  const state: NativeCallState = {
    call,
    localStream,
    remoteStreams,
    participants,
    isAudioEnabled,
    isVideoEnabled,
    isActive: call?.status === 'active',
    error,
  };

  const actions: NativeCallActions = {
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
    flipCamera,
  };

  return [state, actions];
}

// ---------------------------------------------------------------------------
// useNativeChat
// ---------------------------------------------------------------------------

/** State exposed by the {@link useNativeChat} hook. */
export interface NativeChatState {
  /** Messages in the channel, ordered oldest-first. */
  messages: Message[];
  /** User IDs currently typing in this channel. */
  typing: string[];
  /** Whether the initial message load is in progress. */
  loading: boolean;
  /** The most recent error, or null. */
  error: Error | null;
  /** Whether there are older messages to load. */
  hasMore: boolean;
}

/** Actions exposed by the {@link useNativeChat} hook. */
export interface NativeChatActions {
  /** Send a new text message to the channel. */
  sendMessage: (input: MessageInput) => Promise<Message>;
  /** Delete a message by ID. */
  deleteMessage: (messageId: string) => Promise<void>;
  /** Load older messages (paginate backwards). */
  loadMore: () => Promise<boolean>;
  /** Notify the server that the local user started typing. */
  startTyping: () => void;
  /** Notify the server that the local user stopped typing. */
  stopTyping: () => void;
}

const TYPING_TIMEOUT_MS = 3000;

/**
 * React Native chat hook for a single channel.
 *
 * Subscribes to the channel on mount, fetches the first page of messages,
 * and listens for real-time events (new messages, deletes, typing).
 *
 * @param client - An authenticated `RajutechieStreamKitClient`.
 * @param channelId - The channel to subscribe to.
 * @returns A tuple of `[state, actions]`.
 */
export function useNativeChat(
  client: RajutechieStreamKitClient,
  channelId: string,
): [NativeChatState, NativeChatActions] {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Initial fetch + subscription ──
  useEffect(() => {
    let cancelled = false;

    setMessages([]);
    setTyping([]);
    setError(null);
    setLoading(true);
    setHasMore(false);
    cursorRef.current = null;

    client.chat.subscribe(channelId);

    client.chat
      .getMessages(channelId, { limit: 25 })
      .then((result) => {
        if (cancelled) return;
        setMessages(result.data.slice().reverse());
        setHasMore(result.hasNext);
        cursorRef.current = result.cursors?.next ?? null;
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    return () => {
      cancelled = true;
      client.chat.unsubscribe(channelId);
      for (const timer of typingTimers.current.values()) clearTimeout(timer);
      typingTimers.current.clear();
    };
  }, [client, channelId]);

  // ── Real-time events ──
  useEffect(() => {
    const unsubNew = client.on('message.new', (message: Message) => {
      if (message.channelId !== channelId) return;
      setMessages((prev) => [...prev, message]);
    });

    const unsubDeleted = client.on(
      'message.deleted',
      (payload: { channelId: string; messageId: string }) => {
        if (payload.channelId !== channelId) return;
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      },
    );

    const unsubTypingStart = client.on('typing.start', (evt: TypingEvent) => {
      if (evt.channelId !== channelId) return;
      setTyping((prev) => (prev.includes(evt.userId) ? prev : [...prev, evt.userId]));
      const existing = typingTimers.current.get(evt.userId);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        typingTimers.current.delete(evt.userId);
        setTyping((prev) => prev.filter((id) => id !== evt.userId));
      }, TYPING_TIMEOUT_MS);
      typingTimers.current.set(evt.userId, timer);
    });

    const unsubTypingStop = client.on('typing.stop', (evt: TypingEvent) => {
      if (evt.channelId !== channelId) return;
      const timer = typingTimers.current.get(evt.userId);
      if (timer) { clearTimeout(timer); typingTimers.current.delete(evt.userId); }
      setTyping((prev) => prev.filter((id) => id !== evt.userId));
    });

    return () => {
      unsubNew();
      unsubDeleted();
      unsubTypingStart();
      unsubTypingStop();
    };
  }, [client, channelId]);

  // ── Actions ──
  const sendMessage = useCallback(
    async (input: MessageInput): Promise<Message> => {
      try {
        return await client.chat.sendMessage(channelId, input);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      }
    },
    [client, channelId],
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<void> => {
      try {
        await client.chat.deleteMessage(channelId, messageId);
      } catch (err) {
        const wrapped = err instanceof Error ? err : new Error(String(err));
        setError(wrapped);
        throw wrapped;
      }
    },
    [client, channelId],
  );

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (!hasMore || !cursorRef.current) return false;
    try {
      const result = await client.chat.getMessages(channelId, {
        limit: 25,
        after: cursorRef.current,
      });
      setMessages((prev) => [...result.data.slice().reverse(), ...prev]);
      setHasMore(result.hasNext);
      cursorRef.current = result.cursors?.next ?? null;
      return result.hasNext;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    }
  }, [client, channelId, hasMore]);

  const startTyping = useCallback(() => {
    client.chat.startTyping(channelId);
  }, [client, channelId]);

  const stopTyping = useCallback(() => {
    client.chat.stopTyping(channelId);
  }, [client, channelId]);

  const state: NativeChatState = { messages, typing, loading, error, hasMore };
  const actions: NativeChatActions = { sendMessage, deleteMessage, loadMore, startTyping, stopTyping };

  return [state, actions];
}

// ---------------------------------------------------------------------------
// useNativeMeeting
// ---------------------------------------------------------------------------

/** State exposed by the {@link useNativeMeeting} hook. */
export interface NativeMeetingState {
  /** The current meeting, or null while loading. */
  meeting: Meeting | null;
  /** All current participants. */
  participants: MeetingParticipant[];
  /** Local RN media stream (camera + mic). */
  localStream: RNMediaStream | null;
  /** Remote streams keyed by participant userId. */
  remoteStreams: Map<string, RNMediaStream>;
  /** Whether local audio is enabled. */
  audioEnabled: boolean;
  /** Whether local video is enabled. */
  videoEnabled: boolean;
  /** Whether the local user has their hand raised. */
  handRaised: boolean;
  /** Active polls in this meeting. */
  polls: MeetingPoll[];
  /** Initial loading state. */
  loading: boolean;
  /** Error state. */
  error: Error | null;
}

/** Actions exposed by the {@link useNativeMeeting} hook. */
export interface NativeMeetingActions {
  /** Toggle local audio mute. */
  toggleAudio: () => void;
  /** Toggle local video. */
  toggleVideo: () => void;
  /** Switch between front and back camera. */
  flipCamera: () => Promise<void>;
  /** Raise local user's hand. */
  raiseHand: () => void;
  /** Lower local user's hand. */
  lowerHand: () => void;
  /** Leave the meeting gracefully. */
  leave: () => Promise<void>;
}

/**
 * React Native meeting hook — manages joining, local media via
 * `react-native-webrtc`, and real-time participant/poll events.
 *
 * @param client - An authenticated `RajutechieStreamKitClient`.
 * @param meetingId - The meeting to join on mount.
 * @returns A tuple of `[state, actions]`.
 */
export function useNativeMeeting(
  client: RajutechieStreamKitClient,
  meetingId: string,
): [NativeMeetingState, NativeMeetingActions] {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<MeetingParticipant[]>([]);
  const [localStream, setLocalStream] = useState<RNMediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RNMediaStream>>(new Map());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [polls, setPolls] = useState<MeetingPoll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const localStreamRef = useRef<RNMediaStream | null>(null);

  // ── Join + acquire native media ──
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const meetingData = await client.meeting.get(meetingId);
        if (cancelled) return;
        setMeeting(meetingData);

        await client.meeting.join(meetingId);
        if (cancelled) return;

        const muteOnJoin = meetingData.settings?.muteOnJoin ?? false;
        const stream = await getNativeMediaStream({ audio: true, video: { facingMode: 'user' } });
        if (cancelled) { releaseStream(stream); return; }

        if (muteOnJoin) {
          stream.getAudioTracks().forEach((t: { enabled: boolean }) => { t.enabled = false; });
          setAudioEnabled(false);
        }

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
      if (localStreamRef.current) {
        releaseStream(localStreamRef.current);
        localStreamRef.current = null;
      }
      client.meeting.leave(meetingId).catch(() => {});
    };
  }, [client, meetingId]);

  // ── Real-time events ──
  useEffect(() => {
    const unsubJoined = client.on(
      'meeting.participant.joined',
      (participant: MeetingParticipant) => {
        if (participant.meetingId !== meetingId) return;
        setParticipants((prev) => {
          if (prev.some((p) => p.userId === participant.userId)) {
            return prev.map((p) => (p.userId === participant.userId ? participant : p));
          }
          return [...prev, participant];
        });
        setRemoteStreams((prev) => {
          if (prev.has(participant.userId)) return prev;
          const next = new Map(prev);
          next.set(participant.userId, new RNMediaStream());
          return next;
        });
      },
    );

    const unsubLeft = client.on(
      'meeting.participant.left',
      ({ meetingId: id, userId }: { meetingId: string; userId: string }) => {
        if (id !== meetingId) return;
        setParticipants((prev) => prev.filter((p) => p.userId !== userId));
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          const stream = next.get(userId);
          if (stream) releaseStream(stream);
          next.delete(userId);
          return next;
        });
      },
    );

    const unsubHandRaised = client.on(
      'meeting.hand.raised',
      ({ meetingId: id, userId }: { meetingId: string; userId: string }) => {
        if (id !== meetingId) return;
        setParticipants((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, handRaised: true } : p)),
        );
      },
    );

    const unsubHandLowered = client.on(
      'meeting.hand.lowered',
      ({ meetingId: id, userId }: { meetingId: string; userId: string }) => {
        if (id !== meetingId) return;
        setParticipants((prev) =>
          prev.map((p) => (p.userId === userId ? { ...p, handRaised: false } : p)),
        );
      },
    );

    const unsubPollCreated = client.on('meeting.poll.created', (poll: MeetingPoll) => {
      if (poll.meetingId !== meetingId) return;
      setPolls((prev) => [...prev, poll]);
    });

    const unsubPollResult = client.on('meeting.poll.result', (poll: MeetingPoll) => {
      if (poll.meetingId !== meetingId) return;
      setPolls((prev) => prev.map((p) => (p.id === poll.id ? poll : p)));
    });

    const unsubEnded = client.on(
      'meeting.ended',
      ({ meetingId: id }: { meetingId: string }) => {
        if (id !== meetingId) return;
        setMeeting((prev) => (prev ? { ...prev, status: 'ended' } : prev));
        if (localStreamRef.current) {
          releaseStream(localStreamRef.current);
          localStreamRef.current = null;
          setLocalStream(null);
        }
      },
    );

    return () => {
      unsubJoined();
      unsubLeft();
      unsubHandRaised();
      unsubHandLowered();
      unsubPollCreated();
      unsubPollResult();
      unsubEnded();
    };
  }, [client, meetingId]);

  // ── Actions ──
  const toggleAudio = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newEnabled = !audioEnabled;
    stream.getAudioTracks().forEach((t: { enabled: boolean }) => { t.enabled = newEnabled; });
    setAudioEnabled(newEnabled);
  }, [audioEnabled]);

  const toggleVideo = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const newEnabled = !videoEnabled;
    stream.getVideoTracks().forEach((t: { enabled: boolean }) => { t.enabled = newEnabled; });
    setVideoEnabled(newEnabled);
  }, [videoEnabled]);

  const flipCamera = useCallback(async () => {
    if (!localStreamRef.current) return;
    try {
      const newStream = await switchCamera(localStreamRef.current);
      localStreamRef.current = newStream;
      setLocalStream(newStream);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

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
      if (localStreamRef.current) {
        releaseStream(localStreamRef.current);
        localStreamRef.current = null;
        setLocalStream(null);
      }
      await client.meeting.leave(meetingId);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [client, meetingId]);

  const state: NativeMeetingState = {
    meeting, participants, localStream, remoteStreams,
    audioEnabled, videoEnabled, handRaised, polls, loading, error,
  };

  const actions: NativeMeetingActions = {
    toggleAudio, toggleVideo, flipCamera, raiseHand, lowerHand, leave,
  };

  return [state, actions];
}
