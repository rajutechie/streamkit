"""
DRF serializers for request validation.

These serializers validate the shape of incoming requests. The demo uses
in-memory storage, so no Django models are persisted.
"""

from rest_framework import serializers


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128)


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(max_length=128, write_only=True)
    display_name = serializers.CharField(max_length=255, required=False)


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    username = serializers.CharField(max_length=150, read_only=True)
    display_name = serializers.CharField(max_length=255, read_only=True)


# ---------------------------------------------------------------------------
# Channels
# ---------------------------------------------------------------------------

class ChannelSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["direct", "group"])
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    member_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

class CallSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["audio", "video"])
    participant_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


# ---------------------------------------------------------------------------
# Streams
# ---------------------------------------------------------------------------

class StreamSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    visibility = serializers.ChoiceField(
        choices=["public", "private", "unlisted"],
        default="public",
    )


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

class MeetingSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    password = serializers.CharField(max_length=64, required=False, allow_blank=True)
    duration_mins = serializers.IntegerField(min_value=1, max_value=480, default=60)
    settings = serializers.DictField(required=False, default=dict)


class JoinMeetingSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=64, required=False, allow_blank=True)
