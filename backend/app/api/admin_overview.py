"""
Router do Overview do Backoffice Admin.
GET /api/admin/overview → KPIs, gráfico, atividade recente, distribuição de planos.
"""
from datetime import datetime, timedelta, timezone, date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, text, and_

from ..models import AdminUser, UserProfile, TransacaoPagamento
from ..middleware.admin_auth import get_admin_db, get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin Overview"])

# Mapa de preços (mesmo do pagamentos.py)
PLANO_PRECOS_MENSAL = {"pro": 29.0, "ultimate": 59.0}


def _pct_change(current, previous):
    """Calcula variação percentual. Retorna 0 se previous é 0."""
    if not previous or previous == 0:
        return 100.0 if current else 0.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/overview")
def admin_overview(
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_admin_db),
):
    """Dashboard principal: KPIs + gráfico + atividade recente + distribuição de planos."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)
    sixty_days_ago = now - timedelta(days=60)

    # ── KPI 1: Total Usuários ────────────────────────────────────────────
    total_users = db.query(func.count(UserProfile.id)).scalar() or 0
    users_30d_ago = db.query(func.count(UserProfile.id)).filter(
        UserProfile.created_at <= thirty_days_ago
    ).scalar() or 0

    # ── KPI 2: MRR (Monthly Recurring Revenue) ──────────────────────────
    mrr_query = db.query(
        func.sum(
            case(
                (UserProfile.plano_tipo == 'pro', PLANO_PRECOS_MENSAL['pro']),
                (UserProfile.plano_tipo == 'ultimate', PLANO_PRECOS_MENSAL['ultimate']),
                else_=0.0
            )
        )
    ).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.plano_expira_em > now,
    )
    mrr = float(mrr_query.scalar() or 0)

    # MRR de 30 dias atrás (aproximação: assinaturas que eram ativas naquela época)
    mrr_prev_query = db.query(
        func.sum(
            case(
                (UserProfile.plano_tipo == 'pro', PLANO_PRECOS_MENSAL['pro']),
                (UserProfile.plano_tipo == 'ultimate', PLANO_PRECOS_MENSAL['ultimate']),
                else_=0.0
            )
        )
    ).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.plano_expira_em > thirty_days_ago,
        UserProfile.created_at <= thirty_days_ago,
    )
    mrr_prev = float(mrr_prev_query.scalar() or 0)

    # ── KPI 3: Churn Rate ───────────────────────────────────────────────
    # Users que tinham plano pago mas plano expirou nos últimos 30 dias
    churned = db.query(func.count(UserProfile.id)).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.plano_expira_em.between(thirty_days_ago, now),
    ).scalar() or 0

    total_paid_start = db.query(func.count(UserProfile.id)).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.created_at <= thirty_days_ago,
    ).scalar() or 1  # evitar divisão por zero

    churn_rate = round((churned / total_paid_start) * 100, 1)

    # Churn do mês anterior
    churned_prev = db.query(func.count(UserProfile.id)).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.plano_expira_em.between(sixty_days_ago, thirty_days_ago),
    ).scalar() or 0
    total_paid_prev = db.query(func.count(UserProfile.id)).filter(
        UserProfile.plano_tipo.in_(['pro', 'ultimate']),
        UserProfile.created_at <= sixty_days_ago,
    ).scalar() or 1
    churn_rate_prev = round((churned_prev / total_paid_prev) * 100, 1)

    # ── KPI 4: Novos Hoje ───────────────────────────────────────────────
    new_today = db.query(func.count(UserProfile.id)).filter(
        UserProfile.created_at >= today_start
    ).scalar() or 0

    # Mesmo dia da semana passada
    same_day_last_week = today_start - timedelta(days=7)
    new_last_week_day = db.query(func.count(UserProfile.id)).filter(
        UserProfile.created_at >= same_day_last_week,
        UserProfile.created_at < same_day_last_week + timedelta(days=1),
    ).scalar() or 0

    # ── Distribuição de Planos ──────────────────────────────────────────
    plan_counts = db.query(
        UserProfile.plano_tipo,
        func.count(UserProfile.id),
    ).group_by(UserProfile.plano_tipo).all()

    plan_dist = {"free": 0, "pro": 0, "ultimate": 0}
    for plano, count in plan_counts:
        key = plano or "free"
        if key in plan_dist:
            plan_dist[key] += count
        else:
            plan_dist["free"] += count

    total_for_pct = sum(plan_dist.values()) or 1
    plan_distribution = {
        k: {"count": v, "pct": round((v / total_for_pct) * 100, 1)}
        for k, v in plan_dist.items()
    }

    # ── Atividade Recente (últimos 10 eventos) ──────────────────────────
    recent_transactions = db.query(TransacaoPagamento).order_by(
        TransacaoPagamento.criado_em.desc()
    ).limit(10).all()

    recent_activity = []
    for tx in recent_transactions:
        time_diff = now - (tx.criado_em.replace(tzinfo=timezone.utc) if tx.criado_em.tzinfo is None else tx.criado_em)
        if time_diff.total_seconds() < 60:
            time_ago = "agora"
        elif time_diff.total_seconds() < 3600:
            time_ago = f"há {int(time_diff.total_seconds() / 60)} min"
        elif time_diff.total_seconds() < 86400:
            time_ago = f"há {int(time_diff.total_seconds() / 3600)}h"
        else:
            time_ago = f"há {int(time_diff.days)}d"

        action = "Pagamento aprovado" if tx.status == "approved" else f"Pagamento {tx.status}"
        recent_activity.append({
            "user_email": tx.user_email or "—",
            "action": action,
            "time_ago": time_ago,
            "value": f"R$ {tx.valor_brl:.2f}" if tx.valor_brl else None,
            "gateway": tx.gateway,
        })

    # ── Gráfico (últimos 6 meses) ──────────────────────────────────────
    chart_labels = []
    chart_users = []
    chart_revenue = []
    for i in range(5, -1, -1):
        month_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            month_end = (now - timedelta(days=30 * (i - 1))).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            month_end = now

        month_name = month_start.strftime("%b")
        chart_labels.append(month_name)

        # Users até esse mês
        users_count = db.query(func.count(UserProfile.id)).filter(
            UserProfile.created_at <= month_end
        ).scalar() or 0
        chart_users.append(users_count)

        # Receita do mês (transações aprovadas)
        month_revenue = db.query(func.sum(TransacaoPagamento.valor_brl)).filter(
            TransacaoPagamento.status == "approved",
            TransacaoPagamento.criado_em >= month_start,
            TransacaoPagamento.criado_em < month_end,
        ).scalar() or 0
        chart_revenue.append(float(month_revenue))

    return {
        "kpis": {
            "total_users": {
                "value": total_users,
                "change_pct": _pct_change(total_users, users_30d_ago),
            },
            "mrr": {
                "value": mrr,
                "change_pct": _pct_change(mrr, mrr_prev),
            },
            "churn_rate": {
                "value": churn_rate,
                "change_pct": _pct_change(churn_rate, churn_rate_prev),
            },
            "new_today": {
                "value": new_today,
                "change_pct": _pct_change(new_today, new_last_week_day),
            },
        },
        "chart": {
            "labels": chart_labels,
            "users": chart_users,
            "revenue": chart_revenue,
        },
        "recent_activity": recent_activity,
        "plan_distribution": plan_distribution,
    }
