import time
import jwt
from django.conf import settings


def generate_user_token(
    user_id: str,
    name: str | None = None,
    role: str = "user",
    expires_in: int = 3600,
    grants: dict | None = None,
) -> str:
    api_key = getattr(settings, "RAJUTECHIE_STREAMKIT_API_KEY", "")
    api_secret = getattr(settings, "RAJUTECHIE_STREAMKIT_API_SECRET", "")

    now = int(time.time())
    payload = {
        "sub": user_id,
        "iss": api_key,
        "iat": now,
        "exp": now + expires_in,
        "role": role,
    }
    if name:
        payload["name"] = name
    if grants:
        payload["grants"] = grants

    return jwt.encode(payload, api_secret, algorithm="HS256")


def verify_token(token: str) -> dict:
    api_key = getattr(settings, "RAJUTECHIE_STREAMKIT_API_KEY", "")
    api_secret = getattr(settings, "RAJUTECHIE_STREAMKIT_API_SECRET", "")

    return jwt.decode(token, api_secret, algorithms=["HS256"], issuer=api_key)
