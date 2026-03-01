/**
 * `RajutechieStreamKitMeetingService` - Angular service for meeting functionality.
 *
 * Wraps the core `MeetingModule` and exposes scheduling, joining,
 * participant management, and real-time events as RxJS Observables.
 */

import { Injectable, OnDestroy } from '@angular/core';
import type {
  Meeting,
  MeetingConfig,
  UpdateMeetingInput,
  MeetingParticipant,
  MeetingPoll,
  CreatePollInput,
  BreakoutRoom,
  CreateBreakoutRoomsInput,
  Unsubscribe,
} from '@rajutechie-streamkit/core';
import {
  Observable,
  Subject,
  BehaviorSubject,
  from,
} from 'rxjs';
import { takeUntil, shareReplay } from 'rxjs/operators';
import { RajutechieStreamKitService } from './rajutechie-streamkit.service';

@Injectable({ providedIn: 'root' })
export class RajutechieStreamKitMeetingService implements OnDestroy {
  /** Emits when the service is destroyed. */
  private readonly _destroy$ = new Subject<void>();

  // ── Real-time event subjects ──

  private readonly _meetingStarted$ = new Subject<Meeting>();
  private readonly _meetingEnded$ = new Subject<{ meetingId: string }>();
  private readonly _participantJoined$ = new Subject<MeetingParticipant>();
  private readonly _participantLeft$ = new Subject<{ meetingId: string; userId: string }>();
  private readonly _participantMuted$ = new Subject<{ meetingId: string; userId: string }>();
  private readonly _handRaised$ = new Subject<{ meetingId: string; userId: string }>();
  private readonly _handLowered$ = new Subject<{ meetingId: string; userId: string }>();
  private readonly _pollCreated$ = new Subject<MeetingPoll>();
  private readonly _pollResult$ = new Subject<MeetingPoll>();

  /**
   * Internal cache of participants per meeting, keyed by meetingId.
   * Updated in real time as participants join/leave.
   */
  private readonly _participantsCache = new Map<
    string,
    BehaviorSubject<MeetingParticipant[]>
  >();

  /** Core event unsubscribe handles. */
  private _unsubs: Unsubscribe[] = [];

  constructor(private readonly streamKit: RajutechieStreamKitService) {
    this._setupEventBridge();
  }

  // ── Meeting CRUD ──────────────────────────────────────────────────────

  /**
   * Schedule a new meeting.
   *
   * @param config - Meeting configuration.
   * @returns An `Observable<Meeting>` that emits the created meeting.
   */
  scheduleMeeting(config: MeetingConfig): Observable<Meeting> {
    return from(this.streamKit.client.meeting.schedule(config));
  }

  /**
   * Fetch an existing meeting by ID.
   *
   * @param meetingId - The meeting ID.
   * @returns An `Observable<Meeting>`.
   */
  getMeeting(meetingId: string): Observable<Meeting> {
    return from(this.streamKit.client.meeting.get(meetingId));
  }

  /**
   * Update a meeting.
   *
   * @param meetingId - The meeting ID.
   * @param input     - Fields to update.
   * @returns An `Observable<Meeting>` with the updated meeting.
   */
  updateMeeting(meetingId: string, input: UpdateMeetingInput): Observable<Meeting> {
    return from(this.streamKit.client.meeting.update(meetingId, input));
  }

  /**
   * Cancel a scheduled meeting.
   *
   * @param meetingId - The meeting ID.
   */
  cancelMeeting(meetingId: string): Observable<void> {
    return from(this.streamKit.client.meeting.cancel(meetingId));
  }

  // ── Join / Leave ──────────────────────────────────────────────────────

  /**
   * Join a meeting.
   *
   * @param meetingId - The meeting to join.
   * @returns An `Observable<MeetingParticipant>` representing the local user.
   */
  joinMeeting(meetingId: string): Observable<MeetingParticipant> {
    return from(this.streamKit.client.meeting.join(meetingId));
  }

  /**
   * Join a meeting by its shareable code.
   *
   * @param code - The meeting code.
   * @returns An `Observable` with the meeting and participant data.
   */
  joinByCode(code: string): Observable<Meeting & { participant: MeetingParticipant }> {
    return from(this.streamKit.client.meeting.joinByCode(code));
  }

  /**
   * Leave a meeting.
   *
   * @param meetingId - The meeting to leave.
   */
  leaveMeeting(meetingId: string): Observable<void> {
    return from(this.streamKit.client.meeting.leave(meetingId));
  }

  /**
   * End a meeting (host only).
   *
   * @param meetingId - The meeting to end.
   */
  endMeeting(meetingId: string): Observable<void> {
    return from(this.streamKit.client.meeting.end(meetingId));
  }

  // ── Participants ──────────────────────────────────────────────────────

  /**
   * Observable of participants for a given meeting.
   *
   * Returns a `BehaviorSubject`-backed observable that starts with an empty
   * array and is updated in real time as participants join or leave.
   *
   * @param meetingId - The meeting to observe.
   * @returns An `Observable<MeetingParticipant[]>`.
   */
  participants$(meetingId: string): Observable<MeetingParticipant[]> {
    if (!this._participantsCache.has(meetingId)) {
      this._participantsCache.set(
        meetingId,
        new BehaviorSubject<MeetingParticipant[]>([]),
      );
    }

    return this._participantsCache
      .get(meetingId)!
      .asObservable()
      .pipe(takeUntil(this._destroy$), shareReplay({ bufferSize: 1, refCount: true }));
  }

