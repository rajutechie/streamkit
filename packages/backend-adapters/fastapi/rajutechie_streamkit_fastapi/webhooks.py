import hashlib
import hmac
import time
from fastapi import Request, HTTPException


class RajutechieStreamKitWebhook:
    @staticmethod
    async def verify(request: Request, secret: str, tolerance: int = 300) -> dict:
        signature = request.headers.get("x-rajutechie-streamkit-signature", "")
        body = await request.body()

        parts = dict(p.split("=", 1) for p in signature.split(",") if "=" in p)
        timestamp_str = parts.get("t", "")
        sig = parts.get("v1", "")

        if not timestamp_str or not sig:
            raise HTTPException(status_code=400, detail="Invalid webhook signature format")

        timestamp = int(timestamp_str)
        now = int(time.time())
        if abs(now - timestamp) > tolerance:
            raise HTTPException(status_code=400, detail="Webhook timestamp outside tolerance")

        signed_payload = f"{timestamp}.{body.decode('utf-8')}"
        expected = hmac.new(secret.encode(), signed_payload.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(expected, sig):
            raise HTTPException(status_code=400, detail="Webhook signature verification failed")

        import json
        return json.loads(body)
