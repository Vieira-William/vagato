from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import os
import json
import secrets
import httpx
from pathlib import Path
from dotenv import load_dotenv
from datetime import datetime, timezone

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

router = APIRouter(tags=["LinkedIn"])

# ─── Configuração OAuth2 LinkedIn ─────────────────────────────
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"

# Scopes disponíveis para apps padrão LinkedIn
SCOPES = ["openid", "profile", "email", "w_member_social"]

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = str(_BASE_DIR / "data" / "linkedin_token.json")

# Cache de state para CSRF protection
_pending_states: dict = {}


def _get_credentials():
    client_id = os.getenv("LINKEDIN_CLIENT_ID", "")
    client_secret = os.getenv("LINKEDIN_CLIENT_SECRET", "")
    redirect_uri = os.getenv("LINKEDIN_REDIRECT_URI", "http://localhost:8000/api/linkedin/callback")
    return client_id, client_secret, redirect_uri


def _load_token() -> dict | None:
    if not os.path.exists(TOKEN_PATH):
        return None
    try:
        with open(TOKEN_PATH) as f:
            return json.load(f)
    except Exception:
        return None


def _save_token(token_data: dict):
    os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)
    with open(TOKEN_PATH, "w") as f:
        json.dump(token_data, f, indent=2)


# ─── ENDPOINTS ────────────────────────────────────────────────

@router.get("/linkedin/login")
async def linkedin_auth_init():
    """Inicia fluxo OAuth2 do LinkedIn."""
    client_id, client_secret, redirect_uri = _get_credentials()

    if not client_id or not client_secret:
        raise HTTPException(
            status_code=400,
            detail="LinkedIn OAuth não configurado. Adicione LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET ao backend/.env"
        )

    state = secrets.token_urlsafe(32)
    _pending_states[state] = True

    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "state": state,
        "scope": " ".join(SCOPES),
    }

    query_string = "&".join(f"{k}={v}" for k, v in params.items())
    auth_url = f"{LINKEDIN_AUTH_URL}?{query_string}"

    return {"auth_url": auth_url}


@router.get("/linkedin/callback")
async def linkedin_auth_callback(code: str, state: str = None, error: str = None):
    """Recebe o código do LinkedIn e salva o token."""
    if error:
        raise HTTPException(status_code=400, detail=f"LinkedIn OAuth negado: {error}")

    if state and state not in _pending_states:
        raise HTTPException(status_code=400, detail="State inválido — possível CSRF")

    if state:
        _pending_states.pop(state, None)

    client_id, client_secret, redirect_uri = _get_credentials()

    # Trocar code por access_token
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Erro ao trocar código: {resp.text}")

    token_data = resp.json()
    token_data["obtained_at"] = datetime.now(timezone.utc).isoformat()
    _save_token(token_data)

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/configuracoes?linkedin=conectado")


@router.get("/linkedin/status")
async def linkedin_status():
    """Verifica se o LinkedIn está conectado e retorna dados básicos do perfil."""
    token = _load_token()
    if not token:
        return {"isConnected": False}

    access_token = token.get("access_token")
    if not access_token:
        return {"isConnected": False}

    # Busca dados básicos do perfil via OpenID userinfo
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                LINKEDIN_USERINFO_URL,
                headers={"Authorization": f"Bearer {access_token}"}
            )

        if resp.status_code == 200:
            profile = resp.json()
            return {
                "isConnected": True,
                "nome": profile.get("name", ""),
                "email": profile.get("email", ""),
                "foto": profile.get("picture", ""),
                "sub": profile.get("sub", ""),
            }
        else:
            # Token pode ter expirado
            return {"isConnected": False, "error": "Token expirado ou inválido"}

    except Exception as e:
        return {"isConnected": False, "error": str(e)}


@router.get("/linkedin/profile")
async def linkedin_profile():
    """Retorna dados completos do perfil LinkedIn conectado."""
    token = _load_token()
    if not token:
        raise HTTPException(status_code=401, detail="LinkedIn não conectado")

    access_token = token.get("access_token")

    async with httpx.AsyncClient() as client:
        # OpenID userinfo (nome, email, foto, sub)
        userinfo_resp = await client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token LinkedIn inválido ou expirado")

    return userinfo_resp.json()


@router.post("/linkedin/share")
async def linkedin_share(payload: dict):
    """
    Publica um post no LinkedIn.
    Body: { "text": "conteúdo do post" }
    Requer scope w_member_social.
    """
    token = _load_token()
    if not token:
        raise HTTPException(status_code=401, detail="LinkedIn não conectado")

    access_token = token.get("access_token")
    text = payload.get("text", "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="O campo 'text' é obrigatório")

    if len(text) > 3000:
        raise HTTPException(status_code=400, detail="Post muito longo (máx 3000 caracteres)")

    # Busca o sub (ID do membro) via userinfo
    async with httpx.AsyncClient() as client:
        userinfo = await client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"}
        )

    if userinfo.status_code != 200:
        raise HTTPException(status_code=401, detail="Token LinkedIn inválido")

    member_id = userinfo.json().get("sub")

    # UGC Posts API
    post_body = {
        "author": f"urn:li:person:{member_id}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE"
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{LINKEDIN_API_BASE}/ugcPosts",
            json=post_body,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "X-Restli-Protocol-Version": "2.0.0"
            }
        )

    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=resp.status_code, detail=f"Erro ao publicar: {resp.text}")

    return {"success": True, "post_id": resp.headers.get("x-restli-id", ""), "message": "Post publicado com sucesso!"}


@router.delete("/linkedin/disconnect")
async def linkedin_disconnect():
    """Remove o token do LinkedIn."""
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            return {"message": "LinkedIn desconectado com sucesso!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao remover token: {str(e)}")
    return {"message": "LinkedIn já estava desconectado."}
