/**
 * `RajutechieStreamKitCallService` - Angular service for voice/video call functionality.
 *
 * Wraps the core `CallModule` and exposes call operations and real-time
 * events as RxJS Observables.
 */

import { Injectable, OnDestroy } from '@angular/core';
import type {
  Call,
  CallConfig,
  CallParticipant,
  CallStats,
  Unsubscribe,
} from '@rajutechie-streamkit/core';
import { Observable, Subject, from } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RajutechieStreamKitService } from './rajutechie-streamkit.service';

@Injectable({ providedIn: 'root' })
export class RajutechieStreamKitCallService implements OnDestroy {
  /** Emits when the service is destroyed. */
  private readonly _destroy$ = new Subject<void>();

  /** Subject for incoming call events. */
  private readonly _incomingCalls$ = new Subject<Call & { participants: CallParticipant[] }>();

  /** Subject for call-accepted events. */
  private readonly _callAccepted$ = new Subject<{ callId: string; userId: string }>();

  /** Subject for call-rejected events. */
  private readonly _callRejected$ = new Subject<{
    callId: string;
    userId: string;
    reason?: string;
  }>();

  /** Subject for call-ended events. */
  private readonly _callEnded$ = new Subject<{ callId: string; reason: string }>();

  /** Subject for participant-joined events. */
  private readonly _participantJoined$ = new Subject<CallParticipant>();

  /** Subject for participant-left events. */
  private readonly _participantLeft$ = new Subject<{ callId: string; userId: string }>();

  /** Core event unsubscribe handles. */
  private _unsubs: Unsubscribe[] = [];

  constructor(private readonly streamKit: RajutechieStreamKitService) {
    this._setupEventBridge();
  }

  // ── Observables ───────────────────────────────────────────────────────

  /**
   * Observable that emits each time an incoming call is received.
   *
   * The emitted value includes the `Call` data together with the initial
   * list of `CallParticipant` entries.
   */
  get incomingCalls$(): Observable<Call & { participants: CallParticipant[] }> {
    return this._incomingCalls$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a call is accepted by a participant.
   */
  get callAccepted$(): Observable<{ callId: string; userId: string }> {
    return this._callAccepted$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a call is rejected by a participant.
   */
  get callRejected$(): Observable<{
    callId: string;
    userId: string;
    reason?: string;
  }> {
    return this._callRejected$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a call ends.
   */
  get callEnded$(): Observable<{ callId: string; reason: string }> {
    return this._callEnded$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a participant joins the call.
   */
  get participantJoined$(): Observable<CallParticipant> {
    return this._participantJoined$.asObservable().pipe(takeUntil(this._destroy$));
  }

  /**
   * Observable that emits when a participant leaves the call.
   */
  get participantLeft$(): Observable<{ callId: string; userId: string }> {
    return this._participantLeft$.asObservable().pipe(takeUntil(this._destroy$));
  }

  // ── Actions ───────────────────────────────────────────────────────────

  /**
   * Start a new call.
   *
   * @param config - Call configuration (type, participants, etc.).
   * @returns An `Observable<Call>` that emits the created call and completes.
   */
  startCall(config: CallConfig): Observable<Call> {
    return from(this.streamKit.client.call.start(config));
  }

  /**
   * Accept an incoming call.
   *
   * @param callId - The ID of the call to accept.
   * @returns An `Observable<void>` that completes when the call is accepted.
   */
  acceptCall(callId: string): Observable<void> {
    return from(this.streamKit.client.call.accept(callId));
  }

  /**
   * Reject an incoming call.
   *
   * @param callId - The ID of the call to reject.
   * @param reason - Optional rejection reason.
   * @returns An `Observable<void>` that completes when the call is rejected.
   */
  rejectCall(callId: string, reason?: string): Observable<void> {
    return from(this.streamKit.client.call.reject(callId, reason));
  }

  /**
   * End an active call.
   *
   * @param callId - The ID of the call to end.
   * @returns An `Observable<void>` that completes when the call has ended.
   */
  endCall(callId: string): Observable<void> {
    return from(this.streamKit.client.call.end(callId));
  }

  /**
   * Fetch the current state of a call.
   *
   * @param callId - The call ID.
   * @returns An `Observable<Call>` that emits the call data and completes.
   */
  getCall(callId: string): Observable<Call> {
    return from(this.streamKit.client.call.get(callId));
  }

  /**
   * Fetch call statistics.
   *
   * @param callId - The call ID.
   * @returns An `Observable<CallStats>` that emits the stats and completes.
   */
  getStats(callId: string): Observable<CallStats> {
    return from(this.streamKit.client.call.getStats(callId));
  }

  // ── Media controls ────────────────────────────────────────────────────

  /**
   * Toggle the local audio track for a call.
   */
  toggleAudio(callId: string, enabled: boolean): void {
    this.streamKit.client.call.toggleAudio(callId, enabled);
  }

  /**
   * Toggle the local video track for a call.
   */
  toggleVideo(callId: string, enabled: boolean): void {
    this.streamKit.client.call.toggleVideo(callId, enabled);
  }

  /**
   * Switch between front and back cameras during a call.
   */
  switchCamera(callId: string): void {
    this.streamKit.client.call.switchCamera(callId);
  }

  /**
   * Start screen sharing.
   */
  startScreenShare(callId: string): void {
    this.streamKit.client.call.startScreenShare(callId);
  }

  /**
   * Stop screen sharing.
   */
  stopScreenShare(callId: string): void {
    this.streamKit.client.call.stopScreenShare(callId);
  }

  // ── Recording ─────────────────────────────────────────────────────────

  /**
   * Start recording a call.
   */
  startRecording(callId: string): Observable<void> {
    return from(this.streamKit.client.call.startRecording(callId));
  }

  /**
   * Stop recording a call.
   */
  stopRecording(callId: string): Observable<void> {
    return from(this.streamKit.client.call.stopRecording(callId));
  }

  // ── Internal ──────────────────────────────────────────────────────────

  private _setupEventBridge(): void {
    const client = this.streamKit.client;

    this._unsubs.push(
      client.on('call.incoming', (data) => this._incomingCalls$.next(data)),
    );

    this._unsubs.push(
      client.on('call.accepted', (data) => this._callAccepted$.next(data)),
    );

    this._unsubs.push(
      client.on('call.rejected', (data) => this._callRejected$.next(data)),
    );

    this._unsubs.push(
      client.on('call.ended', (data) => this._callEnded$.next(data)),
    );

    this._unsubs.push(
      client.on('call.participant.joined', (data) =>
        this._participantJoined$.next(data),
      ),
    );

    this._unsubs.push(
      client.on('call.participant.left', (data) =>
        this._participantLeft$.next(data),
      ),
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

    this._incomingCalls$.complete();
    this._callAccepted$.complete();
    this._callRejected$.complete();
    this._callEnded$.complete();
    this._participantJoined$.complete();
    this._participantLeft$.complete();
  }
}
