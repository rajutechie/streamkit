"""API URL routing."""

from django.urls import path

from rajutechie_streamkit_django.webhooks import webhook_view

from . import views

# Importing webhooks registers the handlers with the webhook_handler decorator.
from . import webhooks  # noqa: F401

urlpatterns = [
    # Auth
    path("auth/login", views.login_view, name="login"),
    path("auth/register", views.register_view, name="register"),

    # Users
    path("users", views.list_users, name="list-users"),

    # Channels
    path("channels", views.list_channels, name="list-channels"),
    path("channels/create", views.create_channel, name="create-channel"),

    # Calls
    path("calls", views.create_call, name="create-call"),
    path("calls/<str:call_id>", views.get_call, name="get-call"),

    # Streams
    path("streams", views.list_streams, name="list-streams"),
    path("streams/create", views.create_stream, name="create-stream"),
    path("streams/<str:stream_id>/start", views.start_stream, name="start-stream"),
    path("streams/<str:stream_id>/stop", views.stop_stream, name="stop-stream"),

    # Meetings
    path("meetings", views.list_meetings, name="list-meetings"),
    path("meetings/create", views.create_meeting, name="create-meeting"),
    path("meetings/<str:meeting_id>", views.get_meeting, name="get-meeting"),
    path("meetings/<str:meeting_id>/join", views.join_meeting, name="join-meeting"),
    path("meetings/<str:meeting_id>/leave", views.leave_meeting, name="leave-meeting"),
    path("meetings/<str:meeting_id>/end", views.end_meeting, name="end-meeting"),

    # Webhooks
    path("webhooks/rajutechie-streamkit", webhook_view, name="rajutechie-streamkit-webhook"),
]
