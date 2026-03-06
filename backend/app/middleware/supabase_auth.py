"""
Middleware de autenticação JWT para usuários Supabase.

Valida tokens JWT emitidos pelo Supabase Auth usando HS256 + JWT_SECRET.
100% local, custo zero, sem chamadas HTTP ao Supabase em runtime.

Roadmap:
  - MVP (atual): HS256 + SUPABASE_JWT_SECRET (python-jose)
  - Médio prazo: migrar python-jose → PyJWT
  - Longo prazo: JWKS endpoint + ES256 assimétrico
"""
import os
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

# ── Config ──────────────────────────────────────────────────────────────────
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_AUDIENCE = "authenticated"

# auto_error=False: retorna None em vez de 403 automático (controle fino)
security = HTTPBearer(auto_error=False)

# Flag de warning (logado apenas uma vez)
_warned_no_secret = False


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    FastAPI Dependency: valida JWT do Supabase Auth.

    Retorna payload com claims: sub (user_id), email, role, aud, exp, iat.

    Status codes:
      401 — token ausente, inválido ou expirado

    Se SUPABASE_JWT_SECRET não estiver configurado, permite acesso (modo dev)
    com um payload simulado logando WARNING.
    """
    global _warned_no_secret

    # ── Modo dev: sem secret configurado → bypass com warning ──
    if not SUPABASE_JWT_SECRET:
        if not _warned_no_secret:
            logger.warning(
                "⚠️  SUPABASE_JWT_SECRET não configurado — "
                "autenticação JWT desabilitada (modo desenvolvimento). "
                "Configure no .env para proteger endpoints em produção."
            )
            _warned_no_secret = True
        return {
            "sub": "dev-user",
            "email": "dev@vagas.local",
            "role": "authenticated",
            "aud": "authenticated",
        }

    # ── Token ausente ──
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Validar JWT ──
    try:
        payload = jwt.decode(
            credentials.credentials,
            SUPABASE_JWT_SECRET,
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            options={
                "require_sub": True,
                "require_exp": True,
            },
        )
        return payload

    except JWTError as e:
        logger.warning(f"[Supabase Auth] Token inválido: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ── Helpers ─────────────────────────────────────────────────────────────────

def get_user_id(payload: dict) -> str:
    """Extrai user_id (UUID Supabase) do payload JWT."""
    return payload["sub"]


def get_user_email(payload: dict) -> Optional[str]:
    """Extrai email do payload JWT."""
    return payload.get("email")
