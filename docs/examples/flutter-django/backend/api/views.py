"""
API views for the RajutechieStreamKit Flutter + Django example.

Uses in-memory dictionaries as the data store so the example can run without
any database setup. In production you would use Django models and a proper
database.
"""

from __future__ import annotations

import hashlib
import logging
import uuid
from datetime import datetime, timezone

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from rajutechie_streamkit_django import RajutechieStreamKitClient, generate_user_token

from .serializers import (
    CallSerializer,
    ChannelSerializer,
    LoginSerializer,
    RegisterSerializer,
    StreamSerializer,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-memory storage (demo only -- not for production!)
# ---------------------------------------------------------------------------

_users: dict[str, dict] = {}
_channels: dict[str, dict] = {}
_calls: dict[str, dict] = {}
_streams: dict[str, dict] = {}


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _get_rajutechie-streamkit_client() -> RajutechieStreamKitClient:
    return RajutechieStreamKitClient(
        api_key=settings.RAJUTECHIE_STREAMKIT_API_KEY,
        api_secret=settings.RAJUTECHIE_STREAMKIT_API_SECRET,
        base_url=settings.RAJUTECHIE_STREAMKIT_API_URL,
    )


def _authenticate_request(request) -> dict | None:
    """Extract and verify the RajutechieStreamKit user token from the Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        from rajutechie_streamkit_django import verify_token
        return verify_token(token)
    except Exception:
        return None


def _user_response(user_data: dict) -> dict:
    """Format a user dict for API responses."""
    return {
        "id": user_data["id"],
        "username": user_data["username"],
        "display_name": user_data["display_name"],
        "avatar_url": user_data.get("avatar_url"),
    }


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@api_view(["POST"])
def login_view(request):
    """Authenticate a user and return a RajutechieStreamKit token."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    username = serializer.validated_data["username"]
    password = serializer.validated_data["password"]

    user = None
    for u in _users.values():
        if u["username"] == username:
            user = u
            break

    if not user or user["password_hash"] != _hash_password(password):
        return Response(
            {"error": "Invalid username or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token = generate_user_token(
        user_id=user["id"],
        name=user["display_name"],
        role="user",
        expires_in=86400,
    )

    return Response({
        "user": _user_response(user),
        "token": token,
    })


@api_view(["POST"])
def register_view(request):
    """Register a new user, create them in RajutechieStreamKit, and return a token."""
    serializer = RegisterSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    username = serializer.validated_data["username"]
    password = serializer.validated_data["password"]
    display_name = serializer.validated_data.get("display_name", username)

    for u in _users.values():
        if u["username"] == username:
            return Response(
                {"error": "Username already taken"},
                status=status.HTTP_409_CONFLICT,
            )

    sk = _get_rajutechie-streamkit_client()
    try:
        sk_user = sk.users.create(
            external_id=username,
            display_name=display_name,
        )
        user_id = sk_user.get("id", str(uuid.uuid4()))
    except Exception:
        logger.warning("RajutechieStreamKit user creation failed; using local ID")
        user_id = str(uuid.uuid4())

    user_data = {
        "id": user_id,
        "username": username,
        "display_name": display_name,
        "password_hash": _hash_password(password),
        "avatar_url": None,
        "created_at": _now_iso(),
    }
    _users[user_id] = user_data

    token = generate_user_token(
        user_id=user_id,
        name=display_name,
        role="user",
        expires_in=86400,
    )

    return Response(
        {
            "user": _user_response(user_data),
            "token": token,
        },
        status=status.HTTP_201_CREATED,
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@api_view(["GET"])
def list_users(request):
    """Return all registered users (for starting DMs and calls)."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    result = [_user_response(u) for u in _users.values()]
    return Response(result)


# ---------------------------------------------------------------------------
# Channels
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_channel(request):
    """Create a direct or group channel."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = ChannelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    channel_type = serializer.validated_data["type"]
    name = serializer.validated_data.get("name", "")
    member_ids = serializer.validated_data["member_ids"]

    user_id = auth_user["sub"]
    if user_id not in member_ids:
        member_ids.insert(0, user_id)

    if channel_type == "direct" and len(member_ids) == 2:
        for ch in _channels.values():
            if ch["type"] == "direct" and set(ch["member_ids"]) == set(member_ids):
                return Response(ch, status=status.HTTP_200_OK)

    now = _now_iso()
    channel_id = str(uuid.uuid4())

    member_names = []
    for mid in member_ids:
        u = _users.get(mid)
        if u:
            member_names.append(u["display_name"])

    if channel_type == "direct" and not name:
        other_names = [n for mid, n in zip(member_ids, member_names) if mid != user_id]
        name = other_names[0] if other_names else "Direct Message"

    channel = {
        "id": channel_id,
        "type": channel_type,
        "name": name if channel_type == "group" else name,
        "member_ids": member_ids,
        "member_names": member_names,
        "member_count": len(member_ids),
        "created_by": user_id,
        "last_message": None,
        "last_message_at": None,
        "unread_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    _channels[channel_id] = channel

    sk = _get_rajutechie-streamkit_client()
    try:
        sk.chat.create_channel(
            type=channel_type,
            name=name if channel_type == "group" else None,
            members=member_ids,
            created_by=user_id,
        )
    except Exception:
        logger.warning("RajutechieStreamKit channel creation forwarding failed")

    return Response(channel, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def list_channels(request):
    """List channels for the authenticated user."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user_id = auth_user["sub"]
    user_channels = [
        ch for ch in _channels.values()
        if user_id in ch["member_ids"]
    ]

    user_channels.sort(
        key=lambda c: c.get("last_message_at") or c["created_at"],
        reverse=True,
    )

    return Response(user_channels)


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_call(request):
    """Initiate a new audio or video call."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = CallSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    call_type = serializer.validated_data["type"]
    participant_ids = serializer.validated_data["participant_ids"]
    user_id = auth_user["sub"]

    if user_id not in participant_ids:
        participant_ids.insert(0, user_id)

    now = _now_iso()
    call_id = str(uuid.uuid4())

    participants = []
    for pid in participant_ids:
        u = _users.get(pid)
        participants.append({
            "id": str(uuid.uuid4()),
            "user_id": pid,
            "display_name": u["display_name"] if u else pid,
            "role": "initiator" if pid == user_id else "participant",
            "status": "joined" if pid == user_id else "invited",
            "has_audio": True,
            "has_video": call_type == "video",
            "has_screen": False,
            "joined_at": now if pid == user_id else None,
        })

    caller = _users.get(user_id)
    call = {
        "id": call_id,
        "type": call_type,
        "status": "ringing",
        "initiated_by": user_id,
        "caller_name": caller["display_name"] if caller else user_id,
        "participants": participants,
        "started_at": now,
        "answered_at": None,
        "ended_at": None,
        "end_reason": None,
    }
    _calls[call_id] = call

    sk = _get_rajutechie-streamkit_client()
    try:
        sk._http.post(
            "/calls",
            json={
                "type": call_type,
                "participants": participant_ids,
                "initiatedBy": user_id,
            },
        )
    except Exception:
        logger.warning("RajutechieStreamKit call creation forwarding failed")

    return Response(call, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def get_call(request, call_id: str):
    """Retrieve details for a specific call."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    call = _calls.get(call_id)
    if not call:
        return Response(
            {"error": "Call not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(call)


# ---------------------------------------------------------------------------
# Streams (live streaming)
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_stream(request):
    """Create a new live stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    serializer = StreamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_id = auth_user["sub"]
    host = _users.get(user_id)
    now = _now_iso()
    stream_id = str(uuid.uuid4())

    stream = {
        "id": stream_id,
        "title": serializer.validated_data["title"],
        "visibility": serializer.validated_data.get("visibility", "public"),
        "host_id": user_id,
        "host_name": host["display_name"] if host else user_id,
        "status": "created",
        "viewer_count": 0,
        "created_at": now,
        "started_at": None,
        "ended_at": None,
    }
    _streams[stream_id] = stream

    return Response(stream, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def list_streams(request):
    """List live streams, optionally filtered by status query param."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    status_filter = request.query_params.get("status")
    streams = list(_streams.values())

    if status_filter:
        streams = [s for s in streams if s["status"] == status_filter]

    streams.sort(key=lambda s: s["created_at"], reverse=True)
    return Response(streams)


@api_view(["POST"])
def start_stream(request, stream_id: str):
    """Start (go live on) an existing stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    stream = _streams.get(stream_id)
    if not stream:
        return Response(
            {"error": "Stream not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if stream["host_id"] != auth_user["sub"]:
        return Response(
            {"error": "Only the host can start the stream"},
            status=status.HTTP_403_FORBIDDEN,
        )

    stream["status"] = "live"
    stream["started_at"] = _now_iso()

    sk = _get_rajutechie-streamkit_client()
    try:
        sk._http.post(f"/streams/{stream_id}/start")
    except Exception:
        logger.warning("RajutechieStreamKit stream start forwarding failed")

    return Response(stream)


@api_view(["POST"])
def stop_stream(request, stream_id: str):
    """Stop an active live stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    stream = _streams.get(stream_id)
    if not stream:
        return Response(
            {"error": "Stream not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if stream["host_id"] != auth_user["sub"]:
        return Response(
            {"error": "Only the host can stop the stream"},
            status=status.HTTP_403_FORBIDDEN,
        )

    stream["status"] = "ended"
    stream["ended_at"] = _now_iso()

    sk = _get_rajutechie-streamkit_client()
    try:
        sk._http.post(f"/streams/{stream_id}/stop")
    except Exception:
        logger.warning("RajutechieStreamKit stream stop forwarding failed")

    return Response(stream)


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

_meetings: dict[str, dict] = {}


@api_view(["POST"])
def create_meeting(request):
    """Schedule a new meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from .serializers import MeetingSerializer
    serializer = MeetingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    user_id = auth_user["sub"]
    host = _users.get(user_id)
    now = _now_iso()
    meeting_id = str(uuid.uuid4())

    meeting = {
        "id": meeting_id,
        "title": serializer.validated_data["title"],
        "host_id": user_id,
        "host_name": host["display_name"] if host else user_id,
        "status": "scheduled",
        "scheduled_at": (
            serializer.validated_data["scheduled_at"].isoformat()
            if serializer.validated_data.get("scheduled_at")
            else None
        ),
        "duration_mins": serializer.validated_data["duration_mins"],
        "has_password": bool(serializer.validated_data.get("password", "")),
        "_password": serializer.validated_data.get("password", ""),
        "participants": [{
            "user_id": user_id,
            "display_name": host["display_name"] if host else user_id,
            "role": "host",
            "joined_at": None,
        }],
        "participant_count": 0,
        "started_at": None,
        "ended_at": None,
        "created_at": now,
    }
    _meetings[meeting_id] = meeting

    return Response(_meeting_response(meeting), status=status.HTTP_201_CREATED)


@api_view(["GET"])
def list_meetings(request):
    """List meetings for the authenticated user."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    user_id = auth_user["sub"]
    user_meetings = [
        _meeting_response(m) for m in _meetings.values()
        if any(p["user_id"] == user_id for p in m["participants"])
    ]
    user_meetings.sort(
        key=lambda m: m.get("scheduled_at") or m["created_at"],
        reverse=False,
    )
    return Response(user_meetings)


@api_view(["GET"])
def get_meeting(request, meeting_id: str):
    """Get details for a specific meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    meeting = _meetings.get(meeting_id)
    if not meeting:
        return Response(
            {"error": "Meeting not found"},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(_meeting_response(meeting))


@api_view(["POST"])
def join_meeting(request, meeting_id: str):
    """Join a meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    from .serializers import JoinMeetingSerializer
    serializer = JoinMeetingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    meeting = _meetings.get(meeting_id)
    if not meeting:
        return Response(
            {"error": "Meeting not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if meeting["status"] == "ended":
        return Response(
            {"error": "Meeting has already ended"},
            status=status.HTTP_409_CONFLICT,
        )

    if meeting["_password"] and serializer.validated_data.get("password") != meeting["_password"]:
        return Response(
            {"error": "Incorrect meeting password"},
            status=status.HTTP_403_FORBIDDEN,
        )

    user_id = auth_user["sub"]
    user = _users.get(user_id)

    # Check if already a participant
    for p in meeting["participants"]:
        if p["user_id"] == user_id:
            p["joined_at"] = _now_iso()
            if meeting["status"] == "scheduled":
                meeting["status"] = "active"
                meeting["started_at"] = _now_iso()
            meeting["participant_count"] = sum(
                1 for p in meeting["participants"] if p["joined_at"]
            )
            return Response(_meeting_response(meeting))

    meeting["participants"].append({
        "user_id": user_id,
        "display_name": user["display_name"] if user else user_id,
        "role": "participant",
        "joined_at": _now_iso(),
    })

    if meeting["status"] == "scheduled":
        meeting["status"] = "active"
        meeting["started_at"] = _now_iso()

    meeting["participant_count"] = sum(
        1 for p in meeting["participants"] if p["joined_at"]
    )
    return Response(_meeting_response(meeting))


@api_view(["POST"])
def leave_meeting(request, meeting_id: str):
    """Leave a meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    meeting = _meetings.get(meeting_id)
    if not meeting:
        return Response(
            {"error": "Meeting not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    user_id = auth_user["sub"]
    for p in meeting["participants"]:
        if p["user_id"] == user_id:
            p["joined_at"] = None

    meeting["participant_count"] = sum(
        1 for p in meeting["participants"] if p["joined_at"]
    )
    return Response({"status": "left"})


@api_view(["POST"])
def end_meeting(request, meeting_id: str):
    """End a meeting (host only)."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response(
            {"error": "Authentication required"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    meeting = _meetings.get(meeting_id)
    if not meeting:
        return Response(
            {"error": "Meeting not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    if meeting["host_id"] != auth_user["sub"]:
        return Response(
            {"error": "Only the host can end the meeting"},
            status=status.HTTP_403_FORBIDDEN,
        )

    meeting["status"] = "ended"
    meeting["ended_at"] = _now_iso()
    return Response(_meeting_response(meeting))


def _meeting_response(meeting: dict) -> dict:
    """Strip internal password field from meeting response."""
    result = {k: v for k, v in meeting.items() if k != "_password"}
    return result
