"""
Router de Custos IA do Backoffice Admin.
GET  /api/admin/ai-costs/overview       → KPIs + distribuicao por modelo + top consumers
POST /api/admin/ai-costs/budget-alert   → definir alerta limite USD
POST /api/admin/ai-costs/recharge       → incrementar saldo (owner only)
"""
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models import AdminUser, AdminAuditLog, ConfiguracaoIA, ExtensionLog
from ..middleware.admin_auth import get_admin_db, get_current_admin, require_owner

router = APIRouter(prefix="/admin/ai-costs", tags=["Admin AI Costs"])


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


def _get_or_create_config(db: Session) -> ConfiguracaoIA:
    """Busca ou cria a configuracao IA (singleton)."""
    config = db.query(ConfiguracaoIA).first()
    if not config:
        config = ConfiguracaoIA()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


class BudgetAlertRequest(BaseModel):
    limite_usd: float


class RechargeRequest(BaseModel):
    valor_usd: float


@router.get("/overview")
def ai_costs_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """KPIs de custos IA + distribuicao por modelo + top consumers."""
    config = _get_or_create_config(db)

    total_calls = (config.haiku_calls or 0) + (config.sonnet_calls or 0) + (config.vision_calls or 0)
    gasto_total = config.gasto_acumulado_usd or 0.0
    saldo = config.saldo_disponivel

    # Top 5 consumers (por ai_calls)
    top_consumers = (
        db.query(
            ExtensionLog.user_email,
            func.sum(ExtensionLog.ai_calls).label("total_ai_calls"),
            func.max(ExtensionLog.created_at).label("last_activity"),
        )
        .filter(ExtensionLog.ai_calls > 0)
        .group_by(ExtensionLog.user_email)
        .order_by(desc("total_ai_calls"))
        .limit(5)
        .all()
    )

    return {
        "kpis": {
            "gasto_total_usd": {"value": round(gasto_total, 4)},
            "saldo_disponivel": {"value": round(saldo, 4)},
            "total_calls": {"value": total_calls},
            "alerta_limite_usd": {"value": config.alerta_limite_usd or 2.0},
        },
        "by_model": [
            {"model": "haiku", "calls": config.haiku_calls or 0, "gasto_usd": round(config.gasto_haiku_usd or 0, 4)},
            {"model": "sonnet", "calls": config.sonnet_calls or 0, "gasto_usd": round(config.gasto_sonnet_usd or 0, 4)},
            {"model": "vision", "calls": config.vision_calls or 0, "gasto_usd": round(config.gasto_vision_usd or 0, 4)},
        ],
        "top_consumers": [
            {
                "email": row.user_email,
                "ai_calls": int(row.total_ai_calls),
                "last_activity": row.last_activity.isoformat() if row.last_activity else None,
            }
            for row in top_consumers
        ],
        "saldo_percentual": config.percentual_gasto,
        "em_alerta": config.em_alerta,
    }


@router.post("/budget-alert")
def set_budget_alert(
    body: BudgetAlertRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Definir limite de alerta em USD."""
    if body.limite_usd <= 0:
        raise HTTPException(status_code=400, detail="Limite deve ser maior que zero")

    config = _get_or_create_config(db)
    old_val = config.alerta_limite_usd
    config.alerta_limite_usd = body.limite_usd
    db.commit()

    _log_audit(db, admin.id, "ai.budget_alert", request,
               target_type="config", details={"old": old_val, "new": body.limite_usd})

    return {"ok": True, "alerta_limite_usd": body.limite_usd}


@router.post("/recharge")
def recharge_balance(
    body: RechargeRequest,
    request: Request,
    admin: AdminUser = Depends(require_owner),
    db: Session = Depends(get_admin_db),
):
    """Incrementar saldo IA (owner only)."""
    if body.valor_usd <= 0:
        raise HTTPException(status_code=400, detail="Valor deve ser maior que zero")

    config = _get_or_create_config(db)
    old_saldo = config.saldo_inicial_usd
    config.saldo_inicial_usd = (config.saldo_inicial_usd or 0) + body.valor_usd
    db.commit()

    _log_audit(db, admin.id, "ai.recharge", request,
               target_type="config",
               details={"valor_usd": body.valor_usd, "old_saldo": old_saldo, "new_saldo": config.saldo_inicial_usd})

    return {
        "ok": True,
        "saldo_inicial_usd": config.saldo_inicial_usd,
        "saldo_disponivel": config.saldo_disponivel,
    }
