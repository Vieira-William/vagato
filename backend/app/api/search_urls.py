"""
API para gerenciamento de URLs de busca configuráveis.
Permite ao usuário customizar as fontes de busca de vagas.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import logging

from ..database import get_db
from .. import models, schemas

router = APIRouter(prefix="/search-urls", tags=["search-urls"])
logger = logging.getLogger(__name__)

# URLs padrão do sistema
DEFAULT_URLS = [
    {
        "nome": "LinkedIn Product Designer Remoto 24h",
        "url": "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=Product%20Designer&sortBy=R",
        "fonte": "linkedin_jobs",
        "ordem": 0
    },
    {
        "nome": "LinkedIn UX Designer Remoto 24h",
        "url": "https://www.linkedin.com/jobs/search/?f_TPR=r86400&f_WT=2&keywords=UX%20Designer&sortBy=R",
        "fonte": "linkedin_jobs",
        "ordem": 1
    },
    {
        "nome": "LinkedIn Posts UX Vaga 24h",
        "url": "https://www.linkedin.com/search/results/content/?keywords=ux%20vaga&datePosted=%22past-24h%22&sortBy=%22date_posted%22",
        "fonte": "linkedin_posts",
        "ordem": 0
    },
    {
        "nome": "Indeed UX Designer Brasil",
        "url": "https://br.indeed.com/jobs?q=ux+designer&l=Brasil&fromage=1&sort=date",
        "fonte": "indeed",
        "ordem": 0
    },
]


def ensure_default_urls(db: Session):
    """Garante que existam URLs padrão no banco."""
    count = db.query(models.SearchUrl).count()
    if count == 0:
        logger.info("Inserindo URLs padrão...")
        for url_data in DEFAULT_URLS:
            url = models.SearchUrl(**url_data, ativo=True)
            db.add(url)
        db.commit()
        logger.info(f"{len(DEFAULT_URLS)} URLs padrão inseridas")


@router.get("/", response_model=List[schemas.SearchUrlResponse])
def listar_urls(
    fonte: str = None,
    apenas_ativas: bool = False,
    db: Session = Depends(get_db)
):
    """
    Lista todas as URLs de busca configuradas.

    Args:
        fonte: Filtrar por fonte (linkedin_jobs, indeed, linkedin_posts)
        apenas_ativas: Se True, retorna apenas URLs ativas
    """
    ensure_default_urls(db)

    query = db.query(models.SearchUrl)

    if fonte:
        query = query.filter(models.SearchUrl.fonte == fonte)

    if apenas_ativas:
        query = query.filter(models.SearchUrl.ativo == True)

    urls = query.order_by(models.SearchUrl.fonte, models.SearchUrl.ordem).all()
    return urls


@router.get("/ativas/{fonte}")
def listar_urls_ativas_por_fonte(fonte: str, db: Session = Depends(get_db)):
    """
    Lista apenas as URLs ativas de uma fonte específica.
    Útil para os scrapers consultarem quais URLs usar.
    """
    ensure_default_urls(db)

    urls = db.query(models.SearchUrl).filter(
        models.SearchUrl.fonte == fonte,
        models.SearchUrl.ativo == True
    ).order_by(models.SearchUrl.ordem).all()

    return [{"id": u.id, "url": u.url, "nome": u.nome} for u in urls]


@router.post("/", response_model=schemas.SearchUrlResponse)
def criar_url(url: schemas.SearchUrlCreate, db: Session = Depends(get_db)):
    """
    Cria uma nova URL de busca.
    """
    # Verificar se URL já existe
    existente = db.query(models.SearchUrl).filter(
        models.SearchUrl.url == url.url
    ).first()

    if existente:
        raise HTTPException(
            status_code=400,
            detail="Esta URL já está cadastrada"
        )

    nova_url = models.SearchUrl(**url.model_dump())
    db.add(nova_url)
    db.commit()
    db.refresh(nova_url)

    logger.info(f"URL criada: {nova_url.nome}")
    return nova_url


@router.patch("/{url_id}", response_model=schemas.SearchUrlResponse)
def atualizar_url(
    url_id: int,
    url_update: schemas.SearchUrlUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza uma URL de busca existente.
    """
    url = db.query(models.SearchUrl).filter(models.SearchUrl.id == url_id).first()

    if not url:
        raise HTTPException(status_code=404, detail="URL não encontrada")

    update_data = url_update.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        if hasattr(url, field):
            setattr(url, field, value)

    db.commit()
    db.refresh(url)

    logger.info(f"URL atualizada: {url.nome}")
    return url


@router.delete("/{url_id}")
def deletar_url(url_id: int, db: Session = Depends(get_db)):
    """
    Deleta uma URL de busca.
    """
    url = db.query(models.SearchUrl).filter(models.SearchUrl.id == url_id).first()

    if not url:
        raise HTTPException(status_code=404, detail="URL não encontrada")

    nome = url.nome
    db.delete(url)
    db.commit()

    logger.info(f"URL deletada: {nome}")
    return {"message": f"URL '{nome}' deletada com sucesso"}


@router.post("/toggle/{url_id}")
def toggle_url(url_id: int, db: Session = Depends(get_db)):
    """
    Alterna o estado ativo/inativo de uma URL.
    """
    url = db.query(models.SearchUrl).filter(models.SearchUrl.id == url_id).first()

    if not url:
        raise HTTPException(status_code=404, detail="URL não encontrada")

    url.ativo = not url.ativo
    db.commit()
    db.refresh(url)

    status = "ativada" if url.ativo else "desativada"
    logger.info(f"URL {status}: {url.nome}")

    return {
        "message": f"URL '{url.nome}' {status}",
        "ativo": url.ativo
    }


@router.post("/restaurar-padroes")
def restaurar_urls_padrao(db: Session = Depends(get_db)):
    """
    Restaura as URLs padrão do sistema.
    Remove todas as URLs personalizadas e recria as padrão.
    """
    # Deleta todas as URLs
    db.query(models.SearchUrl).delete()
    db.commit()

    # Recria padrões
    for url_data in DEFAULT_URLS:
        url = models.SearchUrl(**url_data, ativo=True)
        db.add(url)

    db.commit()

    logger.info("URLs restauradas para padrão")
    return {
        "message": f"URLs restauradas. {len(DEFAULT_URLS)} URLs padrão inseridas.",
        "total": len(DEFAULT_URLS)
    }


@router.get("/fontes")
def listar_fontes():
    """
    Lista as fontes disponíveis para configuração.
    """
    return [
        {"id": "linkedin_jobs", "nome": "LinkedIn Jobs", "descricao": "Vagas de emprego do LinkedIn"},
        {"id": "linkedin_posts", "nome": "LinkedIn Posts", "descricao": "Posts orgânicos do LinkedIn"},
        {"id": "indeed", "nome": "Indeed", "descricao": "Vagas do Indeed Brasil"},
    ]
