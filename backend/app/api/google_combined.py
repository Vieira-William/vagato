"""
Google OAuth Combinado — Gmail + Calendar + Tasks em 1 clique

Solicita os 3 escopos em uma única autorização OAuth e salva o token
nos 3 arquivos que cada serviço já sabe ler independentemente.

Endpoints:
  GET /api/google/login     → URL de autorização com 3 escopos
  GET /api/google/callback  → Callback OAuth; salva token; redireciona ao frontend
  GET /api/google/status    → Verifica se todos os 3 tokens existem
"""

import json
import os
import logging
from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Paths dos tokens (mesmo que cada serviço já usa) ──
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
CALENDAR_TOKEN_PATH = _BASE_DIR / "data" / "google_token.json"
GMAIL_TOKEN_PATH    = _BASE_DIR / "data" / "google_gmail_token.json"
TASKS_TOKEN_PATH    = _BASE_DIR / "data" / "google_tasks_token.json"

# ── Escopos combinados ──
COMBINED_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
]

# ── Redirect URI ──
COMBINED_REDIRECT_URI = os.getenv(
    "GOOGLE_COMBINED_REDIRECT_URI",
    "http://localhost:8000/api/google/callback",
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ── Cache de flows pendentes (state → Flow) ──
_pending_flows: dict = {}


def _build_client_config() -> dict:
    """Monta configuração do cliente OAuth usando variáveis de ambiente."""
    return {
        "web": {
            "client_id": os.getenv("GOOGLE_CLIENT_ID", ""),
            "client_secret": os.getenv("GOOGLE_CLIENT_SECRET", ""),
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [COMBINED_REDIRECT_URI],
        }
    }


# ============================================================
# GET /api/google/login
# ============================================================
@router.get("/google/login")
async def google_combined_login():
    """
    Retorna a URL de autorização do Google com os 3 escopos combinados.
    O frontend abre essa URL em uma nova aba (window.open).
    """
    try:
        client_config = _build_client_config()
        flow = Flow.from_client_config(
            client_config,
            scopes=COMBINED_SCOPES,
            redirect_uri=COMBINED_REDIRECT_URI,
        )
        auth_url, state = flow.authorization_url(
            access_type="offline",
            prompt="consent",
            include_granted_scopes="false",
        )
        _pending_flows[state] = flow
        logger.info("Google Combined OAuth: URL gerada (state=%s)", state[:8])
        return {"auth_url": auth_url, "state": state}
    except Exception as e:
        logger.error("Erro ao gerar URL de autorização Google Combined: %s", e)
        return {"error": str(e)}, 500


# ============================================================
# GET /api/google/callback
# ============================================================
@router.get("/google/callback")
async def google_combined_callback(code: str, state: str):
    """
    Callback OAuth do Google. Recebe o code, troca por token e salva
    nos 3 arquivos que Calendar, Gmail e Tasks já sabem ler.
    Redireciona ao frontend com ?google_connected=true.
    """
    try:
        # Recuperar ou recriar flow
        flow = _pending_flows.pop(state, None)
        if not flow:
            logger.warning("Google Combined: state não encontrado em cache, recriando flow")
            client_config = _build_client_config()
            flow = Flow.from_client_config(
                client_config,
                scopes=COMBINED_SCOPES,
                redirect_uri=COMBINED_REDIRECT_URI,
            )

        # Trocar code por token
        flow.fetch_token(code=code)
        creds = flow.credentials

        token_data = {
            "token": creds.token,
            "refresh_token": creds.refresh_token,
            "token_uri": creds.token_uri,
            "client_id": creds.client_id,
            "client_secret": creds.client_secret,
            "scopes": list(creds.scopes) if creds.scopes else COMBINED_SCOPES,
        }

        # Salvar nos 3 arquivos (Calendar, Gmail, Tasks leem de caminhos distintos)
        for token_path in [CALENDAR_TOKEN_PATH, GMAIL_TOKEN_PATH, TASKS_TOKEN_PATH]:
            token_path.parent.mkdir(parents=True, exist_ok=True)
            token_path.write_text(json.dumps(token_data), encoding="utf-8")

        logger.info("Google Combined OAuth: token salvo nos 3 arquivos com sucesso")

    except Exception as e:
        logger.error("Erro no callback Google Combined: %s", e)
        redirect_url = f"{FRONTEND_URL}/onboarding?google_error=true"
        return RedirectResponse(url=redirect_url)

    redirect_url = f"{FRONTEND_URL}/onboarding?google_connected=true"
    return RedirectResponse(url=redirect_url)


# ============================================================
# GET /api/google/status
# ============================================================
@router.get("/google/status")
async def google_combined_status():
    """
    Verifica se os 3 tokens existem (Calendar + Gmail + Tasks).
    Retorna connected=True somente se todos os 3 estiverem presentes.
    """
    connected = all(
        p.exists() for p in [CALENDAR_TOKEN_PATH, GMAIL_TOKEN_PATH, TASKS_TOKEN_PATH]
    )
    return {"connected": connected}
