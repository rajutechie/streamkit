from fastapi import Depends, HTTPException, Header
from .client import RajutechieStreamKitClient

_client: RajutechieStreamKitClient | None = None


def configure(api_key: str, api_secret: str, base_url: str = "https://api.rajutechie-streamkit.io/v1"):
    global _client
    _client = RajutechieStreamKitClient(api_key, api_secret, base_url)


def get_rajutechie-streamkit() -> RajutechieStreamKitClient:
    if _client is None:
        raise RuntimeError("RajutechieStreamKit not configured. Call rajutechie_streamkit_fastapi.configure() first.")
    return _client


def get_current_user(authorization: str = Header(None), client: RajutechieStreamKitClient = Depends(get_rajutechie-streamkit)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization[7:]
    try:
        return client.verify_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
