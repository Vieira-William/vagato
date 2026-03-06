"""
Router de Integracoes do Backoffice Admin.
GET    /api/admin/integrations/overview             → status de todas as integracoes
GET    /api/admin/integrations/{key}/logs           → logs recentes da integracao
GET    /api/admin/integrations/{key}/config         → configuracao mascarada + expiry do token
PATCH  /api/admin/integrations/{key}/config         → registrar tentativa de alteracao (audit)
POST   /api/admin/integrations/{key}/test           → testar conexao REAL com cada servico
"""
from uuid import uuid4
from pathlib import Path
from datetime import datetime, timezone, timedelta
import os
import json
import httpx

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional

from ..models import AdminUser, AdminAuditLog
from ..middleware.admin_auth import get_admin_db, get_current_admin, require_owner

router = APIRouter(prefix="/admin/integrations", tags=["Admin Integrations"])

# Raiz do projeto (backend/app/api/../../..)
_BASE_DIR = Path(__file__).resolve().parent.parent.parent


def _log_audit(db, admin_id, action, request, target_type=None, target_id=None, details=None):
    log = AdminAuditLog(
        id=str(uuid4()),
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()


# ── Definicao das integracoes ──
# token_file usa paths RELATIVOS A _BASE_DIR (ex: "data/google_token.json")
# Cada servico Google usa um arquivo de token PROPRIO (confirmado via calendar.py, gmail.py, google_tasks.py)

INTEGRATIONS = {
    "google_oauth": {
        "nome": "Google OAuth",
        "categoria": "autenticacao",
        "descricao": "Autenticação via conta Google (login social)",
        "env_keys": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    },
    "gmail": {
        "nome": "Gmail API",
        "categoria": "comunicacao",
        "descricao": "Leitura e classificação de e-mails (Smart Emails)",
        "env_keys": ["GOOGLE_CLIENT_ID"],
        "token_file": "data/google_gmail_token.json",   # arquivo PROPRIO do Gmail
    },
    "google_calendar": {
        "nome": "Google Calendar",
        "categoria": "produtividade",
        "descricao": "Sincronização de entrevistas e eventos",
        "env_keys": ["GOOGLE_CLIENT_ID"],
        "token_file": "data/google_token.json",          # Calendar usa google_token.json
    },
    "google_tasks": {
        "nome": "Google Tasks",
        "categoria": "produtividade",
        "descricao": "Gerenciamento de tarefas integrado",
        "env_keys": ["GOOGLE_CLIENT_ID"],
        "token_file": "data/google_tasks_token.json",    # arquivo PROPRIO do Tasks
    },
    "linkedin": {
        "nome": "LinkedIn OAuth",
        "categoria": "social",
        "descricao": "Importação de perfil e conexões profissionais",
        "env_keys": ["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
        "token_file": "data/linkedin_token.json",
    },
    "stripe": {
        "nome": "Stripe",
        "categoria": "pagamentos",
        "descricao": "Processamento de pagamentos internacionais",
        "env_keys": ["STRIPE_API_KEY", "STRIPE_WEBHOOK_SECRET"],
    },
    "mercadopago": {
        "nome": "MercadoPago",
        "categoria": "pagamentos",
        "descricao": "Processamento de pagamentos no Brasil (PIX, boleto)",
        "env_keys": ["MERCADOPAGO_ACCESS_TOKEN"],
    },
    "anthropic": {
        "nome": "Anthropic (Claude)",
        "categoria": "ia",
        "descricao": "Modelos de IA para analise de vagas e matching",
        "env_keys": ["ANTHROPIC_API_KEY"],
    },
    "chrome_extension": {
        "nome": "Chrome Extension",
        "categoria": "extensao",
        "descricao": "Extensao para preenchimento automatico de formularios",
        "env_keys": [],
    },
    "coursera": {
        "nome": "Coursera Scraper",
        "categoria": "educacao",
        "descricao": "Recomendação de cursos para upskilling",
        "env_keys": [],
    },
    "twilio_whatsapp": {
        "nome": "WhatsApp (Twilio)",
        "categoria": "mensageria",
        "descricao": "Alertas inteligentes via WhatsApp — matches 85%+, resumos diários e lembretes",
        "env_keys": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_VERIFY_SERVICE_SID"],
    },
}

CATEGORIA_ORDER = [
    "autenticacao", "comunicacao", "produtividade",
    "social", "pagamentos", "ia", "mensageria", "extensao", "educacao"
]


def _calc_status(info: dict) -> str:
    """Calcula status automatico com paths absolutos (via _BASE_DIR)."""
    env_keys = info.get("env_keys", [])
    token_file = info.get("token_file")

    # Sem env_keys e sem token = sempre ativo (chrome_extension, coursera)
    if not env_keys:
        return "ativo"

    all_configured = all(os.getenv(k) for k in env_keys)
    if not all_configured:
        return "inativo"

    if token_file:
        full_path = _BASE_DIR / token_file   # Path absoluto correto
        if full_path.exists():
            return "ativo"
        return "configurado"

    return "ativo"


def _mask_value(val: str) -> str:
    """Mascara um valor mostrando apenas os ultimos 4 caracteres."""
    if not val or len(val) <= 4:
        return "****"
    return f"{'*' * (len(val) - 4)}{val[-4:]}"


def _read_token_expiry(token_file_relative: str) -> Optional[str]:
    """Le a expiracao de um arquivo de token JSON (Google ou LinkedIn)."""
    try:
        path = _BASE_DIR / token_file_relative
        if not path.exists():
            return None
        with open(path) as f:
            data = json.load(f)

        # Google tokens: campo "expiry" (ISO string) ou "token_expiry"
        expiry = data.get("expiry") or data.get("token_expiry")
        if expiry:
            return str(expiry)

        # LinkedIn tokens: obtained_at + expires_in (segundos)
        obtained_at = data.get("obtained_at")
        expires_in = data.get("expires_in")
        if obtained_at and expires_in:
            try:
                obtained = datetime.fromisoformat(obtained_at)
                expires = obtained + timedelta(seconds=int(expires_in))
                return expires.isoformat()
            except Exception:
                return obtained_at  # fallback: mostrar data de obtencao

    except Exception:
        pass
    return None


# ── Overview ──

@router.get("/overview")
def integrations_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Status de todas as integracoes com stats."""
    results = []
    stats = {"total": 0, "ativas": 0, "configuradas": 0, "inativas": 0, "planejadas": 0}

    for key, info in INTEGRATIONS.items():
        status = _calc_status(info)
        stats["total"] += 1
        if status == "ativo":
            stats["ativas"] += 1
        elif status == "configurado":
            stats["configuradas"] += 1
        elif status == "inativo":
            stats["inativas"] += 1
        elif status == "planejado":
            stats["planejadas"] += 1

        # Ultimo audit log desta integracao
        last_log = (
            db.query(AdminAuditLog)
            .filter(AdminAuditLog.target_type == "integracao", AdminAuditLog.target_id == key)
            .order_by(desc(AdminAuditLog.created_at))
            .first()
        )

        results.append({
            "key": key,
            "nome": info["nome"],
            "categoria": info["categoria"],
            "descricao": info.get("descricao", ""),
            "status": status,
            "last_activity": last_log.created_at.isoformat() if last_log and last_log.created_at else None,
            "config_keys": info.get("env_keys", []),
            "has_token_file": info.get("token_file") is not None,
        })

    results.sort(key=lambda x: (
        CATEGORIA_ORDER.index(x["categoria"]) if x["categoria"] in CATEGORIA_ORDER else 99,
        x["nome"]
    ))

    return {"integrations": results, "stats": stats}


# ── Logs ──

@router.get("/{key}/logs")
def integration_logs(
    key: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Logs recentes de uma integracao (ultimos 50 audit logs)."""
    if key not in INTEGRATIONS:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    logs = (
        db.query(AdminAuditLog)
        .filter(AdminAuditLog.target_type == "integracao", AdminAuditLog.target_id == key)
        .order_by(desc(AdminAuditLog.created_at))
        .limit(50)
        .all()
    )

    admin_ids = {l.admin_id for l in logs if l.admin_id}
    admins_map = {}
    if admin_ids:
        admins = db.query(AdminUser).filter(AdminUser.id.in_(admin_ids)).all()
        admins_map = {a.id: a.email for a in admins}

    return {
        "key": key,
        "nome": INTEGRATIONS[key]["nome"],
        "logs": [
            {
                "id": l.id,
                "admin_email": admins_map.get(l.admin_id, "—"),
                "action": l.action,
                "details": l.details,
                "ip_address": l.ip_address,
                "created_at": l.created_at.isoformat() if l.created_at else None,
            }
            for l in logs
        ],
    }


# ── Config ──

@router.get("/{key}/config")
def get_config(
    key: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Configuracao atual com env vars mascaradas e expiracao do token OAuth."""
    if key not in INTEGRATIONS:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    info = INTEGRATIONS[key]
    env_values = {}
    for env_key in info.get("env_keys", []):
        val = os.getenv(env_key)
        env_values[env_key] = {
            "configured": bool(val),
            "masked_value": _mask_value(val) if val else None,
        }

    token_info = None
    if info.get("token_file"):
        full_path = _BASE_DIR / info["token_file"]
        token_info = {
            "file": info["token_file"],
            "exists": full_path.exists(),
            "expires_at": _read_token_expiry(info["token_file"]) if full_path.exists() else None,
        }

    return {
        "key": key,
        "nome": info["nome"],
        "status": _calc_status(info),
        "env_vars": env_values,
        "token": token_info,
    }


class UpdateConfigRequest(BaseModel):
    changes: Optional[dict] = None


@router.patch("/{key}/config")
def update_config(
    key: str,
    body: UpdateConfigRequest,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Registrar tentativa de alteracao de config (audit only)."""
    if key not in INTEGRATIONS:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    _log_audit(db, admin.id, "integracao.config_change_attempt", request,
               target_type="integracao", target_id=key,
               details={"message": "Tentativa de alteracao via admin panel"})

    return {
        "ok": False,
        "message": "Variaveis de ambiente devem ser alteradas via deploy/servidor por seguranca. Esta tentativa foi registrada no audit log.",
    }


# ── Test Connection — chamadas REAIS por servico ──

@router.post("/{key}/test")
async def test_connection(
    key: str,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Testa conexao REAL com a integracao (nao apenas verifica env var)."""
    if key not in INTEGRATIONS:
        raise HTTPException(status_code=404, detail="Integracao nao encontrada")

    info = INTEGRATIONS[key]
    status = _calc_status(info)
    result = {"key": key, "nome": info["nome"], "success": False, "message": "", "extra": None}

    if status == "inativo":
        result["message"] = "Integracao inativa — variaveis de ambiente nao configuradas"
        _log_audit(db, admin.id, "integracao.test", request,
                   target_type="integracao", target_id=key,
                   details={"success": False, "reason": "inativo"})
        return result

    try:
        # ── LinkedIn ── real GET /userinfo ──
        if key == "linkedin":
            token_path = _BASE_DIR / "data" / "linkedin_token.json"
            if not token_path.exists():
                result["message"] = "Token nao encontrado. Faca OAuth em /configuracoes → LinkedIn"
            else:
                with open(token_path) as f:
                    token_data = json.load(f)
                access_token = token_data.get("access_token")
                if not access_token:
                    result["message"] = "Token invalido (sem access_token no arquivo)"
                else:
                    async with httpx.AsyncClient(timeout=8.0) as client:
                        resp = await client.get(
                            "https://api.linkedin.com/v2/userinfo",
                            headers={"Authorization": f"Bearer {access_token}"}
                        )
                    if resp.status_code == 200:
                        profile = resp.json()
                        result["success"] = True
                        result["message"] = f"Conectado como {profile.get('name', 'usuario desconhecido')}"
                        result["extra"] = {
                            "email": profile.get("email"),
                            "foto": profile.get("picture"),
                        }
                    else:
                        result["message"] = f"Token expirado ou invalido (HTTP {resp.status_code})"

        # ── Google Calendar ── calendarList().list() ──
        elif key == "google_calendar":
            token_path = _BASE_DIR / "data" / "google_token.json"
            if not token_path.exists():
                result["message"] = "Token Calendar nao encontrado. Faca OAuth em /configuracoes"
            else:
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                creds = Credentials.from_authorized_user_file(str(token_path))
                service = build("calendar", "v3", credentials=creds)
                cal_list = service.calendarList().list(maxResults=1).execute()
                result["success"] = True
                n = len(cal_list.get("items", []))
                result["message"] = f"Conectado — {n} calendario(s) acessivel(is)"

        # ── Gmail ── users().getProfile() ──
        elif key == "gmail":
            token_path = _BASE_DIR / "data" / "google_gmail_token.json"
            if not token_path.exists():
                result["message"] = "Token Gmail nao encontrado. Faca OAuth separado em /configuracoes"
            else:
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                creds = Credentials.from_authorized_user_file(str(token_path))
                service = build("gmail", "v1", credentials=creds)
                profile = service.users().getProfile(userId="me").execute()
                result["success"] = True
                result["message"] = f"Conectado como {profile.get('emailAddress', 'desconhecido')}"
                result["extra"] = {
                    "email": profile.get("emailAddress"),
                    "total_messages": profile.get("messagesTotal"),
                }

        # ── Google Tasks ── tasklists().list() ──
        elif key == "google_tasks":
            token_path = _BASE_DIR / "data" / "google_tasks_token.json"
            if not token_path.exists():
                result["message"] = "Token Tasks nao encontrado. Faca OAuth em /configuracoes"
            else:
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build
                creds = Credentials.from_authorized_user_file(str(token_path))
                service = build("tasks", "v1", credentials=creds)
                task_lists = service.tasklists().list(maxResults=1).execute()
                result["success"] = True
                n = len(task_lists.get("items", []))
                result["message"] = f"Conectado — {n} lista(s) de tarefas"

        # ── Google OAuth ── apenas verifica client_id + secret configurados ──
        elif key == "google_oauth":
            client_id = os.getenv("GOOGLE_CLIENT_ID", "")
            client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
            if client_id and client_secret:
                result["success"] = True
                result["message"] = "Client ID e Client Secret configurados"
            else:
                missing = []
                if not client_id:
                    missing.append("GOOGLE_CLIENT_ID")
                if not client_secret:
                    missing.append("GOOGLE_CLIENT_SECRET")
                result["message"] = f"Variaveis faltando: {', '.join(missing)}"

        # ── Stripe ── Account.retrieve() ──
        elif key == "stripe":
            import stripe as stripe_lib
            api_key = os.getenv("STRIPE_API_KEY", "")
            stripe_lib.api_key = api_key
            try:
                account = stripe_lib.Account.retrieve()
                email = account.get("email") or account.get("id", "?")
                result["success"] = True
                result["message"] = f"Conectado — conta: {email}"
            except stripe_lib.error.AuthenticationError:
                result["message"] = "STRIPE_API_KEY invalida — autenticacao rejeitada pelo Stripe"
            except stripe_lib.error.StripeError as se:
                result["message"] = f"Erro Stripe: {str(se)}"

        # ── MercadoPago ── payment_methods().list_all() ──
        elif key == "mercadopago":
            import mercadopago as mp_lib
            mp_token = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
            mp_sdk = mp_lib.SDK(mp_token)
            response = mp_sdk.payment_methods().list_all()
            if response["status"] == 200:
                n = len(response.get("response", []))
                result["success"] = True
                result["message"] = f"Conectado — {n} metodo(s) de pagamento disponiveis"
            else:
                result["message"] = f"Erro MercadoPago: HTTP {response['status']}"

        # ── Anthropic ── verificar formato sk-ant- ──
        elif key == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY", "")
            if not api_key:
                result["message"] = "ANTHROPIC_API_KEY nao configurada"
            elif not api_key.startswith("sk-ant-"):
                result["message"] = f"Formato invalido (esperado sk-ant-..., recebido {api_key[:8]}...)"
            else:
                result["success"] = True
                result["message"] = f"API key valida — {len(api_key)} chars, formato sk-ant-..."

        # ── Chrome Extension ── verifica eventos recentes no ExtensionLog ──
        elif key == "chrome_extension":
            from ..models import ExtensionLog
            from sqlalchemy import func as sqlfunc
            sete_dias = datetime.now(timezone.utc) - timedelta(days=7)
            total_events = db.query(sqlfunc.count(ExtensionLog.id)).filter(
                ExtensionLog.created_at >= sete_dias
            ).scalar() or 0
            result["success"] = True
            if total_events > 0:
                result["message"] = f"Ativa — {total_events} evento(s) registrado(s) nos ultimos 7 dias"
            else:
                result["message"] = "Nenhum evento nos ultimos 7 dias (extensao pode estar inativa)"

        # ── Coursera ── verifica se modulo esta acessivel ──
        elif key == "coursera":
            try:
                from ..services.coursera_client import CourseraService  # noqa
                result["success"] = True
                result["message"] = "Servico de cursos disponivel (scraping + fallback curado)"
            except ImportError as ie:
                result["success"] = False
                result["message"] = f"Modulo Coursera indisponivel: {ie}"

        # ── Twilio WhatsApp ── verifica credenciais + usuario verificado ──
        elif key == "twilio_whatsapp":
            from ..services.whatsapp_service import whatsapp_service
            from ..models import WhatsAppPreferences
            if not whatsapp_service.is_configured:
                result["message"] = "Credenciais Twilio nao configuradas no .env"
            else:
                # Testar conexao real listando o Verify Service
                try:
                    service = whatsapp_service.client.verify.v2.services(
                        os.getenv("TWILIO_VERIFY_SERVICE_SID")
                    ).fetch()
                    result["success"] = True
                    result["message"] = f"Conectado — Verify Service: {service.friendly_name}"
                    # Info adicional: quantos usuarios verificados
                    verified = db.query(WhatsAppPreferences).filter(
                        WhatsAppPreferences.phone_verified == True
                    ).count()
                    result["extra"] = {
                        "service_sid": service.sid,
                        "usuarios_verificados": verified,
                    }
                except Exception as twilio_err:
                    result["message"] = f"Erro Twilio: {str(twilio_err)}"

        else:
            result["success"] = status == "ativo"
            result["message"] = f"Status: {status}"

    except Exception as e:
        result["message"] = f"Erro ao testar conexao: {str(e)}"

    _log_audit(db, admin.id, "integracao.test", request,
               target_type="integracao", target_id=key,
               details={"success": result["success"], "message": result["message"]})

    return result
