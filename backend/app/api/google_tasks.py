from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
import os
import logging
from pathlib import Path
from typing import List, Optional
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from dotenv import load_dotenv
from datetime import datetime, timezone

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

os.environ.setdefault('OAUTHLIB_RELAX_TOKEN_SCOPE', '1')

logger = logging.getLogger(__name__)
router = APIRouter(tags=["GoogleTasks"])

SCOPES = ['https://www.googleapis.com/auth/tasks']

_BASE_DIR = Path(__file__).resolve().parent.parent.parent
TOKEN_PATH = str(_BASE_DIR / "data" / "google_tasks_token.json")

_pending_flows: dict = {}


def _make_client_config():
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_TASKS_REDIRECT_URI")
    return client_id, client_secret, redirect_uri, {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }


def _get_service():
    """Retorna o service do Google Tasks autenticado."""
    if not os.path.exists(TOKEN_PATH):
        return None
    try:
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
        return build('tasks', 'v1', credentials=creds)
    except Exception as e:
        logger.error(f"[GoogleTasks] Erro ao criar service: {e}")
        return None


# ─────────────────────────────────────────────────────────────
# OAUTH
# ─────────────────────────────────────────────────────────────

@router.get("/google-tasks/login")
async def google_tasks_auth_init():
    """Inicia o fluxo OAuth2 para Google Tasks."""
    client_id, client_secret, redirect_uri, client_config = _make_client_config()

    PLACEHOLDERS = {"SEU_CLIENT_ID_AQUI", "SEU_CLIENT_SECRET_AQUI", ""}
    if not client_id or not client_secret or not redirect_uri or \
       client_id in PLACEHOLDERS or client_secret in PLACEHOLDERS:
        raise HTTPException(
            status_code=400,
            detail="Google Tasks OAuth nao configurado. Adicione GOOGLE_TASKS_REDIRECT_URI ao backend/.env"
        )

    flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
    flow.redirect_uri = redirect_uri

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        prompt='consent'
    )

    _pending_flows[state] = flow
    return {"auth_url": authorization_url}


@router.get("/google-tasks/callback")
async def google_tasks_auth_callback(code: str, state: str = None):
    """Recebe o codigo do Google e salva o token do Tasks."""
    flow = _pending_flows.pop(state, None)

    if flow is None:
        _, _, redirect_uri, client_config = _make_client_config()
        flow = Flow.from_client_config(client_config, scopes=SCOPES, autogenerate_code_verifier=False)
        flow.redirect_uri = redirect_uri

    try:
        flow.fetch_token(code=code)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erro ao trocar codigo OAuth Tasks: {str(e)}")

    credentials = flow.credentials
    os.makedirs(os.path.dirname(TOKEN_PATH), exist_ok=True)

    with open(TOKEN_PATH, 'w') as f:
        f.write(credentials.to_json())

    logger.info("[GoogleTasks] Token salvo com sucesso")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return RedirectResponse(url=f"{frontend_url}/configuracoes?google_tasks=conectado")


@router.get("/google-tasks/status")
async def google_tasks_status():
    """Verifica se o Google Tasks esta conectado."""
    return {"isConnected": os.path.exists(TOKEN_PATH)}


