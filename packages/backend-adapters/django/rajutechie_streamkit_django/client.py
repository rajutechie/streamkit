import httpx
from django.conf import settings


class RajutechieStreamKitClient:
    def __init__(self, api_key: str | None = None, api_secret: str | None = None, base_url: str | None = None):
        self.api_key = api_key or getattr(settings, "RAJUTECHIE_STREAMKIT_API_KEY", "")
        self.api_secret = api_secret or getattr(settings, "RAJUTECHIE_STREAMKIT_API_SECRET", "")
        self.base_url = (base_url or getattr(settings, "RAJUTECHIE_STREAMKIT_API_URL", "https://api.rajutechie-streamkit.io/v1")).rstrip("/")
        self._http = httpx.Client(
            base_url=self.base_url,
            headers={
                "X-API-Key": self.api_key,
                "X-API-Secret": self.api_secret,
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    @property
    def chat(self):
        return _ChatNamespace(self._http)

    @property
    def users(self):
        return _UserNamespace(self._http)

    def close(self):
        self._http.close()


class _ChatNamespace:
    def __init__(self, http: httpx.Client):
        self._http = http

    def create_channel(self, *, type: str, name: str | None = None, members: list[str] | None = None, created_by: str | None = None):
        payload: dict = {"type": type}
        if name:
            payload["name"] = name
        if members:
            payload["members"] = members
        if created_by:
            payload["createdBy"] = created_by
        resp = self._http.post("/channels", json=payload)
        resp.raise_for_status()
        return resp.json()

    def send_message(self, channel_id: str, *, text: str | None = None, attachments: list | None = None):
        payload: dict = {}
        if text:
            payload["text"] = text
        if attachments:
            payload["attachments"] = attachments
        resp = self._http.post(f"/channels/{channel_id}/messages", json=payload)
        resp.raise_for_status()
        return resp.json()


class _UserNamespace:
    def __init__(self, http: httpx.Client):
        self._http = http

    def create(self, *, external_id: str, display_name: str | None = None, metadata: dict | None = None):
        payload: dict = {"externalId": external_id}
        if display_name:
            payload["displayName"] = display_name
        if metadata:
            payload["metadata"] = metadata
        resp = self._http.post("/users", json=payload)
        resp.raise_for_status()
        return resp.json()

    def get(self, user_id: str):
        resp = self._http.get(f"/users/{user_id}")
        resp.raise_for_status()
        return resp.json()
