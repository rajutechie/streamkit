/**
 * CallPage -- Audio and video calling interface.
 *
 * When no call is active the page shows a "Start a Call" prompt with a
 * user-picker and audio/video toggle.  During a call it renders the
 * VideoGrid + CallControls.  Incoming calls are shown via a dialog overlay.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useCall, useRajutechieStreamKit } from '@rajutechie-streamkit/react-sdk';
import type { Call, CallConfig } from '@rajutechie-streamkit/react-sdk';
import { useAuth } from '../contexts/AuthContext';
import * as apiClient from '../api';
import type { AppUser } from '../types';
import VideoGrid from '../components/VideoGrid';
import CallControls from '../components/CallControls';
import StartCallDialog from '../components/StartCallDialog';
import IncomingCallDialog from '../components/IncomingCallDialog';

export default function CallPage() {
  const { callId: routeCallId } = useParams<{ callId?: string }>();
  const { user } = useAuth();
  const { client } = useRajutechieStreamKit();

  const {
    call,
    localStream,
    remoteStreams,
    audioEnabled,
    videoEnabled,
    screenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    endCall,
    startCall,
    acceptCall,
    rejectCall,
    error,
  } = useCall(routeCallId);

  const [users, setUsers] = useState<AppUser[]>([]);
  const [incoming, setIncoming] = useState<{ callId: string; callerId: string; type: 'audio' | 'video' } | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch available users
  useEffect(() => {
    apiClient.getUsers().then((u) => setUsers(u.filter((x) => x.id !== user?.id))).catch(() => {});
  }, [user?.id]);

  // Listen for incoming calls
  useEffect(() => {
    const unsub = client.on('call.ringing', (data: { callId: string; callerId: string; type: 'audio' | 'video' }) => {
      setIncoming(data);
    });
    return unsub;
  }, [client]);

  // Call duration timer
  useEffect(() => {
    if (call?.status === 'active') {
      setCallDuration(0);
      timerRef.current = setInterval(() => {
        setCallDuration((d) => d + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [call?.status]);

  // Format seconds into mm:ss
  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60).toString().padStart(2, '0');
    const secs = (s % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const handleStartCall = useCallback(
    async (participantIds: string[], type: 'audio' | 'video') => {
      const config: CallConfig = { type, participants: participantIds };
      await startCall(config);
    },
    [startCall],
  );

  const handleAcceptIncoming = useCallback(async () => {
    if (!incoming) return;
    await acceptCall(incoming.callId);
    setIncoming(null);
  }, [incoming, acceptCall]);

  const handleRejectIncoming = useCallback(async () => {
    if (!incoming) return;
    await rejectCall(incoming.callId, 'declined');
    setIncoming(null);
  }, [incoming, rejectCall]);

  const handleEndCall = useCallback(async () => {
    await endCall();
  }, [endCall]);

  // ---- Active call view ----
  if (call && call.status === 'active') {
    return (
      <div className="call-page active-call">
        <div className="call-header">
          <div className="call-status">
            <span className="call-status-dot active" />
            <span className="call-type-label">{call.type === 'video' ? 'Video Call' : 'Audio Call'}</span>
            <span className="call-timer">{formatDuration(callDuration)}</span>
          </div>
        </div>

        <div className="call-content">
          <VideoGrid
            localStream={localStream}
            remoteStreams={remoteStreams}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            callType={call.type}
          />
        </div>

        <CallControls
          audioEnabled={audioEnabled}
          videoEnabled={videoEnabled}
          screenSharing={screenSharing}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={screenSharing ? stopScreenShare : startScreenShare}
          onEndCall={handleEndCall}
        />

        {incoming && (
          <IncomingCallDialog
            callerName={incoming.callerId}
            callType={incoming.type}
            onAccept={handleAcceptIncoming}
            onReject={handleRejectIncoming}
          />
        )}
      </div>
    );
  }

  // ---- Ringing view ----
  if (call && call.status === 'ringing') {
    return (
      <div className="call-page ringing-call">
        <div className="ringing-overlay">
          <div className="ringing-pulse" />
          <div className="ringing-info">
            <h2>Calling...</h2>
            <p>{call.type === 'video' ? 'Video Call' : 'Audio Call'}</p>
          </div>
          <button className="btn btn-danger btn-round" onClick={handleEndCall}>
            <PhoneOffIcon />
          </button>
        </div>

        {incoming && (
          <IncomingCallDialog
            callerName={incoming.callerId}
            callType={incoming.type}
            onAccept={handleAcceptIncoming}
            onReject={handleRejectIncoming}
          />
        )}
      </div>
    );
  }

  // ---- Call ended view ----
  if (call && call.status === 'ended') {
    return (
      <div className="call-page ended-call">
        <div className="empty-state">
          <div className="empty-state-icon">
            <PhoneOffIcon />
          </div>
          <h3>Call Ended</h3>
          <p>Duration: {formatDuration(callDuration)}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Back to Calls
          </button>
        </div>
      </div>
    );
  }

  // ---- Idle view: start a new call ----
  return (
    <div className="call-page idle-call">
      {error && <div className="error-banner">{error.message}</div>}

      <StartCallDialog users={users} onStartCall={handleStartCall} />

      {incoming && (
        <IncomingCallDialog
          callerName={incoming.callerId}
          callType={incoming.type}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline icons
// ---------------------------------------------------------------------------

function PhoneOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 004.73.89 2 2 0 012 2v3a2 2 0 01-2.18 2A19.79 19.79 0 013.07 2.18 2 2 0 015 0h3a2 2 0 012 2 12.84 12.84 0 00.89 4.73 2 2 0 01-.45 2.11L9.17 10.11" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
