"""
Router do Dashboard Financeiro do Backoffice Admin.
GET  /api/admin/financial/overview              → KPIs financeiros
GET  /api/admin/financial/transactions          → lista paginada de transações
GET  /api/admin/financial/transactions/{tx_id}  → detalhe de uma transação
GET  /api/admin/financial/export                → CSV download
"""
import csv
import io
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional

from ..models import AdminUser, AdminAuditLog, UserProfile, TransacaoPagamento
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin/financial", tags=["Admin Financial"])

PLANO_PRECOS_MENSAL = {"pro": 29.0, "ultimate": 59.0}


def _pct_change(current, previous):
    if not previous or previous == 0:
        return 100.0 if current else 0.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/overview")
def financial_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """KPIs financeiros: receita total, MRR, ticket médio, transações pendentes."""
    now = datetime.now(timezone.utc)
    d30 = now - timedelta(days=30)
    d60 = now - timedelta(days=60)

    # Receita total (approved)
    receita_atual = db.query(func.coalesce(func.sum(TransacaoPagamento.valor_brl), 0)).filter(
        TransacaoPagamento.status == "approved",
        TransacaoPagamento.criado_em >= d30,
    ).scalar()

    receita_anterior = db.query(func.coalesce(func.sum(TransacaoPagamento.valor_brl), 0)).filter(
        TransacaoPagamento.status == "approved",
        TransacaoPagamento.criado_em >= d60,
        TransacaoPagamento.criado_em < d30,
    ).scalar()

    # MRR (planos ativos × preço)
    mrr = 0.0
    for plano, preco in PLANO_PRECOS_MENSAL.items():
        cnt = db.query(func.count(UserProfile.id)).filter(
            UserProfile.plano_tipo == plano,
            UserProfile.is_premium == True,
        ).scalar() or 0
        mrr += cnt * preco

    # MRR anterior (aproximação: planos que existiam 30d atrás)
    mrr_anterior = mrr * 0.9  # Estimativa conservadora

    # Ticket médio
    tx_count = db.query(func.count(TransacaoPagamento.id)).filter(
        TransacaoPagamento.status == "approved",
        TransacaoPagamento.criado_em >= d30,
    ).scalar() or 0
    ticket_medio = round(receita_atual / tx_count, 2) if tx_count > 0 else 0.0

    tx_count_ant = db.query(func.count(TransacaoPagamento.id)).filter(
        TransacaoPagamento.status == "approved",
        TransacaoPagamento.criado_em >= d60,
        TransacaoPagamento.criado_em < d30,
    ).scalar() or 0
    ticket_medio_ant = round(receita_anterior / tx_count_ant, 2) if tx_count_ant > 0 else 0.0

    # Transações pendentes
    pendentes = db.query(func.count(TransacaoPagamento.id)).filter(
        TransacaoPagamento.status == "pending",
    ).scalar() or 0

    pendentes_ant = db.query(func.count(TransacaoPagamento.id)).filter(
        TransacaoPagamento.status == "pending",
        TransacaoPagamento.criado_em < d30,
    ).scalar() or 0

    return {
        "kpis": {
            "receita_total": {"value": round(receita_atual, 2), "change_pct": _pct_change(receita_atual, receita_anterior)},
            "mrr": {"value": round(mrr, 2), "change_pct": _pct_change(mrr, mrr_anterior)},
            "ticket_medio": {"value": ticket_medio, "change_pct": _pct_change(ticket_medio, ticket_medio_ant)},
            "transacoes_pendentes": {"value": pendentes, "change_pct": _pct_change(pendentes, pendentes_ant)},
        }
    }


@router.get("/transactions")
def list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    status: Optional[str] = Query(None),
    gateway: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Lista paginada de transações com filtros."""
    q = db.query(TransacaoPagamento)

    if status and status in ("pending", "approved", "rejected"):
        q = q.filter(TransacaoPagamento.status == status)

    if gateway:
        q = q.filter(TransacaoPagamento.gateway == gateway)

    if search:
        q = q.filter(TransacaoPagamento.user_email.ilike(f"%{search.strip()}%"))

    if date_from:
        try:
            q = q.filter(TransacaoPagamento.criado_em >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(TransacaoPagamento.criado_em <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    total = q.count()
    offset = (page - 1) * per_page
    txs = q.order_by(desc(TransacaoPagamento.criado_em)).offset(offset).limit(per_page).all()

    return {
        "transactions": [
            {
                "id": t.id,
                "gateway": t.gateway,
                "gateway_id": t.gateway_id,
                "status": t.status,
                "valor_brl": t.valor_brl,
                "valor_usd": t.valor_usd,
                "user_email": t.user_email,
                "criado_em": t.criado_em.isoformat() if t.criado_em else None,
                "atualizado_em": t.atualizado_em.isoformat() if t.atualizado_em else None,
            }
            for t in txs
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, -(-total // per_page)),
    }


@router.get("/transactions/{tx_id}")
def get_transaction_detail(
    tx_id: str,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Detalhe de uma transação + dados do usuário."""
    tx = db.query(TransacaoPagamento).filter(TransacaoPagamento.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    user = None
    if tx.user_email:
        u = db.query(UserProfile).filter(UserProfile.email == tx.user_email).first()
        if u:
            user = {
                "id": u.id,
                "nome": u.nome,
                "email": u.email,
                "plano_tipo": u.plano_tipo,
                "is_premium": u.is_premium,
            }

    return {
        "transaction": {
            "id": tx.id,
            "gateway": tx.gateway,
            "gateway_id": tx.gateway_id,
            "status": tx.status,
            "valor_brl": tx.valor_brl,
            "valor_usd": tx.valor_usd,
            "user_email": tx.user_email,
            "criado_em": tx.criado_em.isoformat() if tx.criado_em else None,
            "atualizado_em": tx.atualizado_em.isoformat() if tx.atualizado_em else None,
        },
        "user": user,
    }


@router.get("/export")
def export_transactions_csv(
    status: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Exporta transações como CSV."""
    q = db.query(TransacaoPagamento)

    if status:
        q = q.filter(TransacaoPagamento.status == status)
    if date_from:
        try:
            q = q.filter(TransacaoPagamento.criado_em >= datetime.fromisoformat(date_from))
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(TransacaoPagamento.criado_em <= datetime.fromisoformat(date_to))
        except ValueError:
            pass

    txs = q.order_by(desc(TransacaoPagamento.criado_em)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Gateway", "Gateway ID", "Status", "Valor BRL", "Valor USD", "Email", "Criado em"])

    for t in txs:
        writer.writerow([
            t.id, t.gateway, t.gateway_id or "", t.status,
            f"{t.valor_brl:.2f}", f"{t.valor_usd:.2f}",
            t.user_email or "", t.criado_em.isoformat() if t.criado_em else "",
        ])

    output.seek(0)
    filename = f"transacoes_{datetime.now().strftime('%Y-%m-%d')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
