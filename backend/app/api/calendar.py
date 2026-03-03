from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse
import os
from pathlib import Path
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import json
from dotenv import load_dotenv

# Carrega .env com caminho absoluto (independente do CWD ao iniciar o servidor)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

router = APIRouter(tags=["Calendar"])

# ── CONFIGURAÇÃO GOOGLE CALENDAR (WILLIAM: Insira as variáveis no .env) ──
# GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
# GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/calendar/callback")

SCOPES = ['https://www.googleapis.com/auth/calendar']

# Caminho temporário para armazenar o token (Em PRD usaríamos DB/Criptografia)
TOKEN_PATH = "data/google_token.json"

@router.get("/calendar/login")
async def google_auth_init():
    """Inicia o fluxo OAuth2 do Google."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not client_secret or not redirect_uri:
        raise HTTPException(status_code=400, detail="Google Credentials incompletas no .env")

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }

    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = redirect_uri
    
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    
    return {"auth_url": authorization_url}

@router.get("/calendar/callback")
async def google_auth_callback(code: str, state: str = None):
    """Recebe o código do Google e salva o token."""
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    
    flow = Flow.from_client_config(client_config, scopes=SCOPES)
    flow.redirect_uri = redirect_uri
    flow.fetch_token(code=code)
    
    credentials = flow.credentials
    with open(TOKEN_PATH, 'w') as token_file:
        token_file.write(credentials.to_json())
    
    return {"message": "Autenticação concluída! Dados da agenda sincronizados."}

@router.get("/calendar/events")
async def get_calendar_events():
    """Busca os próximos 3 eventos da agenda."""
    if not os.path.exists(TOKEN_PATH):
        return {"isConnected": False, "events": []}
    
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        service = build('calendar', 'v3', credentials=creds)
        
        from datetime import datetime
        now = datetime.utcnow().isoformat() + 'Z'
        
        # Limitado a 3 eventos conforme AÇÃO 1.4 do EPIC
        events_result = service.events().list(
            calendarId='primary', timeMin=now,
            maxResults=3, singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        formatted_events = []
        for event in events:
            start = event['start'].get('dateTime', event['start'].get('date'))
            formatted_events.append({
                "title": event.get('summary', 'Sem Título'),
                "desc": event.get('description', 'Sem descrição'),
                "start": start
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
