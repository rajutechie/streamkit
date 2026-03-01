import hashlib
import hmac
import json
import time
from functools import wraps
from django.conf import settings
from django.http import JsonResponse


def verify_webhook(payload: bytes, signature: str, secret: str | None = None, tolerance: int = 300) -> dict:
    secret = secret or getattr(settings, "RAJUTECHIE_STREAMKIT_WEBHOOK_SECRET", "")
    parts = dict(p.split("=", 1) for p in signature.split(",") if "=" in p)

    timestamp_str = parts.get("t", "")
    sig = parts.get("v1", "")

    if not timestamp_str or not sig:
        raise ValueError("Invalid webhook signature format")

    timestamp = int(timestamp_str)
    now = int(time.time())
    if abs(now - timestamp) > tolerance:
        raise ValueError("Webhook timestamp outside tolerance")

    signed_payload = f"{timestamp}.{payload.decode('utf-8')}"
    expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(expected, sig):
        raise ValueError("Webhook signature verification failed")

    return json.loads(payload)


_handlers: dict[str, list] = {}


def webhook_handler(event_type: str):
    def decorator(func):
        _handlers.setdefault(event_type, []).append(func)
        return func
    return decorator


def webhook_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    signature = request.META.get("HTTP_X_RAJUTECHIE_STREAMKIT_SIGNATURE", "")
    try:
        event = verify_webhook(request.body, signature)
    except ValueError as e:
        return JsonResponse({"error": str(e)}, status=400)

    event_type = event.get("type", "")
    handlers = _handlers.get(event_type, [])
    for handler in handlers:
        handler(type("Event", (), {"type": event_type, "data": event.get("data", {}), "id": event.get("id")}))

    return JsonResponse({"status": "ok"})
