from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from ..database import get_db
from .. import crud, schemas
from ..middleware.supabase_auth import get_current_user

router = APIRouter(prefix="/stats", tags=["estatisticas"])


@router.get("/", response_model=schemas.StatsResponse)
def obter_estatisticas(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Retorna estatísticas gerais das vagas."""
    return crud.get_stats(db)


@router.get("/historico", response_model=schemas.HistoricoResponse)
def obter_historico(
    periodo: int = Query(30, ge=1, le=365, description="Dias de histórico"),
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Retorna histórico temporal de vagas."""
    return crud.get_historico(db, dias=periodo, data_inicio=data_inicio, data_fim=data_fim)
