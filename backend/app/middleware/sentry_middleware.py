import sentry_sdk
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request


class SentryUserMiddleware(BaseHTTPMiddleware):
    """
    Middleware que propaga o contexto do usuário autenticado para o Sentry.
    Lê request.state.user (setado por outros middlewares de auth, se existirem)
    e chama sentry_sdk.set_user() para enriquecer os eventos com identidade.
    """

    async def dispatch(self, request: Request, call_next):
        user = getattr(request.state, "user", None)
        if user and isinstance(user, dict):
            sentry_sdk.set_user({
                "id": str(user.get("id", "")),
                "email": user.get("email", ""),
            })
        else:
            # Requisição anônima — limpar contexto de usuário anterior
            sentry_sdk.set_user(None)

        response = await call_next(request)
        return response
