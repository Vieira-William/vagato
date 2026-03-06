"""
Router de E-mails Transacionais do Backoffice Admin.
GET    /api/admin/emails/templates              → lista templates
POST   /api/admin/emails/templates              → criar template
GET    /api/admin/emails/templates/{id}         → detalhe template
PATCH  /api/admin/emails/templates/{id}         → editar template
DELETE /api/admin/emails/templates/{id}         → deletar template
POST   /api/admin/emails/templates/{id}/test    → envio de teste (simulado)
GET    /api/admin/emails/logs                   → lista paginada de logs
GET    /api/admin/emails/stats                  → KPIs de envio
"""
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from typing import Optional, List

from ..models import EmailTemplate, EmailLog, AdminUser, AdminAuditLog
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin/emails", tags=["Admin Emails"])


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


def _template_to_dict(t: EmailTemplate) -> dict:
    return {
        "id": t.id,
        "slug": t.slug,
        "nome": t.nome,
        "assunto": t.assunto,
        "corpo": t.corpo,
        "variaveis": t.variaveis or [],
        "tipo": t.tipo,
        "is_active": t.is_active,
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


# ── Schemas ──

class CreateTemplateRequest(BaseModel):
    nome: str
    slug: str
    assunto: str
    corpo: str
    variaveis: Optional[List[str]] = []
    tipo: Optional[str] = "transacional"


class UpdateTemplateRequest(BaseModel):
    nome: Optional[str] = None
    slug: Optional[str] = None
    assunto: Optional[str] = None
    corpo: Optional[str] = None
    variaveis: Optional[List[str]] = None
    tipo: Optional[str] = None
    is_active: Optional[bool] = None


class TestSendRequest(BaseModel):
    to_email: str


# ── Templates CRUD ──

@router.get("/templates")
def list_templates(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista todos os templates de email."""
    templates = db.query(EmailTemplate).order_by(EmailTemplate.created_at.desc()).all()
    return {"templates": [_template_to_dict(t) for t in templates]}


@router.post("/templates")
def create_template(
    body: CreateTemplateRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Criar novo template de email."""
    slug_lower = body.slug.strip().lower().replace(" ", "-")

    existing = db.query(EmailTemplate).filter(EmailTemplate.slug == slug_lower).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Slug '{slug_lower}' ja existe")

    template = EmailTemplate(
        slug=slug_lower,
        nome=body.nome.strip(),
        assunto=body.assunto.strip(),
        corpo=body.corpo,
        variaveis=body.variaveis or [],
        tipo=body.tipo or "transacional",
        created_by=admin.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)

    _log_audit(db, admin.id, "email_template.create", request,
               target_type="email_template", target_id=str(template.id),
               details={"slug": slug_lower, "nome": body.nome})

    return _template_to_dict(template)


@router.get("/templates/{template_id}")
def get_template(
    template_id: int,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Detalhe de um template."""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nao encontrado")
    return _template_to_dict(template)


@router.patch("/templates/{template_id}")
def update_template(
    template_id: int,
    body: UpdateTemplateRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Editar template de email."""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nao encontrado")

    changes = {}
    if body.nome is not None:
        changes["nome"] = {"old": template.nome, "new": body.nome}
        template.nome = body.nome.strip()
    if body.slug is not None:
        new_slug = body.slug.strip().lower().replace(" ", "-")
        dup = db.query(EmailTemplate).filter(
            EmailTemplate.slug == new_slug, EmailTemplate.id != template_id
        ).first()
        if dup:
            raise HTTPException(status_code=409, detail=f"Slug '{new_slug}' ja existe")
        changes["slug"] = {"old": template.slug, "new": new_slug}
        template.slug = new_slug
    if body.assunto is not None:
        template.assunto = body.assunto.strip()
    if body.corpo is not None:
        template.corpo = body.corpo
    if body.variaveis is not None:
        template.variaveis = body.variaveis
    if body.tipo is not None:
        template.tipo = body.tipo
    if body.is_active is not None:
        changes["is_active"] = {"old": template.is_active, "new": body.is_active}
        template.is_active = body.is_active

    db.commit()
    db.refresh(template)

    _log_audit(db, admin.id, "email_template.update", request,
               target_type="email_template", target_id=str(template_id),
               details=changes)

    return _template_to_dict(template)


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Deletar template de email."""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nao encontrado")

    slug = template.slug
    db.delete(template)
    db.commit()

    _log_audit(db, admin.id, "email_template.delete", request,
               target_type="email_template", target_id=str(template_id),
               details={"slug": slug})

    return {"ok": True}


@router.post("/templates/{template_id}/test")
def test_send(
    template_id: int,
    body: TestSendRequest,
    request: Request,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Envio de teste (simulado — salva EmailLog com status='test')."""
    template = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template nao encontrado")

    log = EmailLog(
        template_id=template.id,
        to_email=body.to_email.strip(),
        subject=f"[TESTE] {template.assunto}",
        status="test",
    )
    db.add(log)
    db.commit()

    _log_audit(db, admin.id, "email_template.test_send", request,
               target_type="email_template", target_id=str(template_id),
               details={"to_email": body.to_email})

    return {"ok": True, "message": f"Envio de teste simulado para {body.to_email}"}


# ── Logs ──

@router.get("/logs")
def list_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    template_id: Optional[int] = None,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista paginada de logs de envio."""
    query = db.query(EmailLog)

    if status and status != "all":
        query = query.filter(EmailLog.status == status)
    if template_id:
        query = query.filter(EmailLog.template_id == template_id)

    total = query.count()
    total_pages = max(1, (total + per_page - 1) // per_page)

    logs = (
        query
        .order_by(EmailLog.sent_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Buscar nomes dos templates
    template_ids = {l.template_id for l in logs if l.template_id}
    templates_map = {}
    if template_ids:
        tpls = db.query(EmailTemplate).filter(EmailTemplate.id.in_(template_ids)).all()
        templates_map = {t.id: t.nome for t in tpls}

    return {
        "logs": [
            {
                "id": l.id,
                "template_id": l.template_id,
                "template_nome": templates_map.get(l.template_id, "—"),
                "to_email": l.to_email,
                "subject": l.subject,
                "status": l.status,
                "error_message": l.error_message,
                "sent_at": l.sent_at.isoformat() if l.sent_at else None,
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": total_pages,
    }


# ── Stats ──

@router.get("/stats")
def get_stats(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """KPIs de envio de email."""
    now = datetime.now(timezone.utc)
    hoje_inicio = now.replace(hour=0, minute=0, second=0, microsecond=0)
    mes_inicio = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Excluir status='test' dos stats reais
    base_q = db.query(EmailLog).filter(EmailLog.status != "test")

    enviados_hoje = base_q.filter(EmailLog.sent_at >= hoje_inicio).count()
    enviados_mes = base_q.filter(EmailLog.sent_at >= mes_inicio).count()

    total_all = base_q.count()
    delivered = base_q.filter(EmailLog.status == "delivered").count()
    bounces = base_q.filter(EmailLog.status == "bounced").count()

    taxa_entrega = (delivered / total_all * 100) if total_all > 0 else 100.0

    return {
        "enviados_hoje": enviados_hoje,
        "enviados_mes": enviados_mes,
        "taxa_entrega": round(taxa_entrega, 1),
        "bounces": bounces,
    }
