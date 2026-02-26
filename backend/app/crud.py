import re

from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import Optional

from . import models, schemas


def _normalizar_titulo(titulo: str) -> str:
    """Normaliza título para comparação cross-source."""
    t = titulo.lower().strip()
    # Remove caracteres especiais e espaços extras
    t = re.sub(r'[^\w\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t


def _normalizar_empresa(empresa: str) -> str:
    """Normaliza nome de empresa para comparação cross-source."""
    e = empresa.lower().strip()
    # Remove sufixos corporativos comuns
    e = re.sub(r'\s+(ltda|s\.?a\.?|inc\.?|corp\.?|eireli|me|srl|gmbh|ag|plc|llc)\s*$', '', e, flags=re.IGNORECASE)
    # Remove pontuação final
    e = e.rstrip('.').strip()
    return e


def get_vaga(db: Session, vaga_id: int) -> Optional[models.Vaga]:
    return db.query(models.Vaga).filter(models.Vaga.id == vaga_id).first()


def get_vagas(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    fonte: Optional[str] = None,
    status: Optional[str] = None,
    modalidade: Optional[str] = None,
    tipo_vaga: Optional[str] = None,
    requisito_ingles: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    busca: Optional[str] = None,
) -> tuple[list[models.Vaga], int]:
    query = db.query(models.Vaga)

    if fonte:
        query = query.filter(models.Vaga.fonte == fonte)
    if status:
        query = query.filter(models.Vaga.status == status)
    if modalidade:
        query = query.filter(models.Vaga.modalidade == modalidade)
    if tipo_vaga:
        query = query.filter(models.Vaga.tipo_vaga == tipo_vaga)
    if requisito_ingles:
        query = query.filter(models.Vaga.requisito_ingles == requisito_ingles)
    if data_inicio:
        query = query.filter(models.Vaga.data_coleta >= data_inicio)
    if data_fim:
        query = query.filter(models.Vaga.data_coleta <= data_fim)
    if busca:
        search_term = f"%{busca}%"
        query = query.filter(
            (models.Vaga.titulo.ilike(search_term)) |
            (models.Vaga.empresa.ilike(search_term))
        )

    total = query.count()
    vagas = query.order_by(models.Vaga.data_coleta.desc()).offset(skip).limit(limit).all()

    return vagas, total


def create_vaga(db: Session, vaga: schemas.VagaCreate) -> models.Vaga:
    db_vaga = models.Vaga(**vaga.model_dump())
    db.add(db_vaga)
    db.commit()
    db.refresh(db_vaga)
    return db_vaga


def create_vagas_batch(db: Session, vagas: list[schemas.VagaCreate]) -> list[models.Vaga]:
    db_vagas = [models.Vaga(**vaga.model_dump()) for vaga in vagas]
    db.add_all(db_vagas)
    db.commit()
    for vaga in db_vagas:
        db.refresh(vaga)
    return db_vagas


def update_vaga(db: Session, vaga_id: int, vaga_update: schemas.VagaUpdate) -> Optional[models.Vaga]:
    db_vaga = get_vaga(db, vaga_id)
    if not db_vaga:
        return None

    update_data = vaga_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_vaga, field, value)

    db.commit()
    db.refresh(db_vaga)
    return db_vaga


def delete_vaga(db: Session, vaga_id: int) -> bool:
    db_vaga = get_vaga(db, vaga_id)
    if not db_vaga:
        return False

    db.delete(db_vaga)
    db.commit()
    return True


