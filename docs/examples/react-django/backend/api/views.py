"""
API views for the RajutechieStreamKit React + Django example.

All endpoints use the ``rajutechie_streamkit_django`` adapter to interact with the
RajutechieStreamKit platform.  Authentication is deliberately simple (username/password
stored in a local JSON file) so the example can run without a full user
database.  In production you would integrate with ``django.contrib.auth`` or
an external identity provider.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from rajutechie_streamkit_django import RajutechieStreamKitClient, generate_user_token

from .serializers import (
    CreateCallSerializer,
    CreateChannelSerializer,
    CreateStreamSerializer,
    LoginSerializer,
    RegisterSerializer,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tiny flat-file user store (example only -- not for production!)
# ---------------------------------------------------------------------------

_USERS_FILE = Path(settings.BASE_DIR) / "users.json"


def _load_users() -> dict:
    if _USERS_FILE.exists():
        return json.loads(_USERS_FILE.read_text())
    return {}


def _save_users(users: dict) -> None:
    _USERS_FILE.write_text(json.dumps(users, indent=2))


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

    users = _load_users()
    user = users.get(username)

    if not user or user["password_hash"] != _hash_password(password):
        return Response(
            {"error": "Invalid username or password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    token = generate_user_token(
        user_id=user["id"],
        name=user.get("display_name", username),
        role="user",
        expires_in=86400,
    )

    return Response({
        "user": {
            "id": user["id"],
            "username": username,
            "display_name": user.get("display_name", username),
        },
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

    users = _load_users()
    if username in users:
        return Response(
            {"error": "Username already taken"},
            status=status.HTTP_409_CONFLICT,
        )

    # Create user in RajutechieStreamKit
    sk = _get_rajutechie-streamkit_client()
    try:
        sk_user = sk.users.create(
            external_id=username,
            display_name=display_name,
        )
    except Exception as exc:
        logger.exception("Failed to create user in RajutechieStreamKit")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    user_id = sk_user.get("id", username)

    users[username] = {
        "id": user_id,
        "display_name": display_name,
        "password_hash": _hash_password(password),
    }
    _save_users(users)

    token = generate_user_token(
        user_id=user_id,
        name=display_name,
        role="user",
        expires_in=86400,
    )

    return Response(
        {
            "user": {
                "id": user_id,
                "username": username,
                "display_name": display_name,
            },
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
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    users = _load_users()
    result = [
        {
            "id": u["id"],
            "username": uname,
            "display_name": u.get("display_name", uname),
        }
        for uname, u in users.items()
    ]
    return Response(result)


# ---------------------------------------------------------------------------
# Channels
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_channel(request):
    """Create a direct or group channel via RajutechieStreamKit."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = CreateChannelSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    channel_type = serializer.validated_data["type"]
    name = serializer.validated_data.get("name", "")
    member_ids = serializer.validated_data["member_ids"]

    # Always include the requesting user
    user_id = auth_user["sub"]
    if user_id not in member_ids:
        member_ids.insert(0, user_id)

    sk = _get_rajutechie-streamkit_client()
    try:
        channel = sk.chat.create_channel(
            type=channel_type,
            name=name if channel_type == "group" else None,
            members=member_ids,
            created_by=user_id,
        )
    except Exception as exc:
        logger.exception("Failed to create channel")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response(channel, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def list_channels(request):
    """List channels for the authenticated user."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie-streamkit_client()
    try:
        # The RajutechieStreamKit API filters by member when memberId is provided
        channels = sk._http.get(
            "/channels",
            params={"member_id": auth_user["sub"]},
        )
        channels.raise_for_status()
        return Response(channels.json())
    except Exception as exc:
        logger.exception("Failed to list channels")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_call(request):
    """Initiate a new audio or video call."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = CreateCallSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    call_type = serializer.validated_data["type"]
    participant_ids = serializer.validated_data["participant_ids"]
    user_id = auth_user["sub"]

    if user_id not in participant_ids:
        participant_ids.insert(0, user_id)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.post(
            "/calls",
            json={
                "type": call_type,
                "participants": participant_ids,
                "initiatedBy": user_id,
            },
        )
        resp.raise_for_status()
        return Response(resp.json(), status=status.HTTP_201_CREATED)
    except Exception as exc:
        logger.exception("Failed to create call")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
def get_call(request, call_id: str):
    """Retrieve details for a specific call."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.get(f"/calls/{call_id}")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to get call")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ---------------------------------------------------------------------------
# Streams (live streaming)
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_stream(request):
    """Create a new live stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    serializer = CreateStreamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.post(
            "/streams",
            json={
                "title": serializer.validated_data["title"],
                "visibility": serializer.validated_data.get("visibility", "public"),
                "hostId": auth_user["sub"],
            },
        )
        resp.raise_for_status()
        return Response(resp.json(), status=status.HTTP_201_CREATED)
    except Exception as exc:
        logger.exception("Failed to create stream")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
def list_streams(request):
    """List active live streams."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.get("/streams", params={"status": "live"})
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to list streams")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
def start_stream(request, stream_id: str):
    """Start (go live on) an existing stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.post(f"/streams/{stream_id}/start")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to start stream")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
def stop_stream(request, stream_id: str):
    """Stop an active live stream."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie-streamkit_client()
    try:
        resp = sk._http.post(f"/streams/{stream_id}/stop")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to stop stream")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

@api_view(["POST"])
def create_meeting(request):
    """Schedule a new meeting via the RajutechieStreamKit API."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    from .serializers import CreateMeetingSerializer
    serializer = CreateMeetingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    sk = _get_rajutechie_streamkit_client()
    try:
        payload = {
            "title": serializer.validated_data["title"],
            "durationMins": serializer.validated_data["duration_mins"],
        }
        if serializer.validated_data.get("scheduled_at"):
            payload["scheduledAt"] = serializer.validated_data["scheduled_at"].isoformat()
        if serializer.validated_data.get("password"):
            payload["password"] = serializer.validated_data["password"]
        resp = sk._http.post("/meetings", json=payload)
        resp.raise_for_status()
        return Response(resp.json(), status=status.HTTP_201_CREATED)
    except Exception as exc:
        logger.exception("Failed to create meeting")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
def list_meetings(request):
    """List meetings for the authenticated user."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie_streamkit_client()
    try:
        resp = sk._http.get("/meetings")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to list meetings")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
def get_meeting(request, meeting_id: str):
    """Retrieve a specific meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie_streamkit_client()
    try:
        resp = sk._http.get(f"/meetings/{meeting_id}")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
def join_meeting(request, meeting_id: str):
    """Join a meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    from .serializers import JoinMeetingSerializer
    serializer = JoinMeetingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    sk = _get_rajutechie_streamkit_client()
    try:
        payload = {"userId": auth_user["sub"]}
        if serializer.validated_data.get("password"):
            payload["password"] = serializer.validated_data["password"]
        resp = sk._http.post(f"/meetings/{meeting_id}/participants", json=payload)
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to join meeting")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
def leave_meeting(request, meeting_id: str):
    """Leave a meeting."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie_streamkit_client()
    try:
        resp = sk._http.delete(f"/meetings/{meeting_id}/participants/{auth_user['sub']}")
        resp.raise_for_status()
        return Response({"status": "left"})
    except Exception as exc:
        logger.exception("Failed to leave meeting")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["POST"])
def end_meeting(request, meeting_id: str):
    """End a meeting (host only)."""
    auth_user = _authenticate_request(request)
    if not auth_user:
        return Response({"error": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)

    sk = _get_rajutechie_streamkit_client()
    try:
        resp = sk._http.post(f"/meetings/{meeting_id}/end")
        resp.raise_for_status()
        return Response(resp.json())
    except Exception as exc:
        logger.exception("Failed to end meeting")
        return Response(
            {"error": f"RajutechieStreamKit error: {exc}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