@router.delete("/google-tasks/disconnect")
async def google_tasks_disconnect():
    """Remove o token do Google Tasks."""
    if os.path.exists(TOKEN_PATH):
        try:
            os.remove(TOKEN_PATH)
            return {"message": "Google Tasks desconectado com sucesso!"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro ao remover token: {str(e)}")
    return {"message": "Google Tasks ja estava desconectado."}


# ─────────────────────────────────────────────────────────────
# LISTAS E TAREFAS
# ─────────────────────────────────────────────────────────────

@router.get("/google-tasks/lists")
async def google_tasks_lists():
    """Lista todas as task lists do usuario."""
    service = _get_service()
    if not service:
        return {"isConnected": False, "lists": []}

    try:
        results = service.tasklists().list(maxResults=20).execute()
        items = results.get("items", [])
        logger.info(f"[GoogleTasks] {len(items)} listas encontradas")
        return {
            "isConnected": True,
            "lists": [{"id": tl["id"], "title": tl["title"]} for tl in items]
        }
    except Exception as e:
        logger.error(f"[GoogleTasks] Erro ao listar listas: {e}")
        return {"isConnected": False, "error": str(e), "lists": []}


@router.get("/google-tasks/tasks")
async def google_tasks_get_tasks(list_ids: str = Query(..., description="IDs das listas separados por virgula")):
    """Lista tarefas pendentes das listas selecionadas, ordenadas por due date."""
    service = _get_service()
    if not service:
        return {"isConnected": False, "tasks": []}

    ids = [lid.strip() for lid in list_ids.split(",") if lid.strip()]
    if not ids:
        return {"isConnected": True, "tasks": []}

    all_tasks = []
    now = datetime.now(timezone.utc)

    # Buscar listas para mapear id → title
    try:
        lists_result = service.tasklists().list(maxResults=20).execute()
        list_map = {tl["id"]: tl["title"] for tl in lists_result.get("items", [])}
    except Exception:
        list_map = {}

    for list_id in ids:
        try:
            results = service.tasks().list(
                tasklist=list_id,
                showCompleted=False,
                showHidden=False,
                maxResults=50
            ).execute()

            for task in results.get("items", []):
                if not task.get("title"):
                    continue

                due_raw = task.get("due")
                due_date = None
                overdue = False
                due_formatted = None

                if due_raw:
                    try:
                        due_date = datetime.fromisoformat(due_raw.replace("Z", "+00:00"))
                        overdue = due_date < now
                        due_formatted = due_date.strftime("%d/%m")
                    except Exception:
                        pass

                all_tasks.append({
                    "id": task["id"],
                    "title": task["title"],
                    "notes": task.get("notes", ""),
                    "due": due_raw,
                    "dueDate": due_formatted,
                    "overdue": overdue,
                    "list": list_map.get(list_id, ""),
                    "tasklist_id": list_id,
                    "status": task.get("status", "needsAction"),
                    "updated": task.get("updated", ""),
                })
        except Exception as e:
            logger.error(f"[GoogleTasks] Erro ao listar tarefas de {list_id}: {e}")

    # Ordenar: overdue primeiro, depois por due date (mais proxima primeiro), sem data por ultimo
    all_tasks.sort(key=lambda t: (
        not t["overdue"],
        t["due"] or "9999",
    ))

    logger.info(f"[GoogleTasks] {len(all_tasks)} tarefas pendentes de {len(ids)} lista(s)")
    return {"isConnected": True, "tasks": all_tasks[:20]}


@router.patch("/google-tasks/tasks/{task_id}/complete")
async def google_tasks_complete(task_id: str, tasklist_id: str = Query(...)):
    """Marca uma tarefa como concluida no Google Tasks."""
    service = _get_service()
    if not service:
        raise HTTPException(status_code=401, detail="Google Tasks nao conectado")

    try:
        service.tasks().patch(
            tasklist=tasklist_id,
            task=task_id,
            body={"status": "completed"}
        ).execute()
        logger.info(f"[GoogleTasks] Tarefa {task_id} marcada como concluida")
        return {"success": True}
    except Exception as e:
        logger.error(f"[GoogleTasks] Erro ao completar tarefa {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/google-tasks/tasks/{task_id}/uncomplete")
async def google_tasks_uncomplete(task_id: str, tasklist_id: str = Query(...)):
    """Reverte uma tarefa para pendente no Google Tasks."""
    service = _get_service()
    if not service:
        raise HTTPException(status_code=401, detail="Google Tasks nao conectado")

    try:
        service.tasks().patch(
            tasklist=tasklist_id,
            task=task_id,
            body={"status": "needsAction", "completed": None}
        ).execute()
        logger.info(f"[GoogleTasks] Tarefa {task_id} revertida para pendente")
        return {"success": True}
    except Exception as e:
        logger.error(f"[GoogleTasks] Erro ao reverter tarefa {task_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
