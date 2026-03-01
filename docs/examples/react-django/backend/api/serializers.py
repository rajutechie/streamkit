"""
DRF serializers for request validation.

These serializers are intentionally lightweight -- the real data store is
the RajutechieStreamKit API, so we only validate the shape of incoming requests and
never persist Django models.
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


# ---------------------------------------------------------------------------
# Channels
# ---------------------------------------------------------------------------

class CreateChannelSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["direct", "group"])
    name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    member_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


# ---------------------------------------------------------------------------
# Calls
# ---------------------------------------------------------------------------

class CreateCallSerializer(serializers.Serializer):
    type = serializers.ChoiceField(choices=["audio", "video"])
    participant_ids = serializers.ListField(
        child=serializers.CharField(max_length=255),
        allow_empty=False,
    )


# ---------------------------------------------------------------------------
# Streams
# ---------------------------------------------------------------------------

class CreateStreamSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    visibility = serializers.ChoiceField(
        choices=["public", "private", "unlisted"],
        default="public",
    )


# ---------------------------------------------------------------------------
# Meetings
# ---------------------------------------------------------------------------

class CreateMeetingSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    scheduled_at = serializers.DateTimeField(required=False, allow_null=True)
    password = serializers.CharField(max_length=64, required=False, allow_blank=True)
    duration_mins = serializers.IntegerField(min_value=1, max_value=480, default=60)
    settings = serializers.DictField(required=False, default=dict)


class JoinMeetingSerializer(serializers.Serializer):
    password = serializers.CharField(max_length=64, required=False, allow_blank=True)
