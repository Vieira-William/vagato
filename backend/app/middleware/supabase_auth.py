"""
Middleware de autenticação JWT para usuários Supabase.

Suporta dois modos de validação:
  1. ES256 via JWKS  — Supabase ECC (P-256), sistema atual (padrão)
  2. HS256 via secret — Legacy shared secret (fallback)
  3. Modo dev         — Sem config, bypass com payload simulado

Fluxo de seleção (por request):
  SUPABASE_URL configurado  → tenta ES256 via JWKS primeiro
  Falha ES256 + JWT_SECRET  → tenta HS256 (tokens legados ainda válidos)
  Nenhum configurado        → dev bypass com warning único

JWKS é cacheado em memória (reset automático em caso de falha de validação,
para suportar rotação de chaves sem restart do servidor).
"""
import os
import logging
import asyncio
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, jwk, JWTError
from jose.exceptions import ExpiredSignatureError, JWTClaimsError

logger = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
JWT_AUDIENCE = "authenticated"

# auto_error=False → controle manual do 401 (evita 403 automático do FastAPI)
security = HTTPBearer(auto_error=False)

# ── JWKS Cache ───────────────────────────────────────────────────────────────
_jwks_cache: Optional[dict] = None
_jwks_lock = asyncio.Lock()


async def _get_jwks() -> dict:
    """Retorna JWKS do Supabase, cacheando em memória após primeiro fetch."""
    global _jwks_cache
    if _jwks_cache is not None:
        return _jwks_cache

    async with _jwks_lock:
        # Double-check dentro do lock
        if _jwks_cache is not None:
            return _jwks_cache

        url = f"{SUPABASE_URL}/auth/v1/jwks"
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                data = resp.json()
                _jwks_cache = data
                n_keys = len(data.get("keys", []))
                logger.info(f"[JWT] JWKS carregado — {n_keys} chave(s) — {url}")
                return _jwks_cache
        except httpx.HTTPError as e:
            logger.error(f"[JWT] Falha ao buscar JWKS de {url}: {e}")
            raise


def _invalidate_jwks_cache() -> None:
    """Invalida o cache JWKS. Chame após rotação de chaves."""
    global _jwks_cache
    _jwks_cache = None
    logger.info("[JWT] Cache JWKS invalidado.")


def _find_key(jwks: dict, kid: Optional[str]):
    """
    Retorna a chave JWK correspondente ao 'kid' do token.
    Se kid for None ou não encontrar, retorna a primeira chave disponível.
    """
    keys = jwks.get("keys", [])
    if not keys:
        raise ValueError("JWKS não contém nenhuma chave pública.")

    if kid:
        for k in keys:
            if k.get("kid") == kid:
                return k
        logger.warning(f"[JWT] kid='{kid}' não encontrado no JWKS — usando primeira chave.")

    return keys[0]


# Flags de warning único
_warned_no_config = False


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """
    FastAPI Dependency — valida JWT do Supabase Auth.

    Retorna payload com claims:
      sub (user_id UUID), email, role, aud, exp, iat

    Status codes:
      401 — token ausente, inválido ou expirado
    """
    global _warned_no_config

    # ── Modo dev: sem config → bypass ─────────────────────────────────────
    if not SUPABASE_URL and not SUPABASE_JWT_SECRET:
        if not _warned_no_config:
            logger.warning(
                "⚠️  SUPABASE_URL e SUPABASE_JWT_SECRET ausentes — "
                "autenticação desabilitada (modo desenvolvimento)."
            )
            _warned_no_config = True
        return {
            "sub": "dev-user",
            "email": "dev@vagas.local",
            "role": "authenticated",
            "aud": "authenticated",
        }

    # ── Token ausente ──────────────────────────────────────────────────────
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticação ausente",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # ── Rota 1: ES256 via JWKS (Supabase ECC P-256) ───────────────────────
    if SUPABASE_URL:
        try:
            jwks = await _get_jwks()

            # Identifica a chave correta via kid no header do token
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            key_data = _find_key(jwks, kid)
            public_key = jwk.construct(key_data)

            payload = jwt.decode(
                token,
                public_key,
                algorithms=["ES256"],
                audience=JWT_AUDIENCE,
                options={"require_sub": True, "require_exp": True},
            )
            return payload

        except (ExpiredSignatureError, JWTClaimsError) as e:
            # Erros de claims/expiração são definitivos — não fazer fallback
            logger.warning(f"[JWT] Token ES256 rejeitado: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except JWTError as e:
            # kid não bateu ou assinatura inválida → invalida cache e tenta HS256
            logger.warning(f"[JWT] Falha ES256 (kid mismatch?): {e} — invalidando cache JWKS.")
            _invalidate_jwks_cache()
        except (httpx.HTTPError, ValueError, Exception) as e:
            logger.error(f"[JWT] Erro inesperado ES256: {e}")

    # ── Rota 2: HS256 legacy (fallback) ───────────────────────────────────
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience=JWT_AUDIENCE,
                options={"require_sub": True, "require_exp": True},
            )
            return payload
        except JWTError as e:
            logger.warning(f"[JWT] Token HS256 inválido: {e}")

    # ── Todas as rotas falharam ────────────────────────────────────────────
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_user_id(payload: dict) -> str:
    """Extrai user_id (UUID Supabase) do payload JWT."""
    return payload["sub"]


def get_user_email(payload: dict) -> Optional[str]:
    """Extrai email do payload JWT."""
    return payload.get("email")
