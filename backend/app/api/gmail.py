from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import os
import base64
import re
from pathlib import Path
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
from email.utils import parseaddr
from datetime import datetime, timezone

# Carrega .env com caminho absoluto
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

router = APIRouter(tags=["Gmail"])

# Escopo readonly — suficiente para leitura total de emails
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = str(_BASE_DIR / "data" / "google_gmail_token.json")

# Cache em memória para o flow OAuth entre login e callback
_pending_flows: dict = {}


def _make_client_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_GMAIL_REDIRECT_URI")
    return client_id, client_secret, redirect_uri, {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }


def _parse_email_message(msg: dict) -> dict:
    """Extrai os campos principais de uma mensagem bruta da Gmail API."""
    payload = msg.get("payload", {})
    headers = payload.get("headers", [])

    def get_header(name: str) -> str:
        return next((h["value"] for h in headers if h["name"].lower() == name.lower()), "")

    sender_raw = get_header("From")
    sender_name, sender_email = parseaddr(sender_raw)

    # Extrai corpo de texto (text/plain)
    body = ""
    def extract_body(part):
        nonlocal body
        if part.get("mimeType") == "text/plain" and "data" in part.get("body", {}):
            try:
                body = base64.urlsafe_b64decode(part["body"]["data"]).decode("utf-8", errors="replace")
            except Exception:
                pass
        for sub in part.get("parts", []):
            extract_body(sub)

    extract_body(payload)

    # Converte internalDate (ms desde epoch) para ISO
    internal_date = msg.get("internalDate", "0")
    try:
        dt = datetime.fromtimestamp(int(internal_date) / 1000, tz=timezone.utc)
        data_iso = dt.isoformat()
    except Exception:
        data_iso = ""

    return {
        "id": msg.get("id"),
        "thread_id": msg.get("threadId"),
        "remetente_nome": sender_name or sender_email,
        "remetente_email": sender_email,
        "assunto": get_header("Subject") or "(Sem assunto)",
        "data": data_iso,
        "snippet": msg.get("snippet", ""),
        "corpo": body[:2000] if body else "",  # Limita a 2000 chars
        "labels": msg.get("labelIds", []),
    }


# ─────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────

@router.get("/gmail/login")
async def gmail_auth_init():
    """Inicia o fluxo OAuth2 para acesso ao Gmail."""
    client_id, client_secret, redirect_uri, client_config = _make_client_config()

    PLACEHOLDERS = {"SEU_CLIENT_ID_AQUI", "SEU_CLIENT_SECRET_AQUI", ""}
    if not client_id or not client_secret or not redirect_uri or \
       client_id in PLACEHOLDERS or client_secret in PLACEHOLDERS:
        raise HTTPException(
            status_code=400,
            detail="Gmail OAuth não configurado. Adicione GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_GMAIL_REDIRECT_URI ao backend/.env"
        )

    flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
    flow.redirect_uri = redirect_uri

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    _pending_flows[state] = flow
    return {"auth_url": authorization_url}


@router.get("/gmail/callback")
async def gmail_auth_callback(code: str, state: str = None):
    """Recebe o código do Google e salva o token do Gmail."""
    flow = _pending_flows.pop(state, None)

    if flow is None:
        _, _, redirect_uri, client_config = _make_client_config()
        flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
        flow.redirect_uri = redirect_uri

    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao trocar código OAuth Gmail: {str(e)}")

    credentials = flow.credentials
    os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)

    with open(TOKEN_PATH, 'w') as f:
        f.write(credentials.to_json())

    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/configuracoes?gmail=conectado")


@router.get("/gmail/status")
async def gmail_status():
    """Verifica se o Gmail está conectado."""
    return {"isConnected": os.path.exists(TOKEN_PATH)}


@router.get("/gmail/emails")
async def gmail_buscar_emails(
    empresa: str = None,
    q: str = None,
    max_results: int = 20
):
    """
    Busca emails do Gmail.
    - empresa: filtra emails que mencionam o nome da empresa
    - q: query livre no formato Gmail (ex: 'from:rh@empresa.com is:unread')
    - max_results: máximo de emails retornados (padrão 20, máx 50)
    """
    if not os.path.exists(TOKEN_PATH):
        return {"isConnected": False, "emails": []}

    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        service = build('gmail', 'v1', credentials=creds)

        # Monta a query de busca
        if q:
            query = q
        elif empresa:
            # Remove caracteres especiais e busca empresa no assunto/corpo
            empresa_limpa = re.sub(r'[^\w\s]', '', empresa).strip()
            query = f'"{empresa_limpa}" OR from:{empresa_limpa}'
        else:
            # Sem filtro: emails recentes da caixa de entrada
            query = "in:inbox"

        max_results = min(max_results, 50)  # Limite de segurança

        # Listar IDs de mensagens
        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=max_results
        ).execute()

        messages_meta = results.get('messages', [])

        if not messages_meta:
            return {"isConnected": True, "emails": [], "total": 0, "query": query}

        # Buscar detalhes de cada mensagem
        emails = []
        for meta in messages_meta:
            try:
                msg = service.users().messages().get(
                    userId='me',
                    id=meta['id'],
                    format='full'
                ).execute()
                emails.append(_parse_email_message(msg))
            except Exception:
                continue

        return {
            "isConnected": True,
            "emails": emails,
            "total": len(emails),
            "query": query
        }

    except Exception as e:
        return {"isConnected": False, "error": str(e), "emails": []}


@router.get("/gmail/emails/vaga/{vaga_empresa}")
async def gmail_emails_da_vaga(vaga_empresa: str, max_results: int = 10):
    """
    Busca emails relacionados a uma empresa específica de vaga.
    Retorna os emails mais recentes que mencionam essa empresa.
    """
    if not os.path.exists(TOKEN_PATH):
        return {"isConnected": False, "emails": []}

    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        service = build('gmail', 'v1', credentials=creds)

        empresa_limpa = re.sub(r'[^\w\s]', '', vaga_empresa).strip()
        query = f'"{empresa_limpa}"'

        results = service.users().messages().list(
            userId='me',
            q=query,
            maxResults=min(max_results, 15)
        ).execute()

        messages_meta = results.get('messages', [])
        if not messages_meta:
            return {"isConnected": True, "emails": [], "total": 0}

        emails = []
        for meta in messages_meta:
            try:
                msg = service.users().messages().get(
                    userId='me',
                    id=meta['id'],
                    format='full'
                ).execute()
                emails.append(_parse_email_message(msg))
            except Exception:
                continue

        return {"isConnected": True, "emails": emails, "total": len(emails)}

    except Exception as e:
        return {"isConnected": False, "error": str(e), "emails": []}


@router.delete("/gmail/disconnect")
async def gmail_disconnect():
    """Remove o token do Gmail."""
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            return {"message": "Gmail desconectado com sucesso!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao remover token: {str(e)}")
    return {"message": "Gmail já estava desconectado."}
