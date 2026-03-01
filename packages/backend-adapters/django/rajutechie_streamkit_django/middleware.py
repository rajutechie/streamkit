from django.http import JsonResponse
from .token import verify_token


class RajutechieStreamKitAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            try:
                token = auth_header[7:]
                request.rajutechie-streamkit_user = verify_token(token)
            except Exception:
                request.rajutechie-streamkit_user = None
        else:
            request.rajutechie-streamkit_user = None

        return self.get_response(request)


def require_rajutechie_streamkit_auth(view_func):
    def wrapper(request, *args, **kwargs):
        if not getattr(request, "rajutechie-streamkit_user", None):
            return JsonResponse({"error": "Authentication required"}, status=401)
        return view_func(request, *args, **kwargs)
    wrapper.__name__ = view_func.__name__
    return wrapper
