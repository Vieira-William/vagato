"""
Router de Gestão de Cupons do Backoffice Admin.
GET    /api/admin/coupons              → lista paginada
POST   /api/admin/coupons              → criar cupom
PATCH  /api/admin/coupons/{id}         → editar cupom
DELETE /api/admin/coupons/{id}         → soft delete
PATCH  /api/admin/coupons/{id}/toggle  → ativar/desativar
"""
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List

from ..models import AdminUser, AdminAuditLog, Coupon
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin/coupons", tags=["Admin Coupons"])


# ── Helpers ──

def _log_audit(db: Session, admin_id: str, action: str, request: Request,
               target_type: str = None, target_id: str = None, details: dict = None):
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


def _coupon_to_dict(c: Coupon) -> dict:
    return {
        "id": c.id,
        "code": c.code,
        "discount_pct": c.discount_pct,
        "discount_fixed": c.discount_fixed,
        "discount_type": c.discount_type,
        "max_uses": c.max_uses,
        "current_uses": c.current_uses,
        "applicable_plans": c.applicable_plans or [],
        "expires_at": c.expires_at.isoformat() if c.expires_at else None,
        "is_active": c.is_active,
        "created_by": c.created_by,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }


# ── Schemas ──

class CouponCreateRequest(BaseModel):
    code: str
    discount_type: str = "percent"  # 'percent' | 'fixed'
    discount_pct: Optional[float] = None
    discount_fixed: Optional[float] = None
    max_uses: Optional[int] = None
    applicable_plans: Optional[List[str]] = []
    expires_at: Optional[str] = None

class CouponUpdateRequest(BaseModel):
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_pct: Optional[float] = None
    discount_fixed: Optional[float] = None
    max_uses: Optional[int] = None
    applicable_plans: Optional[List[str]] = None
    expires_at: Optional[str] = None

class ToggleRequest(BaseModel):
    is_active: bool


# ── Endpoints ──

@router.get("")
def list_coupons(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista paginada de cupons."""
    q = db.query(Coupon)

    if is_active is not None:
        q = q.filter(Coupon.is_active == is_active)

    total = q.count()
    offset = (page - 1) * per_page
    coupons = q.order_by(desc(Coupon.created_at)).offset(offset).limit(per_page).all()

    return {
        "coupons": [_coupon_to_dict(c) for c in coupons],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),
    }


@router.post("")
def create_coupon(
    body: CouponCreateRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Criar novo cupom."""
    code_upper = body.code.strip().upper()

    # Validar código único
    existing = db.query(Coupon).filter(Coupon.code == code_upper).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Código '{code_upper}' já existe")

    # Validar tipo desconto
    if body.discount_type == "percent" and not body.discount_pct:
        raise HTTPException(status_code=400, detail="discount_pct obrigatório para tipo 'percent'")
    if body.discount_type == "fixed" and not body.discount_fixed:
        raise HTTPException(status_code=400, detail="discount_fixed obrigatório para tipo 'fixed'")

    expires_dt = None
    if body.expires_at:
        try:
            expires_dt = datetime.fromisoformat(body.expires_at)
        except ValueError:
            raise HTTPException(status_code=400, detail="expires_at inválido (ISO format)")

    coupon = Coupon(
        code=code_upper,
        discount_type=body.discount_type,
        discount_pct=body.discount_pct,
        discount_fixed=body.discount_fixed,
        max_uses=body.max_uses,
        applicable_plans=body.applicable_plans or [],
        expires_at=expires_dt,
        is_active=True,
        created_by=admin.id,
    )
    db.add(coupon)
    db.commit()
    db.refresh(coupon)

    _log_audit(db, admin.id, "coupon.create", request,
               target_type="coupon", target_id=str(coupon.id),
               details={"code": code_upper, "discount_type": body.discount_type})

    return _coupon_to_dict(coupon)


@router.patch("/{coupon_id}")
def update_coupon(
    coupon_id: int,
    body: CouponUpdateRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Editar campos de um cupom."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")

    changes = {}
    if body.code is not None:
        new_code = body.code.strip().upper()
        if new_code != coupon.code:
            existing = db.query(Coupon).filter(Coupon.code == new_code, Coupon.id != coupon_id).first()
            if existing:
                raise HTTPException(status_code=409, detail=f"Código '{new_code}' já existe")
            changes["code"] = {"old": coupon.code, "new": new_code}
            coupon.code = new_code

    for field in ["discount_type", "discount_pct", "discount_fixed", "max_uses", "applicable_plans"]:
        val = getattr(body, field, None)
        if val is not None:
            old = getattr(coupon, field)
            setattr(coupon, field, val)
            changes[field] = {"old": old, "new": val}

    if body.expires_at is not None:
        try:
            coupon.expires_at = datetime.fromisoformat(body.expires_at) if body.expires_at else None
            changes["expires_at"] = body.expires_at
        except ValueError:
            pass

    db.commit()
    db.refresh(coupon)

    _log_audit(db, admin.id, "coupon.update", request,
               target_type="coupon", target_id=str(coupon_id),
               details=changes)

    return _coupon_to_dict(coupon)


@router.delete("/{coupon_id}")
def delete_coupon(
    coupon_id: int,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Soft delete — desativa o cupom."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")

    coupon.is_active = False
    db.commit()

    _log_audit(db, admin.id, "coupon.delete", request,
               target_type="coupon", target_id=str(coupon_id),
               details={"code": coupon.code})

    return {"ok": True}


@router.patch("/{coupon_id}/toggle")
def toggle_coupon(
    coupon_id: int,
    body: ToggleRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Ativar ou desativar cupom."""
    coupon = db.query(Coupon).filter(Coupon.id == coupon_id).first()
    if not coupon:
        raise HTTPException(status_code=404, detail="Cupom não encontrado")

    coupon.is_active = body.is_active
    db.commit()

    action = "coupon.activate" if body.is_active else "coupon.deactivate"
    _log_audit(db, admin.id, action, request,
               target_type="coupon", target_id=str(coupon_id),
               details={"code": coupon.code})

    return {"ok": True, "is_active": body.is_active}