  /**
   * Observable that emits when a participant joins any meeting.
   */
  get participantJoined$(): Observable<MeetingParticipant> {
    return this._participantJoined$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a participant leaves any meeting.
   */
  get participantLeft$(): Observable<{ meetingId: string; userId: string }> {
    return this._participantLeft$.asObservable().pipe(takeUntil(this._destroy$));
  }

  // ── Participant management ────────────────────────────────────────────

  /**
   * Mute a specific participant (host/co-host only).
   */
  muteParticipant(meetingId: string, userId: string): Observable<void> {
    return from(this.streamKit.client.meeting.muteParticipant(meetingId, userId));
  }

  /**
   * Remove a participant from the meeting (host/co-host only).
   */
  removeParticipant(meetingId: string, userId: string): Observable<void> {
    return from(this.streamKit.client.meeting.removeParticipant(meetingId, userId));
  }

  /**
   * Mute all participants (host/co-host only).
   */
  muteAll(meetingId: string): Observable<void> {
    return from(this.streamKit.client.meeting.muteAll(meetingId));
  }

  // ── Hand raise ────────────────────────────────────────────────────────

  /**
   * Raise the current user's hand in a meeting.
   */
  raiseHand(meetingId: string): void {
    this.streamKit.client.meeting.raiseHand(meetingId);
  }

  /**
   * Lower the current user's hand in a meeting.
   */
  lowerHand(meetingId: string): void {
    this.streamKit.client.meeting.lowerHand(meetingId);
  }

  /**
   * Observable that emits when any participant raises their hand.
   */
  get handRaised$(): Observable<{ meetingId: string; userId: string }> {
    return this._handRaised$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when any participant lowers their hand.
   */
  get handLowered$(): Observable<{ meetingId: string; userId: string }> {
    return this._handLowered$.asObservable().pipe(takeUntil(this._destroy$));
  }

  // ── Polls ─────────────────────────────────────────────────────────────

  /**
   * Create a poll in a meeting.
   */
  createPoll(meetingId: string, input: CreatePollInput): Observable<MeetingPoll> {
    return from(this.streamKit.client.meeting.createPoll(meetingId, input));
  }

  /**
   * Vote on a poll option.
   */
  votePoll(meetingId: string, pollId: string, optionId: string): Observable<void> {
    return from(this.streamKit.client.meeting.votePoll(meetingId, pollId, optionId));
  }

  /**
   * Observable that emits when a new poll is created.
   */
  get pollCreated$(): Observable<MeetingPoll> {
    return this._pollCreated$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when poll results are updated.
   */
  get pollResult$(): Observable<MeetingPoll> {
    return this._pollResult$.asObservable().pipe(takeUntil(this._destroy$));
  }

  // ── Breakout Rooms ────────────────────────────────────────────────────

  /**
   * Create breakout rooms for a meeting.
   */
  createBreakoutRooms(
    meetingId: string,
    input: CreateBreakoutRoomsInput,
  ): Observable<BreakoutRoom[]> {
    return from(this.streamKit.client.meeting.createBreakoutRooms(meetingId, input));
  }

  // ── Meeting lifecycle events ──────────────────────────────────────────

  /**
   * Observable that emits when a meeting starts.
   */
  get meetingStarted$(): Observable<Meeting> {
    return this._meetingStarted$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a meeting ends.
   */
  get meetingEnded$(): Observable<{ meetingId: string }> {
    return this._meetingEnded$.asObservable().pipe(takeUntil(this._destroy$));
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private _setupEventBridge(): void {
    const client = this.streamKit.client;

    this._unsubs.push(
      client.on('meeting.started', (data) => this._meetingStarted$.next(data)),
    );

    this._unsubs.push(
      client.on('meeting.ended', (data) => {
        this._meetingEnded$.next(data);
        // Clean up participant cache for this meeting.
        const cache = this._participantsCache.get(data.meetingId);
        if (cache) {
          cache.next([]);
          cache.complete();
          this._participantsCache.delete(data.meetingId);
        }
      }),
    );

    this._unsubs.push(
      client.on('meeting.participant.joined', (participant) => {
        this._participantJoined$.next(participant);

        // Update participant cache.
        const cache = this._participantsCache.get(participant.meetingId);
        if (cache) {
          const current = cache.value;
          // Avoid duplicates.
          const exists = current.some((p) => p.userId === participant.userId);
          if (!exists) {
            cache.next([...current, participant]);
          }
        }
      }),
    );

    this._unsubs.push(
      client.on('meeting.participant.left', (data) => {
        this._participantLeft$.next(data);

        // Update participant cache.
        const cache = this._participantsCache.get(data.meetingId);
        if (cache) {
          cache.next(
            cache.value.filter((p) => p.userId !== data.userId),
          );
        }
      }),
    );

    this._unsubs.push(
      client.on('meeting.participant.muted', (data) =>
        this._participantMuted$.next(data),
      ),
    );

    this._unsubs.push(
      client.on('meeting.hand.raised', (data) => this._handRaised$.next(data)),
    );

    this._unsubs.push(
      client.on('meeting.hand.lowered', (data) => this._handLowered$.next(data)),
    );

    this._unsubs.push(
      client.on('meeting.poll.created', (data) => this._pollCreated$.next(data)),
    );

    this._unsubs.push(
      client.on('meeting.poll.result', (data) => this._pollResult$.next(data)),
    );
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    for (const unsub of this._unsubs) {
      unsub();
    }
    this._unsubs = [];

    this._destroy$.next();
    this._destroy$.complete();

    this._meetingStarted$.complete();
    this._meetingEnded$.complete();
    this._participantJoined$.complete();
    this._participantLeft$.complete();
    this._participantMuted$.complete();
    this._handRaised$.complete();
    this._handLowered$.complete();
    this._pollCreated$.complete();
    this._pollResult$.complete();

    // Complete all participant cache subjects.
    for (const [, subject] of this._participantsCache) {
      subject.complete();
    }
    this._participantsCache.clear();
  }
}
