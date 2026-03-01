from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from .dependencies import get_rajutechie-streamkit


class RajutechieStreamKitAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            try:
                client = get_rajutechie-streamkit()
                token = auth_header[7:]
                request.state.rajutechie-streamkit_user = client.verify_token(token)
            except Exception:
                request.state.rajutechie-streamkit_user = None
        else:
            request.state.rajutechie-streamkit_user = None

        return await call_next(request)
