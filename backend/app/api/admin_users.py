"""
Router de Gestão de Usuários do Backoffice Admin.
GET  /api/admin/users             → lista paginada com filtros
GET  /api/admin/users/{user_id}   → detalhe completo + stats + transações
PATCH /api/admin/users/{user_id}/status → suspender/ativar conta
"""
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc, asc
from typing import Optional

from ..models import AdminUser, AdminAuditLog, UserProfile, TransacaoPagamento
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Users"])


# ── Helpers ─────────────────────────────────────────────────────────────────

def _log_audit(db: Session, admin_id: str, action: str, request: Request,
               target_type: str = None, target_id: str = None, details: dict = None):
    """Registra ação no audit log."""
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


def _user_to_dict(u: UserProfile, short: bool = True) -> dict:
    """Converte UserProfile para dict. short=True para lista, False para detalhe."""
    base = {
        "id": u.id,
        "nome": u.nome or "",
        "email": u.email or "",
        "plano_tipo": u.plano_tipo or "free",
        "is_premium": u.is_premium or False,
        "is_active": u.is_active if u.is_active is not None else True,
        "onboarding_completed": u.onboarding_completed or False,
        "created_at": u.created_at.isoformat() if u.created_at else None,
        "updated_at": u.updated_at.isoformat() if u.updated_at else None,
        "avatar_initial": (u.nome or "?")[0].upper(),
    }

    if short:
        return base

    # Detalhe completo
    base.update({
        "primeiro_nome": u.primeiro_nome,
        "ultimo_nome": u.ultimo_nome,
        "billing_period": u.billing_period or "mensal",
        "plano_expira_em": u.plano_expira_em.isoformat() if u.plano_expira_em else None,
        "skills": u.skills or [],
        "profissao": u.profissao,
        "nivel_minimo": u.nivel_minimo,
        "experiencia_anos": u.experiencia_anos,
        "cargos_interesse": u.cargos_interesse or [],
        "modalidades_aceitas": u.modalidades_aceitas or [],
        "tipos_contrato": u.tipos_contrato or [],
        "localizacoes": u.localizacoes or [],
        "nivel_ingles": u.nivel_ingles,
        "linkedin_url": u.linkedin_url,
        "portfolio_url": u.portfolio_url,
        "telefone": u.telefone,
        "onboarding_step": u.onboarding_step,
        "import_method": u.import_method,
        "cidade": u.cidade,
        "estado": u.estado,
        "pais": u.pais,
    })
    return base


# ── Schemas ─────────────────────────────────────────────────────────────────

class ToggleStatusRequest(BaseModel):
    is_active: bool


# ── Endpoints ───────────────────────────────────────────────────────────────

SORTABLE_FIELDS = {
    "created_at": UserProfile.created_at,
    "nome": UserProfile.nome,
    "email": UserProfile.email,
    "plano_tipo": UserProfile.plano_tipo,
}


@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None, max_length=200),
    plano: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_dir: str = Query("desc"),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista paginada de usuários com filtros."""
    q = db.query(UserProfile)

    # Filtro: busca por nome ou email
    if search:
        term = f"%{search.strip()}%"
        q = q.filter(or_(
            UserProfile.nome.ilike(term),
            UserProfile.email.ilike(term),
        ))

    # Filtro: plano
    if plano and plano in ("free", "pro", "ultimate"):
        q = q.filter(UserProfile.plano_tipo == plano)

    # Filtro: status (ativo/inativo)
    if status == "ativo":
        q = q.filter(UserProfile.is_active == True)
    elif status == "inativo":
        q = q.filter(UserProfile.is_active == False)

    # Filtro: período de criação
    if date_from:
        try:
            dt = datetime.fromisoformat(date_from)
            q = q.filter(UserProfile.created_at >= dt)
        except ValueError:
            pass
    if date_to:
        try:
            dt = datetime.fromisoformat(date_to)
            q = q.filter(UserProfile.created_at <= dt)
        except ValueError:
            pass

    # Contagem total
    total = q.count()

    # Ordenação
    sort_col = SORTABLE_FIELDS.get(sort_by, UserProfile.created_at)
    order_fn = desc if sort_dir == "desc" else asc
    q = q.order_by(order_fn(sort_col))

    # Paginação
    offset = (page - 1) * per_page
    users = q.offset(offset).limit(per_page).all()

    return {
        "users": [_user_to_dict(u, short=True) for u in users],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),  # ceil division
    }


@router.get("/users/{user_id}")
def get_user_detail(
    user_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Detalhe completo de um usuário + stats + transações."""
    user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Stats
    total_transacoes = db.query(func.count(TransacaoPagamento.id)).filter(
        TransacaoPagamento.user_email == user.email
    ).scalar() or 0

    gasto_total = db.query(func.sum(TransacaoPagamento.valor_brl)).filter(
        TransacaoPagamento.user_email == user.email,
        TransacaoPagamento.status == "approved",
    ).scalar() or 0.0

    # Últimas 20 transações
    transacoes = db.query(TransacaoPagamento).filter(
        TransacaoPagamento.user_email == user.email
    ).order_by(desc(TransacaoPagamento.criado_em)).limit(20).all()

    transacoes_list = [
        {
            "id": t.id,
            "gateway": t.gateway,
            "gateway_id": t.gateway_id,
            "status": t.status,
            "valor_brl": t.valor_brl,
            "valor_usd": t.valor_usd,
            "criado_em": t.criado_em.isoformat() if t.criado_em else None,
        }
        for t in transacoes
    ]

    return {
        "user": _user_to_dict(user, short=False),
        "stats": {
            "total_transacoes": total_transacoes,
            "gasto_total_brl": round(gasto_total, 2),
        },
        "transacoes": transacoes_list,
    }


@router.patch("/users/{user_id}/status")
def toggle_user_status(
    user_id: int,
    body: ToggleStatusRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Suspender ou ativar um usuário."""
    user = db.query(UserProfile).filter(UserProfile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    old_status = user.is_active
    user.is_active = body.is_active
    db.commit()

    action = "user.activate" if body.is_active else "user.suspend"
    _log_audit(
        db, admin.id, action, request,
        target_type="user",
        target_id=str(user_id),
        details={"email": user.email, "old_status": old_status, "new_status": body.is_active},
    )

    return {"ok": True, "is_active": body.is_active}
