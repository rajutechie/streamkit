/**
 * `RajutechieStreamKitChatService` - Angular service for chat functionality.
 *
 * Wraps the core `ChatModule` and exposes its operations as RxJS
 * Observables, following Angular best practices.
 */

import { Injectable, OnDestroy } from '@angular/core';
import type {
  Message,
  MessageInput,
  TypingEvent,
  Unsubscribe,
} from '@rajutechie-streamkit/core';
import {
  Observable,
  Subject,
  from,
  BehaviorSubject,
  shareReplay,
} from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { RajutechieStreamKitService } from './rajutechie-streamkit.service';

@Injectable({ providedIn: 'root' })
export class RajutechieStreamKitChatService implements OnDestroy {
  /** Emits when the service is destroyed; used to auto-unsubscribe. */
  private readonly _destroy$ = new Subject<void>();

  /** Internal subject that re-broadcasts every `message.new` event. */
  private readonly _newMessage$ = new Subject<Message>();

  /** Internal subject that re-broadcasts every `message.updated` event. */
  private readonly _updatedMessage$ = new Subject<Message>();

  /** Internal subject that re-broadcasts every `message.deleted` event. */
  private readonly _deletedMessage$ = new Subject<{ channelId: string; messageId: string }>();

  /** Internal subject for typing events. */
  private readonly _typing$ = new Subject<TypingEvent>();

  /** Core event unsubscribe handles. */
  private _unsubs: Unsubscribe[] = [];

  constructor(private readonly streamKit: RajutechieStreamKitService) {
    this._setupEventBridge();
  }

  // ── Messages ──────────────────────────────────────────────────────────

  /**
   * Fetch messages for a channel.
   *
   * @param channelId - The channel to fetch messages from.
   * @returns An `Observable` that emits the message array and completes.
   */
  getMessages(channelId: string): Observable<Message[]> {
    return from(this.streamKit.client.chat.getMessages(channelId)).pipe(
      map((paginated) => paginated.data),
    );
  }

  /**
   * Send a message to a channel.
   *
   * @param channelId - The target channel.
   * @param input     - The message payload.
   * @returns An `Observable` that emits the created `Message` and completes.
   */
  sendMessage(channelId: string, input: MessageInput): Observable<Message> {
    return from(this.streamKit.client.chat.sendMessage(channelId, input));
  }

  /**
   * Real-time stream of new messages for a specific channel.
   *
   * Emits every time a `message.new` event arrives for the given channel.
   * The observable is hot and never completes on its own; it is cleaned up
   * when the service is destroyed.
   *
   * @param channelId - The channel to listen on.
   * @returns A hot `Observable<Message>`.
   */
  messageStream(channelId: string): Observable<Message> {
    // Ensure the channel is subscribed on the WebSocket.
    this.streamKit.client.chat.subscribe(channelId);

    return new Observable<Message>((subscriber) => {
      const sub = this._newMessage$
        .pipe(takeUntil(this._destroy$))
        .subscribe((msg) => {
          if (msg.channelId === channelId) {
            subscriber.next(msg);
          }
        });

      return () => {
        sub.unsubscribe();
        // Unsubscribe from the WebSocket channel when the last observer drops.
        this.streamKit.client.chat.unsubscribe(channelId);
      };
    }).pipe(shareReplay({ bufferSize: 0, refCount: true }));
  }

  /**
   * Real-time stream of message updates (edits) for a specific channel.
   *
   * @param channelId - The channel to listen on.
   * @returns A hot `Observable<Message>`.
   */
  messageUpdates(channelId: string): Observable<Message> {
    return this._updatedMessage$.pipe(
      takeUntil(this._destroy$),
      // Only emit for the requested channel.
      map((msg) => (msg.channelId === channelId ? msg : null)),
      // Filter out nulls (rxjs `filter` does not narrow types well with strict null).
      map((msg) => msg!),
    );
  }

  /**
   * Real-time stream of message deletions for a specific channel.
   *
   * @param channelId - The channel to listen on.
   * @returns A hot `Observable<{ channelId: string; messageId: string }>`.
   */
  messageDeletions(
    channelId: string,
  ): Observable<{ channelId: string; messageId: string }> {
    return new Observable<{ channelId: string; messageId: string }>((subscriber) => {
      const sub = this._deletedMessage$
        .pipe(takeUntil(this._destroy$))
        .subscribe((event) => {
          if (event.channelId === channelId) {
            subscriber.next(event);
          }
        });

      return () => sub.unsubscribe();
    });
  }

  // ── Typing ────────────────────────────────────────────────────────────

  /**
   * Real-time stream of typing indicators for a specific channel.
   *
   * @param channelId - The channel to observe.
   * @returns A hot `Observable<TypingEvent>`.
   */
  typingStream(channelId: string): Observable<TypingEvent> {
    return new Observable<TypingEvent>((subscriber) => {
      const sub = this._typing$
        .pipe(takeUntil(this._destroy$))
        .subscribe((event) => {
          if (event.channelId === channelId) {
            subscriber.next(event);
          }
        });

      return () => sub.unsubscribe();
    });
  }

  /**
   * Signal that the current user started typing in a channel.
   *
   * @param channelId - The channel the user is typing in.
   */
  startTyping(channelId: string): void {
    this.streamKit.client.chat.startTyping(channelId);
  }

  /**
   * Signal that the current user stopped typing in a channel.
   *
   * @param channelId - The channel the user was typing in.
   */
  stopTyping(channelId: string): void {
    this.streamKit.client.chat.stopTyping(channelId);
  }

  // ── Reactions ─────────────────────────────────────────────────────────

  /**
   * Add a reaction to a message.
   */
  addReaction(channelId: string, messageId: string, emoji: string): Observable<void> {
    return from(this.streamKit.client.chat.addReaction(channelId, messageId, emoji));
  }

  /**
   * Remove a reaction from a message.
   */
  removeReaction(channelId: string, messageId: string, emoji: string): Observable<void> {
    return from(this.streamKit.client.chat.removeReaction(channelId, messageId, emoji));
  }

  // ── Read Receipts ─────────────────────────────────────────────────────

  /**
   * Mark a message as read.
   */
  markAsRead(channelId: string, messageId: string): Observable<void> {
    return from(this.streamKit.client.chat.markAsRead(channelId, messageId));
  }

  // ── Internal ──────────────────────────────────────────────────────────

  /**
   * Bridge core SDK events into RxJS subjects.
   */
  private _setupEventBridge(): void {
    const client = this.streamKit.client;

    this._unsubs.push(
      client.on('message.new', (msg) => this._newMessage$.next(msg)),
    );

    this._unsubs.push(
      client.on('message.updated', (msg) => this._updatedMessage$.next(msg)),
    );

    this._unsubs.push(
      client.on('message.deleted', (event) => this._deletedMessage$.next(event)),
    );

    this._unsubs.push(
      client.on('typing.start', (event) => this._typing$.next(event)),
    );

    this._unsubs.push(
      client.on('typing.stop', (event) => this._typing$.next(event)),
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

    this._newMessage$.complete();
    this._updatedMessage$.complete();
    this._deletedMessage$.complete();
    this._typing$.complete();
  }
}
