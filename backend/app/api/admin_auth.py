"""
Router de autenticação do Backoffice Admin.
POST /api/admin/auth/login     → email + password → JWT
POST /api/admin/auth/verify-2fa → temp_token + code → confirmed JWT
POST /api/admin/auth/logout    → client-side (limpar token)
GET  /api/admin/auth/me        → admin logado
"""
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..models import AdminUser, AdminAuditLog
from ..middleware.admin_auth import (
    get_admin_db, hash_password, verify_password,
    create_admin_token, decode_admin_token,
    verify_totp, check_rate_limit, record_login_attempt, clear_login_attempts,
    get_current_admin,
)

router = APIRouter(prefix="/admin/auth", tags=["Admin Auth"])


# ── Schemas ─────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class Verify2FARequest(BaseModel):
    temp_token: str
    code: str


# ── Helpers ─────────────────────────────────────────────────────────────────

def _log_audit(db: Session, admin_id: str, action: str, request: Request, details: dict = None):
    """Registra ação no audit log."""
    log = AdminAuditLog(
        id=str(uuid4()),
        admin_id=admin_id,
        action=action,
        details=details,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    db.commit()


# ── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/login")
def admin_login(body: LoginRequest, request: Request, db: Session = Depends(get_admin_db)):
    """Login admin: email + password → JWT (ou requires_2fa)."""
    ip = request.client.host if request.client else "unknown"

    # Rate limiting
    check_rate_limit(ip)

    # Buscar admin
    admin = db.query(AdminUser).filter(
        AdminUser.email == body.email.lower().strip(),
        AdminUser.is_active == True,
    ).first()

    if not admin or not verify_password(body.password, admin.password_hash):
        record_login_attempt(ip)
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    # Se 2FA habilitado → retorna token temporário (sem 2fa_ok)
    if admin.totp_enabled and admin.totp_secret:
        temp_token = create_admin_token(admin.id, admin.role, confirmed_2fa=False)
        return {
            "requires_2fa": True,
            "temp_token": temp_token,
        }

    # Login direto (sem 2FA)
    clear_login_attempts(ip)
    token = create_admin_token(admin.id, admin.role, confirmed_2fa=True)

    # Atualizar último login
    admin.last_login = datetime.now(timezone.utc)
    db.commit()

    # Audit log
    _log_audit(db, admin.id, "admin.login", request)

    return {
        "token": token,
        "email": admin.email,
        "role": admin.role,
    }


@router.post("/verify-2fa")
def admin_verify_2fa(body: Verify2FARequest, request: Request, db: Session = Depends(get_admin_db)):
    """Verifica código TOTP e retorna token confirmado."""
    payload = decode_admin_token(body.temp_token)
    admin_id = payload.get("sub")

    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active == True).first()
    if not admin or not admin.totp_secret:
        raise HTTPException(status_code=401, detail="Admin não encontrado")

    if not verify_totp(admin.totp_secret, body.code):
        raise HTTPException(status_code=401, detail="Código 2FA inválido")

    # Gerar token confirmado
    ip = request.client.host if request.client else "unknown"
    clear_login_attempts(ip)
    token = create_admin_token(admin.id, admin.role, confirmed_2fa=True)

    admin.last_login = datetime.now(timezone.utc)
    db.commit()

    _log_audit(db, admin.id, "admin.login_2fa", request)

    return {
        "token": token,
        "email": admin.email,
        "role": admin.role,
    }


@router.get("/me")
def admin_me(admin: AdminUser = Depends(get_current_admin)):
    """Retorna dados do admin logado."""
    return {
        "id": admin.id,
        "email": admin.email,
        "role": admin.role,
        "totp_enabled": admin.totp_enabled,
        "last_login": admin.last_login.isoformat() if admin.last_login else None,
        "created_at": admin.created_at.isoformat() if admin.created_at else None,
    }


@router.post("/logout")
def admin_logout(request: Request, admin: AdminUser = Depends(get_current_admin), db: Session = Depends(get_admin_db)):
    """Logout — registra no audit log. Invalidação real é client-side."""
    _log_audit(db, admin.id, "admin.logout", request)
    return {"ok": True}
