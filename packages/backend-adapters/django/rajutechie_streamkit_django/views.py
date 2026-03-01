from django.http import JsonResponse
from .client import RajutechieStreamKitClient
from .token import generate_user_token
from .middleware import require_rajutechie_streamkit_auth


@require_rajutechie_streamkit_auth
def get_token(request):
    user = request.rajutechie-streamkit_user
    token = generate_user_token(
        user_id=user["sub"],
        role=user.get("role", "user"),
    )
    return JsonResponse({"token": token})


@require_rajutechie_streamkit_auth
def create_channel(request):
    import json
    data = json.loads(request.body)
    client = RajutechieStreamKitClient()
    channel = client.chat.create_channel(
        type=data.get("type", "group"),
        name=data.get("name"),
        members=data.get("members", []),
        created_by=request.rajutechie-streamkit_user["sub"],
    )
    return JsonResponse(channel)