def get_stats(db: Session) -> dict:
    total = db.query(models.Vaga).count()

    # Por fonte
    por_fonte = dict(
        db.query(models.Vaga.fonte, func.count(models.Vaga.id))
        .group_by(models.Vaga.fonte)
        .all()
    )

    # Por status
    por_status = dict(
        db.query(models.Vaga.status, func.count(models.Vaga.id))
        .group_by(models.Vaga.status)
        .all()
    )

    # Por modalidade
    por_modalidade = dict(
        db.query(models.Vaga.modalidade, func.count(models.Vaga.id))
        .group_by(models.Vaga.modalidade)
        .all()
    )

    # Por tipo de vaga
    por_tipo_vaga = dict(
        db.query(models.Vaga.tipo_vaga, func.count(models.Vaga.id))
        .filter(models.Vaga.tipo_vaga.isnot(None))
        .group_by(models.Vaga.tipo_vaga)
        .all()
    )

    # Últimas 24h
    ontem = date.today() - timedelta(days=1)
    ultimas_24h = db.query(models.Vaga).filter(models.Vaga.data_coleta >= ontem).count()

    # Destaques e Favoritos
    total_destaques = db.query(models.Vaga).filter(models.Vaga.is_destaque == True).count()
    total_favoritos = db.query(models.Vaga).filter(models.Vaga.is_favorito == True).count()

    # Última coleta (created_at mais recente)
    ultima_coleta = db.query(func.max(models.Vaga.created_at)).scalar()

    return {
        "total_vagas": total,
        "por_fonte": por_fonte,
        "por_status": por_status,
        "por_modalidade": por_modalidade,
        "por_tipo_vaga": por_tipo_vaga,
        "ultimas_24h": ultimas_24h,
        "total_destaques": total_destaques,
        "total_favoritos": total_favoritos,
        "ultima_coleta": ultima_coleta.isoformat() if ultima_coleta else None,
    }


def get_historico(db: Session, dias: int = 30, data_inicio: Optional[date] = None, data_fim: Optional[date] = None) -> dict:
    """Retorna histórico de vagas por período."""
    hoje = date.today()

    if data_inicio and data_fim:
        inicio = data_inicio
        fim = data_fim
    else:
        fim = hoje
        inicio = hoje - timedelta(days=dias)

    # Vagas no período
    vagas_periodo = db.query(models.Vaga).filter(
        models.Vaga.data_coleta >= inicio,
        models.Vaga.data_coleta <= fim
    )
    total_periodo = vagas_periodo.count()

    # Por dia com fonte
    por_dia_raw = db.query(
        models.Vaga.data_coleta,
        models.Vaga.fonte,
        func.count(models.Vaga.id)
    ).filter(
        models.Vaga.data_coleta >= inicio,
        models.Vaga.data_coleta <= fim
    ).group_by(models.Vaga.data_coleta, models.Vaga.fonte).all()

    # Agrupa por dia
    dias_dict = {}
    for data, fonte, count in por_dia_raw:
        data_str = data.isoformat()
        if data_str not in dias_dict:
            dias_dict[data_str] = {"data": data_str, "total": 0, "indeed": 0, "linkedin_jobs": 0, "linkedin_posts": 0}
        dias_dict[data_str][fonte] = count
        dias_dict[data_str]["total"] += count

    por_dia = sorted(dias_dict.values(), key=lambda x: x["data"], reverse=True)

    # Crescimento vs período anterior
    periodo_anterior_inicio = inicio - timedelta(days=dias)
    total_anterior = db.query(models.Vaga).filter(
        models.Vaga.data_coleta >= periodo_anterior_inicio,
        models.Vaga.data_coleta < inicio
    ).count()

    if total_anterior > 0:
        crescimento_pct = ((total_periodo - total_anterior) / total_anterior) * 100
    else:
        crescimento_pct = 100.0 if total_periodo > 0 else 0.0

    media_diaria = total_periodo / max(dias, 1)

    # Por modalidade no período
    por_modalidade = dict(
        vagas_periodo.with_entities(models.Vaga.modalidade, func.count(models.Vaga.id))
        .group_by(models.Vaga.modalidade).all()
    )

    # Por inglês no período
    por_ingles = dict(
        vagas_periodo.with_entities(models.Vaga.requisito_ingles, func.count(models.Vaga.id))
        .group_by(models.Vaga.requisito_ingles).all()
    )

    # Top empresas
    top_empresas_raw = vagas_periodo.with_entities(
        models.Vaga.empresa, func.count(models.Vaga.id).label('count')
    ).filter(models.Vaga.empresa.isnot(None)).group_by(models.Vaga.empresa).order_by(
        func.count(models.Vaga.id).desc()
    ).limit(10).all()

    top_empresas = [{"empresa": e, "count": c} for e, c in top_empresas_raw if e]

    return {
        "periodo": f"{dias}d",
        "data_inicio": inicio.isoformat(),
        "data_fim": fim.isoformat(),
        "total_periodo": total_periodo,
        "por_dia": por_dia,
        "crescimento": {
            "vs_periodo_anterior": round(crescimento_pct, 1),
            "media_diaria": round(media_diaria, 1)
        },
        "por_modalidade": por_modalidade,
        "por_ingles": por_ingles,
        "top_empresas": top_empresas
    }


