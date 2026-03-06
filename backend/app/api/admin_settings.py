"""
Router de Configuracoes do Backoffice Admin.
GET    /api/admin/settings/admins              → lista admins (owner)
POST   /api/admin/settings/admins              → criar admin (owner)
PATCH  /api/admin/settings/admins/{id}         → editar admin (owner)
DELETE /api/admin/settings/admins/{id}         → soft delete admin (owner)
POST   /api/admin/settings/change-password     → alterar senha
POST   /api/admin/settings/2fa/setup           → gerar TOTP secret + QR URI
POST   /api/admin/settings/2fa/confirm         → validar codigo, ativar 2FA
POST   /api/admin/settings/2fa/disable         → desativar 2FA (requer senha)
"""
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ..models import AdminUser, AdminAuditLog
from ..middleware.admin_auth import (
    get_admin_db, get_current_admin, require_owner,
    hash_password, verify_password,
    generate_totp_secret, verify_totp, get_totp_uri,
)

router = APIRouter(prefix="/admin/settings", tags=["Admin Settings"])


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


def _admin_to_dict(a: AdminUser) -> dict:
    return {
        "id": a.id,
        "email": a.email,
        "role": a.role,
        "is_active": a.is_active,
        "totp_enabled": a.totp_enabled,
        "last_login": a.last_login.isoformat() if a.last_login else None,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


# ── Schemas ──

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    role: str = "admin"  # 'admin' | 'viewer'


class UpdateAdminRequest(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class Confirm2FARequest(BaseModel):
    code: str


class Disable2FARequest(BaseModel):
    password: str


# ── Admin CRUD (owner only) ──

@router.get("/admins")
def list_admins(
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Lista todos os admins (owner only)."""
    admins = db.query(AdminUser).order_by(AdminUser.created_at).all()
    return {"admins": [_admin_to_dict(a) for a in admins]}


@router.post("/admins")
def create_admin(
    body: CreateAdminRequest,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Criar novo admin (owner only)."""
    email_lower = body.email.strip().lower()

    existing = db.query(AdminUser).filter(AdminUser.email == email_lower).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Email '{email_lower}' ja existe")

    if body.role not in ("admin", "viewer"):
        raise HTTPException(status_code=400, detail="Role deve ser 'admin' ou 'viewer'")

    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Senha deve ter pelo menos 6 caracteres")

    new_admin = AdminUser(
        id=str(uuid4()),
        email=email_lower,
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(new_admin)
    db.commit()
    db.refresh(new_admin)

    _log_audit(db, admin.id, "admin.create", request,
               target_type="admin", target_id=new_admin.id,
               details={"email": email_lower, "role": body.role})

    return _admin_to_dict(new_admin)


@router.patch("/admins/{admin_id}")
def update_admin(
    admin_id: str,
    body: UpdateAdminRequest,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Editar role/status de admin (owner only)."""
    target = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Admin nao encontrado")

    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Nao pode editar a si mesmo")

    changes = {}
    if body.role is not None and body.role in ("admin", "viewer", "owner"):
        changes["role"] = {"old": target.role, "new": body.role}
        target.role = body.role

    if body.is_active is not None:
        changes["is_active"] = {"old": target.is_active, "new": body.is_active}
        target.is_active = body.is_active

    db.commit()
    db.refresh(target)

    _log_audit(db, admin.id, "admin.update", request,
               target_type="admin", target_id=admin_id,
               details=changes)

    return _admin_to_dict(target)


@router.delete("/admins/{admin_id}")
def delete_admin(
    admin_id: str,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Soft delete admin (owner only)."""
    target = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Admin nao encontrado")

    if target.id == admin.id:
        raise HTTPException(status_code=400, detail="Nao pode deletar a si mesmo")

    target.is_active = False
    db.commit()

    _log_audit(db, admin.id, "admin.delete", request,
               target_type="admin", target_id=admin_id,
               details={"email": target.email})

    return {"ok": True}


# ── Alterar Senha ──

@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Alterar senha do admin logado."""
    if not verify_password(body.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Nova senha deve ter pelo menos 6 caracteres")

    admin.password_hash = hash_password(body.new_password)
    db.commit()

    _log_audit(db, admin.id, "admin.change_password", request,
               target_type="admin", target_id=admin.id)

    return {"ok": True}


# ── 2FA (TOTP) ──

@router.post("/2fa/setup")
def setup_2fa(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Gerar TOTP secret e QR URI para setup."""
    secret = generate_totp_secret()

    # Salvar secret temporariamente (ainda nao ativado)
    admin.totp_secret = secret
    db.commit()

    uri = get_totp_uri(secret, admin.email)

    return {
        "secret": secret,
        "uri": uri,
    }


@router.post("/2fa/confirm")
def confirm_2fa(
    body: Confirm2FARequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Validar codigo TOTP e ativar 2FA."""
    if not admin.totp_secret:
        raise HTTPException(status_code=400, detail="Execute /2fa/setup primeiro")

    if not verify_totp(admin.totp_secret, body.code):
        raise HTTPException(status_code=400, detail="Codigo invalido")

    admin.totp_enabled = True
    db.commit()

    _log_audit(db, admin.id, "admin.2fa_enable", request,
               target_type="admin", target_id=admin.id)

    return {"ok": True, "totp_enabled": True}


@router.post("/2fa/disable")
def disable_2fa(
    body: Disable2FARequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Desativar 2FA (requer senha para confirmar)."""
    if not verify_password(body.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Senha incorreta")

    admin.totp_enabled = False
    admin.totp_secret = None
    db.commit()

    _log_audit(db, admin.id, "admin.2fa_disable", request,
               target_type="admin", target_id=admin.id)

    return {"ok": True, "totp_enabled": False}
