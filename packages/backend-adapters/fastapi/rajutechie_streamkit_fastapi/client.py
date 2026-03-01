import time
import jwt
import httpx


class RajutechieStreamKitClient:
    def __init__(self, api_key: str, api_secret: str, base_url: str = "https://api.rajutechie-streamkit.io/v1"):
        self.api_key = api_key
        self.api_secret = api_secret
        self.base_url = base_url.rstrip("/")
        self._http = httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "X-API-Key": api_key,
                "X-API-Secret": api_secret,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def generate_token(self, user_id: str, role: str = "user", expires_in: int = 3600, grants: dict | None = None) -> str:
        now = int(time.time())
        payload = {
            "sub": user_id,
            "iss": self.api_key,
            "iat": now,
            "exp": now + expires_in,
            "role": role,
        }
        if grants:
            payload["grants"] = grants
        return jwt.encode(payload, self.api_secret, algorithm="HS256")

    def verify_token(self, token: str) -> dict:
        return jwt.decode(token, self.api_secret, algorithms=["HS256"], issuer=self.api_key)

    @property
    def chat(self):
        return _ChatNamespace(self._http)

    @property
    def users(self):
        return _UserNamespace(self._http)

    async def close(self):
        await self._http.aclose()


class _ChatNamespace:
    def __init__(self, http: httpx.AsyncClient):
        self._http = http

    async def create_channel(self, *, type: str, name: str | None = None, members: list[str] | None = None):
        payload: dict = {"type": type}
        if name:
            payload["name"] = name
        if members:
            payload["members"] = members
        resp = await self._http.post("/channels", json=payload)
        resp.raise_for_status()
        return resp.json()

    async def send_message(self, channel_id: str, *, text: str | None = None):
        payload: dict = {}
        if text:
            payload["text"] = text
        resp = await self._http.post(f"/channels/{channel_id}/messages", json=payload)
        resp.raise_for_status()
        return resp.json()


class _UserNamespace:
    def __init__(self, http: httpx.AsyncClient):
        self._http = http

    async def create(self, *, external_id: str, display_name: str | None = None):
        payload: dict = {"externalId": external_id}
        if display_name:
            payload["displayName"] = display_name
        resp = await self._http.post("/users", json=payload)
        resp.raise_for_status()
        return resp.json()