def get_vaga_by_link(db: Session, link_vaga: Optional[str]) -> Optional[models.Vaga]:
    """Busca vaga por link. Retorna a vaga ou None."""
    if not link_vaga:
        return None
    return db.query(models.Vaga).filter(models.Vaga.link_vaga == link_vaga).first()


def check_duplicate(
    db: Session,
    titulo: str,
    empresa: Optional[str],
    link_vaga: Optional[str],
    perfil_autor: Optional[str] = None,
) -> bool:
    """
    Verifica se já existe uma vaga duplicada.

    Checks (em ordem de especificidade):
    1. Mesmo link (mais específico)
    2. Mesmo título + empresa
    3. Mesmo título + perfil_autor (posts sem empresa)
    4. Mesmo título genérico sem empresa e sem link
    """
    query = db.query(models.Vaga)

    # 1. Por link (mais específico)
    if link_vaga:
        existing = query.filter(models.Vaga.link_vaga == link_vaga).first()
        if existing:
            return True

    # 2. Por título + empresa (exact)
    if titulo and empresa:
        existing = query.filter(
            models.Vaga.titulo == titulo,
            models.Vaga.empresa == empresa
        ).first()
        if existing:
            return True

    # 2b. Cross-source: título normalizado + empresa normalizada
    # Detecta duplicatas como "LOGAME" vs "Logame", "meutudo." vs "meutudo"
    # Usa lower() no SQL para filtrar candidatos antes de normalizar em Python
    if titulo and empresa:
        titulo_norm = _normalizar_titulo(titulo)
        empresa_norm = _normalizar_empresa(empresa)
        # Filtra candidatos no banco com lower() — muito mais eficiente que carregar tudo
        vagas_candidatas = query.filter(
            models.Vaga.empresa.isnot(None),
            func.lower(models.Vaga.titulo).contains(titulo_norm.split()[0] if titulo_norm.split() else titulo_norm)
        ).all()
        for v in vagas_candidatas:
            if v.titulo and v.empresa:
                if (_normalizar_titulo(v.titulo) == titulo_norm and
                        _normalizar_empresa(v.empresa) == empresa_norm):
                    return True

    # 3. Por título + perfil_autor (para posts sem empresa)
    # Evita duplicatas como 7x "Product Designer" do mesmo autor
    if titulo and perfil_autor and not empresa:
        existing = query.filter(
            models.Vaga.titulo == titulo,
            models.Vaga.perfil_autor == perfil_autor
        ).first()
        if existing:
            return True

    # 4. Título genérico sem empresa e sem link = provável duplicata
    if titulo and not empresa and not link_vaga:
        existing = query.filter(
            models.Vaga.titulo == titulo,
            models.Vaga.empresa.is_(None),
            models.Vaga.link_vaga.is_(None)
        ).first()
        if existing:
            return True

    return False
