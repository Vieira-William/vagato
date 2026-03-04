from fastapi import APIRouter, Request, HTTPException, Depends, Query
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import json
from dotenv import load_dotenv

# Carrega .env com caminho absoluto (independente do CWD ao iniciar o servidor)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

router = APIRouter(tags=["Calendar"])

SCOPES = ['https://www.googleapis.com/auth/calendar']

# Caminho temporário para armazenar o token (Em PRD usaríamos DB/Criptografia)
_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = str(_BASE_DIR / "data" / "google_token.json")

# Cache em memória para preservar o flow entre login e callback (necessário para PKCE)
_pending_flows: dict = {}

def _make_client_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    return client_id, client_secret, redirect_uri, {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

@router.get("/calendar/login")
async def google_auth_init():
    """Inicia o fluxo OAuth2 do Google."""
    client_id, client_secret, redirect_uri, client_config = _make_client_config()

    PLACEHOLDERS = {"SEU_CLIENT_ID_AQUI", "SEU_CLIENT_SECRET_AQUI", ""}
    if not client_id or not client_secret or not redirect_uri or \
       client_id in PLACEHOLDERS or client_secret in PLACEHOLDERS:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar não configurado. Acesse console.cloud.google.com, crie um OAuth 2.0 Client ID e adicione as credenciais reais ao backend/.env"
        )

    flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
    flow.redirect_uri = redirect_uri

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent'
    )

    # Preserva o flow original (contém code_verifier do PKCE gerado pela lib)
    _pending_flows[state] = flow

    return {"auth_url": authorization_url}

@router.get("/calendar/callback")
async def google_auth_callback(code: str, state: str = None):
    """Recebe o código do Google e salva o token."""
    # Recupera o flow original (com PKCE code_verifier preservado)
    flow = _pending_flows.pop(state, None)

    if flow is None:
        # Fallback sem PKCE — pode falhar se a lib gerou code_challenge
        _, _, redirect_uri, client_config = _make_client_config()
        flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
        flow.redirect_uri = redirect_uri

    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao trocar código OAuth: {str(e)}")

    credentials = flow.credentials

    # Garante que o diretório data/ existe
    os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)

    with open(TOKEN_PATH, 'w') as token_file:
        token_file.write(credentials.to_json())

    # Redireciona para o frontend após autenticação bem-sucedida
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=frontend_url)

@router.get("/calendar/events")
async def get_calendar_events(
    time_min: Optional[str] = Query(None, description="ISO datetime inicio"),
    time_max: Optional[str] = Query(None, description="ISO datetime fim"),
):
    """Busca eventos da agenda para o range especificado (default: semana atual + 10 dias)."""
    if not os.path.exists(TOKEN_PATH):
        return {"isConnected": False, "events": []}

    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        service = build('calendar', 'v3', credentials=creds)

        now = datetime.utcnow()

        if not time_min:
            monday = now - timedelta(days=now.weekday())
            time_min = monday.replace(hour=0, minute=0, second=0, microsecond=0).isoformat() + 'Z'

        if not time_max:
            monday = now - timedelta(days=now.weekday())
            end = monday + timedelta(days=10)
            time_max = end.replace(hour=23, minute=59, second=59, microsecond=0).isoformat() + 'Z'

        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            timeMax=time_max,
            maxResults=50,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])

        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            end = event['end'].get('dateTime', event['end'].get('date'))
            formatted_events.append({
                "id": event.get('id'),
                "title": event.get('summary', 'Sem Título'),
                "desc": event.get('description', ''),
                "start": start,
                "end": end,
                "hangoutLink": event.get('hangoutLink'),
                "htmlLink": event.get('htmlLink'),
                "colorId": event.get('colorId'),
                "location": event.get('location'),
            })

        return {"isConnected": True, "events": formatted_events}
    except Exception as e:
        return {"isConnected": False, "error": str(e), "events": []}

@router.delete("/calendar/disconnect")
async def google_calendar_disconnect():
    """Remove o token da agenda Google."""
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            return {"message": "Agenda Google desconectada com sucesso!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao remover token: {str(e)}")
    return {"message": "Agenda já está desconectada."}
