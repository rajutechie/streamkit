/**
 * MeetingPage — schedule, browse, and join meetings.
 *
 * Shows a list of meetings and lets users schedule new ones or join existing
 * ones. Active meetings display a simple in-room view with mute/video controls.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../api';
import type { MeetingData } from '../types';

export default function MeetingPage() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<MeetingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMeeting, setActiveMeeting] = useState<MeetingData | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadMeetings = useCallback(async () => {
    try {
      const data = await api.getMeetings();
      setMeetings(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  const handleJoin = async (meeting: MeetingData) => {
    let password: string | undefined;
    if (meeting.has_password) {
      password = window.prompt('Enter meeting password:') ?? undefined;
      if (password === undefined) return;
    }
    try {
      const joined = await api.joinMeeting(meeting.id, password);
      setActiveMeeting(joined);
    } catch (e) {
      alert(`Failed to join: ${e}`);
    }
  };

  const handleLeave = async () => {
    if (!activeMeeting) return;
    try {
      await api.leaveMeeting(activeMeeting.id);
    } catch { /* ignore */ }
    setActiveMeeting(null);
    loadMeetings();
  };

  const handleEnd = async () => {
    if (!activeMeeting) return;
    if (!window.confirm('End this meeting for all participants?')) return;
    try {
      await api.endMeeting(activeMeeting.id);
    } catch { /* ignore */ }
    setActiveMeeting(null);
    loadMeetings();
  };

  // ── Active meeting room ──────────────────────────────────────────────────
  if (activeMeeting) {
    return (
      <MeetingRoom
        meeting={activeMeeting}
        currentUserId={user?.id ?? ''}
        onLeave={handleLeave}
        onEnd={handleEnd}
      />
    );
  }

  // ── Meeting list ─────────────────────────────────────────────────────────
  return (
    <div className="meeting-page">
      <div className="meeting-header">
        <h2>Meetings</h2>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Meeting
        </button>
      </div>

      {showCreate && (
        <CreateMeetingForm
          onCreated={(m) => {
            setMeetings((prev) => [m, ...prev]);
            setShowCreate(false);
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="spinner" />
      ) : meetings.length === 0 ? (
        <div className="empty-state">
          <p>No meetings yet.</p>
          <button className="btn btn-sm btn-outline" onClick={() => setShowCreate(true)}>
            Schedule your first meeting
          </button>
        </div>
      ) : (
        <div className="meeting-list">
          {meetings.map((m) => (
            <MeetingCard
              key={m.id}
              meeting={m}
              currentUserId={user?.id ?? ''}
              onJoin={() => handleJoin(m)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  currentUserId,
  onJoin,
}: {
  meeting: MeetingData;
  currentUserId: string;
  onJoin: () => void;
}) {
  const isEnded = meeting.status === 'ended';
  const isActive = meeting.status === 'active';

  return (
    <div className={`meeting-card ${isActive ? 'meeting-card--active' : ''}`}>
      <div className="meeting-card-icon">
        {isActive ? '🔴' : isEnded ? '✓' : '📅'}
      </div>
      <div className="meeting-card-info">
        <h3>{meeting.title}</h3>
        <p className="meeting-card-meta">
          {meeting.duration_mins} min
          {meeting.has_password && ' · 🔒'}
          {' · '}
          <span className={`status-badge status-${meeting.status}`}>
            {isActive ? 'Live' : isEnded ? 'Ended' : 'Scheduled'}
          </span>
          {' · '}
          {meeting.participant_count} participant{meeting.participant_count !== 1 ? 's' : ''}
        </p>
      </div>
      {!isEnded && (
        <button className="btn btn-sm btn-primary" onClick={onJoin}>
          {isActive ? 'Join Now' : 'Join'}
        </button>
      )}
    </div>
  );
}

function CreateMeetingForm({
  onCreated,
  onCancel,
}: {
  onCreated: (m: MeetingData) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const meeting = await api.createMeeting(title.trim(), duration, password || undefined);
      onCreated(meeting);
    } catch (err) {
      alert(`Failed to create meeting: ${err}`);
      setSaving(false);
    }
  };

  return (
    <form className="create-meeting-form" onSubmit={handleSubmit}>
      <h3>New Meeting</h3>
      <div className="form-group">
        <label>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Team standup"
          required
        />
      </div>
      <div className="form-group">
        <label>Duration</label>
        <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
          <option value={90}>1.5 hours</option>
          <option value={120}>2 hours</option>
        </select>
      </div>
      <div className="form-group">
        <label>Password (optional)</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank for open meeting"
        />
      </div>
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Scheduling…' : 'Schedule Meeting'}
        </button>
      </div>
    </form>
  );
}

function MeetingRoom({
  meeting,
  currentUserId,
  onLeave,
  onEnd,
}: {
  meeting: MeetingData;
  currentUserId: string;
  onLeave: () => void;
  onEnd: () => void;
}) {
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const participants = meeting.participants ?? [];
  const isHost = meeting.host_id === currentUserId;

  return (
    <div className="meeting-room">
      <div className="meeting-room-header">
        <h2>{meeting.title}</h2>
        <span className="meeting-room-count">{meeting.participant_count} participant{meeting.participant_count !== 1 ? 's' : ''}</span>
      </div>

      <div className="participant-grid">
        {participants.length === 0 ? (
          <div className="participant-empty">Waiting for participants…</div>
        ) : (
          participants.map((p) => (
            <div key={p.user_id} className="participant-tile">
              <div className="participant-avatar">
                {(p.display_name ?? p.user_id)[0].toUpperCase()}
              </div>
              <div className="participant-name">{p.display_name ?? p.user_id}</div>
              {p.role === 'host' && <span className="host-badge">Host</span>}
            </div>
          ))
        )}
      </div>

      <div className="meeting-controls">
        <button
          className={`control-btn ${audioMuted ? 'control-btn--off' : ''}`}
          onClick={() => setAudioMuted((v) => !v)}
          title={audioMuted ? 'Unmute' : 'Mute'}
        >
          {audioMuted ? '🔇' : '🎙️'}
          <span>{audioMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          className={`control-btn ${videoOff ? 'control-btn--off' : ''}`}
          onClick={() => setVideoOff((v) => !v)}
          title={videoOff ? 'Start Video' : 'Stop Video'}
        >
          {videoOff ? '📵' : '📹'}
          <span>{videoOff ? 'Start Video' : 'Stop Video'}</span>
        </button>

        <button
          className={`control-btn ${handRaised ? 'control-btn--raised' : ''}`}
          onClick={() => setHandRaised((v) => !v)}
          title={handRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          ✋
          <span>{handRaised ? 'Lower Hand' : 'Raise Hand'}</span>
        </button>

        <button className="control-btn control-btn--leave" onClick={onLeave}>
          📵
          <span>Leave</span>
        </button>

        {isHost && (
          <button className="control-btn control-btn--end" onClick={onEnd}>
            ⏹
            <span>End</span>
          </button>
        )}
      </div>
    </div>
  );
}
