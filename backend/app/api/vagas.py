from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date

from ..database import get_db
from .. import crud, schemas
from ..scrapers.analisar_brutos import _limpar_empresa
from ..middleware.supabase_auth import get_current_user

router = APIRouter(prefix="/vagas", tags=["vagas"])


@router.get("/", response_model=schemas.VagaListResponse)
def listar_vagas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    fonte: Optional[str] = None,
    status: Optional[str] = None,
    modalidade: Optional[str] = None,
    tipo_vaga: Optional[str] = None,
    requisito_ingles: Optional[str] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Lista todas as vagas com filtros opcionais."""
    vagas, total = crud.get_vagas(
        db,
        skip=skip,
        limit=limit,
        fonte=fonte,
        status=status,
        modalidade=modalidade,
        tipo_vaga=tipo_vaga,
        requisito_ingles=requisito_ingles,
        data_inicio=data_inicio,
        data_fim=data_fim,
        busca=busca,
    )
    return {"total": total, "vagas": vagas}


@router.get("/{vaga_id}", response_model=schemas.VagaResponse)
def obter_vaga(vaga_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Obtém uma vaga específica por ID."""
    vaga = crud.get_vaga(db, vaga_id)
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return vaga


@router.post("/", response_model=schemas.VagaResponse, status_code=201)
def criar_vaga(vaga: schemas.VagaCreate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Cria uma nova vaga. Aplica limpeza de empresa antes de inserir."""
    # Limpa empresa para normalizar dados (remove newlines, timestamps, sufixos corporativos)
    if vaga.empresa:
        vaga.empresa = _limpar_empresa(vaga.empresa)
    if crud.check_duplicate(db, vaga.titulo, vaga.empresa, vaga.link_vaga):
        raise HTTPException(status_code=400, detail="Vaga duplicada já existe")
    return crud.create_vaga(db, vaga)


@router.post("/batch", response_model=list[schemas.VagaResponse], status_code=201)
def criar_vagas_batch(vagas: list[schemas.VagaCreate], db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Cria múltiplas vagas de uma vez (para importação). Aplica limpeza de empresa."""
    vagas_novas = []
    for vaga in vagas:
        # Limpa empresa antes de verificar duplicata
        if vaga.empresa:
            vaga.empresa = _limpar_empresa(vaga.empresa)
        if not crud.check_duplicate(db, vaga.titulo, vaga.empresa, vaga.link_vaga):
            vagas_novas.append(vaga)

    if not vagas_novas:
        raise HTTPException(status_code=400, detail="Todas as vagas já existem")

    return crud.create_vagas_batch(db, vagas_novas)


@router.patch("/{vaga_id}", response_model=schemas.VagaResponse)
def atualizar_vaga(vaga_id: int, vaga_update: schemas.VagaUpdate, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Atualiza uma vaga existente."""
    vaga = crud.update_vaga(db, vaga_id, vaga_update)
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return vaga


@router.delete("/{vaga_id}", status_code=204)
def deletar_vaga(vaga_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Deleta uma vaga."""
    if not crud.delete_vaga(db, vaga_id):
        raise HTTPException(status_code=404, detail="Vaga não encontrada")


@router.patch("/{vaga_id}/status", response_model=schemas.VagaResponse)
def atualizar_status(
    vaga_id: int,
    status: schemas.StatusEnum,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Atualiza apenas o status de uma vaga."""
    vaga = crud.update_vaga(db, vaga_id, schemas.VagaUpdate(status=status))
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")
    return vaga


@router.post("/{vaga_id}/favoritar", response_model=schemas.VagaResponse)
def toggle_favorito(
    vaga_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Toggle o estado de favorito de uma vaga."""
    vaga = crud.get_vaga(db, vaga_id)
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    # Toggle is_favorito
    vaga.is_favorito = not vaga.is_favorito
    db.commit()
    db.refresh(vaga)
    return vaga


@router.post("/recalcular-scores")
def recalcular_scores(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Recalcula scores de compatibilidade para todas as vagas."""
    from ..services.job_matcher import JobMatcher
    from ..services.default_profile import WILLIAM_PROFILE
    from ..models import Vaga

    matcher = JobMatcher(WILLIAM_PROFILE)
    vagas = db.query(Vaga).all()

    atualizadas = 0
    for vaga in vagas:
        vaga_dict = {
            "skills_obrigatorias": vaga.skills_obrigatorias or [],
            "skills_desejaveis": vaga.skills_desejaveis or [],
            "nivel": vaga.nivel,
            "modalidade": vaga.modalidade,
            "tipo_contrato": vaga.tipo_contrato,
            "salario_min": vaga.salario_min,
            "salario_max": vaga.salario_max,
            "requisito_ingles": vaga.requisito_ingles,
            "localizacao": vaga.localizacao,
        }

        resultado = matcher.calcular_score(vaga_dict)
        vaga.score_compatibilidade = resultado["score_total"]
        vaga.score_breakdown = resultado["breakdown"]
        vaga.is_destaque = resultado["is_destaque"]
        atualizadas += 1

    db.commit()
    return {"message": f"{atualizadas} vagas atualizadas", "total": atualizadas}


@router.post("/deduplicar")
def deduplicar_vagas(db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Remove vagas duplicadas, mantendo a mais recente de cada titulo."""
    from sqlalchemy import func
    from ..models import Vaga

    # Buscar todos os titulos duplicados
    titulos_duplicados = db.query(
        func.lower(func.trim(Vaga.titulo)).label('titulo_norm')
    ).group_by(
        func.lower(func.trim(Vaga.titulo))
    ).having(
        func.count(Vaga.id) > 1
    ).all()

    titulos_duplicados = [t[0] for t in titulos_duplicados]

    if not titulos_duplicados:
        return {"deletadas": 0, "mantidas": db.query(Vaga).count(), "mensagem": "Nenhuma duplicata encontrada"}

    # Para cada titulo duplicado, manter apenas o mais recente (maior ID)
    ids_para_deletar = []

    for titulo_norm in titulos_duplicados:
        vagas_duplicadas = db.query(Vaga).filter(
            func.lower(func.trim(Vaga.titulo)) == titulo_norm
        ).order_by(Vaga.id.desc()).all()

        # Manter o primeiro (mais recente), deletar o resto
        for vaga in vagas_duplicadas[1:]:
            ids_para_deletar.append(vaga.id)

    # Deletar as duplicadas
    if ids_para_deletar:
        db.query(Vaga).filter(Vaga.id.in_(ids_para_deletar)).delete(synchronize_session=False)
        db.commit()

    total_restantes = db.query(Vaga).count()

    return {
        "deletadas": len(ids_para_deletar),
        "mantidas": total_restantes,
        "titulos_afetados": len(titulos_duplicados)
    }

@router.post("/{vaga_id}/gerar-pitch")
def gerar_pitch(vaga_id: int, db: Session = Depends(get_db), _user: dict = Depends(get_current_user)):
    """Gera uma cold message contextualizada com a IA para a vaga."""
    from ..services.ai_extractor import AIExtractor
    from ..services.default_profile import WILLIAM_PROFILE

    vaga = crud.get_vaga(db, vaga_id)
    if not vaga:
        raise HTTPException(status_code=404, detail="Vaga não encontrada")

    extractor = AIExtractor()
    if not extractor.is_enabled():
        raise HTTPException(status_code=503, detail="Extrator local IA desabilitado. Cheque sua API KEY.")

    vaga_dict = {
        "titulo": vaga.titulo,
        "empresa": vaga.empresa,
        "missao_vaga": vaga.missao_vaga,
        "responsabilidades": vaga.responsabilidades or [],
        "requisitos_obrigatorios": vaga.requisitos_obrigatorios or [],
        "contato_nome": vaga.contato_nome,
    }

    perfil = {
        "nome": WILLIAM_PROFILE.get("nome", "William"),
        "cargo": "Product Designer",  # Defaulting main role
        "nivel": WILLIAM_PROFILE.get("nivel_minimo", "senior"),
        "skills": WILLIAM_PROFILE.get("skills", []),
        "experiencias": WILLIAM_PROFILE.get("experiencias", []),
        "experiencia_anos": WILLIAM_PROFILE.get("experiencia_anos", 18),
    }

    pitch = extractor.gerar_cold_message(vaga_dict, perfil)
    if not pitch:
        raise HTTPException(status_code=500, detail="A IA falhou em gerar o pitch.")

    return {"pitch": pitch}
