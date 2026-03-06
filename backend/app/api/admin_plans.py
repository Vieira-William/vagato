"""
Router de Gestão de Planos do Backoffice Admin.
GET   /api/admin/plans              → lista planos com preços + subscribers
PATCH /api/admin/plans/{key}/prices → alterar preços
"""
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import AdminUser, AdminAuditLog, UserProfile
from ..middleware.admin_auth import get_admin_db, get_current_admin, require_owner

router = APIRouter(prefix="/admin/plans", tags=["Admin Plans"])

# Preços atuais (MVP: constantes em memória, persistir em tabela no futuro)
PLANOS = {
    "pro": {
        "name": "Vagato Pro",
        "price_mensal": 29.0,
        "price_anual": 276.0,
        "features": [
            "Matching IA ilimitado",
            "Cold messages personalizadas",
            "Alertas em tempo real",
            "Suporte prioritário",
        ],
    },
    "ultimate": {
        "name": "Vagato Ultimate",
        "price_mensal": 59.0,
        "price_anual": 564.0,
        "features": [
            "Tudo do Pro",
            "Chrome Extension (auto-fill)",
            "Analytics avançado",
            "API de integração",
            "Consultoria carreira IA",
        ],
    },
}


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


class UpdatePricesRequest(BaseModel):
    mensal: float
    anual: float


@router.get("")
def list_plans(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista planos configurados com count de assinantes."""
    plans = []
    for key, info in PLANOS.items():
        subscribers = db.query(func.count(UserProfile.id)).filter(
            UserProfile.plano_tipo == key,
            UserProfile.is_premium == True,
        ).scalar() or 0

        plans.append({
            "key": key,
            "name": info["name"],
            "price_mensal": info["price_mensal"],
            "price_anual": info["price_anual"],
            "features": info["features"],
            "subscribers": subscribers,
        })

    # Free count
    free_count = db.query(func.count(UserProfile.id)).filter(
        UserProfile.plano_tipo == "free",
    ).scalar() or 0

    plans.insert(0, {
        "key": "free",
        "name": "Free",
        "price_mensal": 0,
        "price_anual": 0,
        "features": ["Até 50 vagas/dia", "Matching básico"],
        "subscribers": free_count,
    })

    return {"plans": plans}


@router.patch("/{plan_key}/prices")
def update_plan_prices(
    plan_key: str,
    body: UpdatePricesRequest,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Alterar preços de um plano (owner only)."""
    if plan_key not in PLANOS:
        raise HTTPException(status_code=404, detail=f"Plano '{plan_key}' não encontrado")

    if body.mensal <= 0 or body.anual <= 0:
        raise HTTPException(status_code=400, detail="Preços devem ser maiores que zero")

    old_mensal = PLANOS[plan_key]["price_mensal"]
    old_anual = PLANOS[plan_key]["price_anual"]

    PLANOS[plan_key]["price_mensal"] = body.mensal
    PLANOS[plan_key]["price_anual"] = body.anual

    _log_audit(db, admin.id, "plan.update_price", request,
               target_type="plan", target_id=plan_key,
               details={
                   "old_mensal": old_mensal, "new_mensal": body.mensal,
                   "old_anual": old_anual, "new_anual": body.anual,
               })

    return {
        "ok": True,
        "plan_key": plan_key,
        "mensal": body.mensal,
        "anual": body.anual,
    }
