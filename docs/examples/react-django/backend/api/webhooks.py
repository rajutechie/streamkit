"""
RajutechieStreamKit webhook handlers.

Register handlers for platform events such as new messages, call endings,
and live-stream lifecycle changes.  The ``webhook_handler`` decorator from
``rajutechie_streamkit_django`` takes care of matching events to the right function,
and ``webhook_view`` (wired in ``api/urls.py``) verifies the request
signature before dispatching.
"""

from __future__ import annotations

import logging

from rajutechie_streamkit_django.webhooks import webhook_handler

logger = logging.getLogger(__name__)


@webhook_handler("message.new")
def handle_new_message(event):
    """
    Fired every time a new message is sent in any channel.

    You could use this to trigger push notifications, store analytics,
    run content moderation, etc.
    """
    data = event.data
    logger.info(
        "New message in channel %s from %s: %s",
        data.get("channelId"),
        data.get("senderId"),
        (data.get("content", {}).get("text", ""))[:80],
    )


@webhook_handler("call.ended")
def handle_call_ended(event):
    """
    Fired when a call ends (any reason).

    You could log call duration, update billing, send a summary email, etc.
    """
    data = event.data
    logger.info(
        "Call %s ended. Reason: %s, Duration: %s s",
        data.get("id"),
        data.get("endReason", "unknown"),
        data.get("duration", 0),
    )


@webhook_handler("stream.started")
def handle_stream_started(event):
    """
    Fired when a live stream goes live.

    You could notify subscribers, kick off recording, or update a dashboard.
    """
    data = event.data
    logger.info(
        "Stream %s started by host %s: %s",
        data.get("id"),
        data.get("hostId"),
        data.get("title"),
    )


@webhook_handler("stream.ended")
def handle_stream_ended(event):
    """
    Fired when a live stream ends.

    You could finalize recording, compute analytics, archive the VOD, etc.
    """
    data = event.data
    logger.info(
        "Stream %s ended. Peak viewers: %s",
        data.get("id"),
        data.get("peakViewers", 0),
    )


@webhook_handler("meeting.started")
def handle_meeting_started(event):
    """
    Fired when a meeting goes from scheduled → active (first participant joins).
    """
    data = event.data
    logger.info(
        "Meeting %s started: %s (host: %s)",
        data.get("id"),
        data.get("title"),
        data.get("hostId"),
    )


@webhook_handler("meeting.ended")
def handle_meeting_ended(event):
    """
    Fired when a meeting ends.
    """
    data = event.data
    logger.info(
        "Meeting %s ended. Duration: %s min, Peak participants: %s",
        data.get("id"),
        data.get("durationMins", 0),
        data.get("peakParticipants", 0),
    )


@webhook_handler("meeting.participant.joined")
def handle_participant_joined(event):
    data = event.data
    logger.info("User %s joined meeting %s", data.get("userId"), data.get("meetingId"))


@webhook_handler("meeting.participant.left")
def handle_participant_left(event):
    data = event.data
    logger.info("User %s left meeting %s", data.get("userId"), data.get("meetingId"))
