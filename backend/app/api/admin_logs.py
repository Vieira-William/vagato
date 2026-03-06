"""
Router de Logs de Auditoria do Backoffice Admin.
GET /api/admin/logs           → lista paginada com filtros
GET /api/admin/logs/actions   → lista distinct de actions
"""
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, distinct
from typing import Optional

from ..models import AdminUser, AdminAuditLog
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin/logs", tags=["Admin Logs"])


@router.get("/actions")
def list_distinct_actions(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista actions distintas para popular filtro."""
    actions = db.query(distinct(AdminAuditLog.action)).order_by(AdminAuditLog.action).all()
    return {"actions": [a[0] for a in actions if a[0]]}


@router.get("")
def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    admin_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    target_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista paginada de audit logs com filtros."""
    q = db.query(AdminAuditLog)

    if admin_id:
        q = q.filter(AdminAuditLog.admin_id == admin_id)

    if action:
        q = q.filter(AdminAuditLog.action == action)

    if target_type:
        q = q.filter(AdminAuditLog.target_type == target_type)

    if date_from:
        try:
            q = q.filter(AdminAuditLog.created_at >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(AdminAuditLog.created_at <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = q.count()
    offset = (page - 1) * per_page
    logs = q.order_by(desc(AdminAuditLog.created_at)).offset(offset).limit(per_page).all()

    # Buscar emails dos admins (cache local)
    admin_ids = {log.admin_id for log in logs if log.admin_id}
    admin_map = {}
    if admin_ids:
        admins = db.query(AdminUser).filter(AdminUser.id.in_(admin_ids)).all()
        admin_map = {a.id: a.email for a in admins}

    return {
        "logs": [
            {
                "id": log.id,
                "admin_id": log.admin_id,
                "admin_email": admin_map.get(log.admin_id, "—"),
                "action": log.action,
                "target_type": log.target_type,
                "target_id": log.target_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),
    }
