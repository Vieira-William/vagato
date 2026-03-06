"""
Middleware de autenticação JWT para a Chrome Extension Vagato.

Gera e valida tokens JWT dedicados para a extension.
Independente do Supabase — a extension é um cliente separado.
"""
import os
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

logger = logging.getLogger(__name__)

# Secret key para JWT — lê do .env obrigatoriamente em produção
_ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
EXTENSION_JWT_SECRET = os.getenv("EXTENSION_JWT_SECRET")
if not EXTENSION_JWT_SECRET:
    if _ENVIRONMENT == "production":
        raise RuntimeError("EXTENSION_JWT_SECRET não definido. Configure no painel do Render.")
    EXTENSION_JWT_SECRET = "dev-only-insecure-fallback"
    logger.warning("[Extension Auth] EXTENSION_JWT_SECRET não definido. Usando fallback de desenvolvimento.")
EXTENSION_JWT_ALGORITHM = "HS256"
EXTENSION_JWT_EXPIRE_DAYS = 30

security = HTTPBearer(auto_error=False)


def create_extension_token(email: str, profile_id: int) -> dict:
    """
    Gera JWT para a extension.

    Returns:
        {token, expires_at}
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=EXTENSION_JWT_EXPIRE_DAYS)

    payload = {
        "sub": email,
        "profile_id": profile_id,
        "iat": now,
        "exp": expire,
        "iss": "vagato-extension",
    }

    token = jwt.encode(payload, EXTENSION_JWT_SECRET, algorithm=EXTENSION_JWT_ALGORITHM)

    return {
        "token": token,
        "expires_at": expire.isoformat(),
        "profile_id": profile_id,
        "email": email,
    }


def decode_extension_token(token: str) -> dict:
    """Decodifica e valida JWT da extension. Raises JWTError se inválido."""
    return jwt.decode(
        token,
        EXTENSION_JWT_SECRET,
        algorithms=[EXTENSION_JWT_ALGORITHM],
        options={"require_sub": True, "require_exp": True},
    )


async def verify_extension_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    FastAPI dependency que valida JWT da extension.

    Uso:
        @router.get("/extension/profile")
        async def get_profile(auth: dict = Depends(verify_extension_token)):
            email = auth["sub"]
            profile_id = auth["profile_id"]
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_extension_token(credentials.credentials)
        return payload
    except JWTError as e:
        logger.warning(f"[Extension Auth] Token inválido: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def should_refresh_token(payload: dict) -> bool:
    """Verifica se o token deve ser renovado (< 7 dias para expirar)."""
    exp = payload.get("exp", 0)
    now = datetime.now(timezone.utc).timestamp()
    days_remaining = (exp - now) / 86400
    return days_remaining < 7
